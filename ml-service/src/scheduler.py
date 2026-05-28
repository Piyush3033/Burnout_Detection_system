"""
APScheduler configuration and background job definitions
5 Jobs: Daily Summary, Burnout Score, Batch Processing, Forecast, Alert Generation
"""

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
import logging
import os
from datetime import datetime, timedelta
from src.database import get_db
from src.scoring import BurnoutScorer
import pytz

logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler()

async def job_daily_summary():
    """Job 1: Calculate daily summaries for all users"""
    try:
        logger.info("▶️  Running: Daily Summary Job")
        db = get_db()
        
        # Get all users
        users = await db.users.find({'status': 'active'}).to_list(None)
        processed = 0
        
        for user in users:
            user_id = user['_id']
            
            # Get today's activity logs
            today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
            today_end = today_start + timedelta(days=1)
            
            logs = await db.activity_logs.find({
                'user_id': user_id,
                'timestamp': {'$gte': today_start, '$lt': today_end}
            }).to_list(None)
            
            if logs:
                processed += 1
        
        await db.job_logs.insert_one({
            'job_name': 'daily_summary',
            'executed_at': datetime.utcnow(),
            'status': 'success',
            'processed_count': processed
        })
        logger.info(f"✅ Daily Summary Job Complete: {processed} users processed")
    except Exception as e:
        logger.error(f"❌ Daily Summary Job Error: {e}")
        db = get_db()
        await db.job_logs.insert_one({
            'job_name': 'daily_summary',
            'executed_at': datetime.utcnow(),
            'status': 'failed',
            'error_message': str(e)
        })

async def job_burnout_score():
    """Job 2: Calculate burnout scores for all users"""
    try:
        logger.info("▶️  Running: Burnout Score Job")
        db = get_db()
        
        users = await db.users.find({'status': 'active'}).to_list(None)
        processed = 0
        
        for user in users:
            user_id = user['_id']
            
            # Get last 24 hours of activity
            last_24h = datetime.utcnow() - timedelta(hours=24)
            logs = await db.activity_logs.find({
                'user_id': user_id,
                'timestamp': {'$gte': last_24h}
            }).to_list(None)
            
            if logs:
                # Aggregate activity data
                total_screen_time = sum(log['data'].get('screen_time_minutes', 0) for log in logs)
                total_idle = sum(log['data'].get('idle_time_minutes', 0) for log in logs)
                total_switches = sum(log['data'].get('app_switches', 0) for log in logs)
                breaks_taken = sum(1 for log in logs if log['data'].get('break_taken', False))
                late_night = any(log['data'].get('is_late_night', False) for log in logs)
                
                activity_data = {
                    'screen_time_minutes': total_screen_time,
                    'idle_time_minutes': total_idle,
                    'app_switches': total_switches,
                    'breaks_taken': breaks_taken,
                    'is_late_night': late_night,
                    'active_window': logs[-1]['data'].get('active_window', '')
                }
                
                # Calculate score
                result = BurnoutScorer.calculate_score(activity_data)
                
                # Save to database
                await db.burnout_scores.insert_one({
                    'user_id': user_id,
                    'timestamp': datetime.utcnow(),
                    'score': result['score'],
                    'risk_level': result['risk_level'],
                    'components': result['components']
                })
                
                processed += 1
        
        await db.job_logs.insert_one({
            'job_name': 'burnout_score',
            'executed_at': datetime.utcnow(),
            'status': 'success',
            'processed_count': processed
        })
        logger.info(f"✅ Burnout Score Job Complete: {processed} scores calculated")
    except Exception as e:
        logger.error(f"❌ Burnout Score Job Error: {e}")
        db = get_db()
        await db.job_logs.insert_one({
            'job_name': 'burnout_score',
            'executed_at': datetime.utcnow(),
            'status': 'failed',
            'error_message': str(e)
        })

async def job_forecast():
    """Job 3: Linear regression forecasting for all users"""
    try:
        logger.info("▶️  Running: Forecast Job")
        db = get_db()
        
        users = await db.users.find({'status': 'active'}).to_list(None)
        processed = 0
        
        for user in users:
            user_id = user['_id']
            
            # Get last 7 days of scores
            last_7d = datetime.utcnow() - timedelta(days=7)
            scores = await db.burnout_scores.find({
                'user_id': user_id,
                'timestamp': {'$gte': last_7d}
            }).sort('timestamp', 1).to_list(None)
            
            if len(scores) >= 2:
                score_values = [s['score'] for s in scores]
                forecast = BurnoutScorer.forecast_linear_regression(score_values, days_ahead=7)
                
                await db.analytics_results.insert_one({
                    'user_id': user_id,
                    'timestamp': datetime.utcnow(),
                    'type': 'forecast',
                    'data': forecast
                })
                processed += 1
        
        await db.job_logs.insert_one({
            'job_name': 'forecast',
            'executed_at': datetime.utcnow(),
            'status': 'success',
            'processed_count': processed
        })
        logger.info(f"✅ Forecast Job Complete: {processed} forecasts generated")
    except Exception as e:
        logger.error(f"❌ Forecast Job Error: {e}")
        db = get_db()
        await db.job_logs.insert_one({
            'job_name': 'forecast',
            'executed_at': datetime.utcnow(),
            'status': 'failed',
            'error_message': str(e)
        })

async def job_alert_generation():
    """Job 4: Generate alerts for high-risk users"""
    try:
        logger.info("▶️  Running: Alert Generation Job")
        db = get_db()
        
        # Find critical and high risk users from last hour
        last_hour = datetime.utcnow() - timedelta(hours=1)
        high_risk_scores = await db.burnout_scores.find({
            'timestamp': {'$gte': last_hour},
            'risk_level': {'$in': ['high', 'critical']}
        }).to_list(None)
        
        processed = 0
        for score in high_risk_scores:
            # Check if alert already exists for this user today
            today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
            existing = await db.alerts.find_one({
                'user_id': score['user_id'],
                'timestamp': {'$gte': today}
            })
            
            if not existing:
                severity = 'critical' if score['risk_level'] == 'critical' else 'warning'
                await db.alerts.insert_one({
                    'user_id': score['user_id'],
                    'timestamp': datetime.utcnow(),
                    'type': 'high_burnout',
                    'severity': severity,
                    'message': f"High burnout detected: {score['score']:.1f}",
                    'data': {'score': score['score'], 'components': score['components']},
                    'is_read': False
                })
                processed += 1
        
        await db.job_logs.insert_one({
            'job_name': 'alert_generation',
            'executed_at': datetime.utcnow(),
            'status': 'success',
            'processed_count': processed
        })
        logger.info(f"✅ Alert Generation Job Complete: {processed} alerts created")
    except Exception as e:
        logger.error(f"❌ Alert Generation Job Error: {e}")
        db = get_db()
        await db.job_logs.insert_one({
            'job_name': 'alert_generation',
            'executed_at': datetime.utcnow(),
            'status': 'failed',
            'error_message': str(e)
        })

async def job_batch_processing():
    """Job 5: Batch processing and data cleanup"""
    try:
        logger.info("▶️  Running: Batch Processing Job")
        db = get_db()
        
        # Example: Calculate weekly trends
        users = await db.users.find({'status': 'active'}).to_list(None)
        processed = 0
        
        for user in users:
            user_id = user['_id']
            
            # Get 30-day scores
            last_30d = datetime.utcnow() - timedelta(days=30)
            scores = await db.burnout_scores.find({
                'user_id': user_id,
                'timestamp': {'$gte': last_30d}
            }).sort('timestamp', 1).to_list(None)
            
            if scores:
                score_values = [s['score'] for s in scores]
                trend = BurnoutScorer.calculate_trend(score_values, days=30)
                
                await db.analytics_results.insert_one({
                    'user_id': user_id,
                    'timestamp': datetime.utcnow(),
                    'type': '30day_trend',
                    'data': trend
                })
                processed += 1
        
        await db.job_logs.insert_one({
            'job_name': 'batch_processing',
            'executed_at': datetime.utcnow(),
            'status': 'success',
            'processed_count': processed
        })
        logger.info(f"✅ Batch Processing Job Complete: {processed} batches processed")
    except Exception as e:
        logger.error(f"❌ Batch Processing Job Error: {e}")
        db = get_db()
        await db.job_logs.insert_one({
            'job_name': 'batch_processing',
            'executed_at': datetime.utcnow(),
            'status': 'failed',
            'error_message': str(e)
        })

def init_scheduler():
    """Initialize APScheduler with background jobs"""
    if scheduler.running:
        return
    
    tz = pytz.timezone(os.getenv('TIMEZONE', 'UTC'))
    
    # Job 1: Daily Summary - 2 AM UTC
    scheduler.add_job(
        job_daily_summary,
        trigger=CronTrigger(hour=2, minute=0, tz=tz),
        id='job_daily_summary',
        name='Daily Summary'
    )
    
    # Job 2: Burnout Score - Every 4 hours
    scheduler.add_job(
        job_burnout_score,
        trigger=CronTrigger(hour='*/4', tz=tz),
        id='job_burnout_score',
        name='Burnout Score'
    )
    
    # Job 3: Forecast - Every 6 hours
    scheduler.add_job(
        job_forecast,
        trigger=CronTrigger(hour='*/6', tz=tz),
        id='job_forecast',
        name='Forecast'
    )
    
    # Job 4: Alert Generation - Every hour
    scheduler.add_job(
        job_alert_generation,
        trigger=CronTrigger(minute=0, tz=tz),
        id='job_alert_generation',
        name='Alert Generation'
    )
    
    # Job 5: Batch Processing - Daily at 3 AM UTC
    scheduler.add_job(
        job_batch_processing,
        trigger=CronTrigger(hour=3, minute=0, tz=tz),
        id='job_batch_processing',
        name='Batch Processing'
    )
    
    scheduler.start()
    logger.info("✅ Scheduler initialized with 5 background jobs")

def shutdown_scheduler():
    """Shutdown APScheduler"""
    if scheduler.running:
        scheduler.shutdown()
        logger.info("✅ Scheduler shutdown")
