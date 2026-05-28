"""
Burnout Detector Desktop Agent
Real-time OS-level data collection and monitoring
"""

import logging
import os
import sys
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv
from apscheduler.schedulers.background import BackgroundScheduler

from src.collector import DataCollector
from src.uploader import DataUploader
from src.system_monitor import SystemMonitor

# Load environment variables
load_dotenv()

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(Path.home() / '.burnout-agent' / 'agent.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)


class BurnoutAgent:
    """Main agent that orchestrates data collection and uploads"""
    
    def __init__(self):
        self.api_url = os.getenv('API_URL', 'http://localhost:5000')
        self.user_token = os.getenv('USER_TOKEN')
        self.collection_interval_seconds = int(os.getenv('COLLECTION_INTERVAL_SECONDS', 5))
        
        self.collector = DataCollector()
        self.uploader = DataUploader(self.api_url, self.user_token)
        self.monitor = SystemMonitor()
        
        self.scheduler = BackgroundScheduler()
        logger.info(f'Burnout Agent initialized (interval: {self.collection_interval_seconds}s)')
    
    def collect_and_upload(self):
        """Collect data and upload to server"""
        try:
            logger.info('Starting data collection cycle')
            
            activity_data = self.collector.collect_activity()
            system_data = self.monitor.get_system_health()
            system_data['cpu_uptime_seconds'] = self.collector.get_cpu_uptime()
            
            if 'screen_time_minutes' not in activity_data:
                idle_seconds = activity_data.get('idle_time_seconds', 0)
                active_minutes = max(0, round(max(0, self.collection_interval_seconds - idle_seconds) / 60, 2))
                activity_data['screen_time_minutes'] = active_minutes

            if 'is_late_night' not in activity_data:
                current_hour = datetime.utcnow().hour
                activity_data['is_late_night'] = current_hour >= 22 or current_hour < 6

            if 'break_taken' not in activity_data:
                activity_data['break_taken'] = activity_data.get('idle_time_seconds', 0) >= 300

            payload = {
                'activity': activity_data,
                'system': system_data,
                'timestamp': self._get_timestamp(),
            }
            
            success = self.uploader.upload(payload)
            if success:
                logger.info('Data uploaded successfully')
            else:
                logger.warning('Failed to upload data')
                
        except Exception as e:
            logger.error(f'Error during collection cycle: {str(e)}')
    
    def start(self):
        """Start the agent"""
        try:
            # Schedule collection task
            self.scheduler.add_job(
                self.collect_and_upload,
                'interval',
                seconds=self.collection_interval_seconds,
                id='collect_task'
            )
            
            self.scheduler.start()
            logger.info('Agent started successfully')
            
            # Keep the agent running
            while True:
                import time
                time.sleep(1)
                
        except KeyboardInterrupt:
            logger.info('Agent stopped by user')
            self.stop()
        except Exception as e:
            logger.error(f'Agent error: {str(e)}')
            self.stop()
    
    def stop(self):
        """Stop the agent gracefully"""
        if self.scheduler.running:
            self.scheduler.shutdown()
        logger.info('Agent stopped')
        sys.exit(0)
    
    @staticmethod
    def _get_timestamp():
        """Get current timestamp in ISO format"""
        from datetime import datetime
        return datetime.utcnow().isoformat() + 'Z'


def run():
    """Entry point for the agent"""
    agent = BurnoutAgent()
    agent.start()


if __name__ == '__main__':
    run()
