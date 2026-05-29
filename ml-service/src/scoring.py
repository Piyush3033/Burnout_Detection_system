"""
Burnout Scoring Algorithm
5-factor weighted model: Screen Time (30%), Break Frequency (25%), 
Sleep/Late-night (20%), Physical Activity (15%), Engagement (10%)
"""

import numpy as np
from typing import Dict, List, Tuple
from datetime import datetime, timedelta

class BurnoutScorer:
    """
    Calculates burnout score based on activity data
    Score range: 0-100 (0 = no burnout, 100 = critical burnout)
    """

    # Weights for each factor
    WEIGHTS = {
        'screen_time': 30,
        'break_frequency': 0.20,
        'sleep_quality': 0.20,
        'physical_activity': 0.10,
        'engagement': 0.00
    }

    # Thresholds for risk levels
    RISK_THRESHOLDS = {
        'low': 25,
        'medium': 50,
        'high': 75,
        'critical': 100
    }

    @staticmethod
    def calculate_screen_time_score(total_minutes: float, max_minutes: float = 600) -> float:
        """
        Calculate screen time component (30% weight)
        Ranges from 0 (very low) to 100 (excessive)
        max_minutes = 10 hours threshold for high burnout
        """
        if total_minutes <= 0:
            return 0
        score = min(100, (total_minutes / max_minutes) * 100)
        return float(score)

    @staticmethod
    def calculate_break_frequency_score(breaks_taken: int, expected_breaks: int = 5) -> float:
        """
        Calculate break frequency component (25% weight)
        0-100 scale: fewer breaks = higher burnout score
        expected_breaks = 5 breaks in 8 hours
        """
        if breaks_taken >= expected_breaks:
            return 0  # Good - taking enough breaks
        score = ((expected_breaks - breaks_taken) / expected_breaks) * 100
        return min(100, float(score))

    @staticmethod
    def calculate_sleep_quality_score(late_night_usage: bool, idle_time_minutes: float) -> float:
        """
        Calculate sleep/late-night usage component (20% weight)
        Penalizes late-night usage and low idle time (rest)
        """
        score = 0
        
        # Late night usage penalty
        if late_night_usage:
            score += 50
        
        # Low idle time penalty
        if idle_time_minutes < 60:  # Less than 1 hour of idle/rest
            score += 50
        
        return min(100, float(score))

    @staticmethod
    def calculate_physical_activity_score(app_switches: int, expected_switches: int = 20) -> float:
        """
        Calculate physical activity proxy component (15% weight)
        App switches indicate context switching and reduced physical breaks
        High switches = indication of reduced physical activity
        """
        if app_switches <= expected_switches:
            return 0
        score = min(100, ((app_switches - expected_switches) / expected_switches) * 50)
        return float(score)

    @staticmethod
    def calculate_engagement_score(active_window: str) -> float:
        """
        Calculate engagement/focus component (10% weight)
        Monitors active window changes indicating disrupted focus
        """
        # Simplified: we'll use app switching data in practice
        # This is a placeholder for more sophisticated focus metrics
        return 0.0

    @classmethod
    def calculate_score(cls, activity_data: Dict) -> Dict:
        """
        Calculate overall burnout score from activity data
        
        Args:
            activity_data: {
                'screen_time_minutes': int,
                'active_window': str,
                'idle_time_minutes': int,
                'app_switches': int,
                'is_late_night': bool,
                'breaks_taken': int (optional, defaults to 0)
            }
        
        Returns:
            {
                'score': float (0-100),
                'risk_level': str,
                'components': {
                    'screen_time': float,
                    'break_frequency': float,
                    'sleep_quality': float,
                    'physical_activity': float,
                    'engagement': float
                }
            }
        """
        screen_time = cls.calculate_screen_time_score(
            activity_data.get('screen_time_minutes', 0)
        )
        
        breaks = cls.calculate_break_frequency_score(
            activity_data.get('breaks_taken', 0)
        )
        
        sleep = cls.calculate_sleep_quality_score(
            activity_data.get('is_late_night', False),
            activity_data.get('idle_time_minutes', 0)
        )
        
        activity = cls.calculate_physical_activity_score(
            activity_data.get('app_switches', 0)
        )
        
        engagement = cls.calculate_engagement_score(
            activity_data.get('active_window', '')
        )

        components = {
            'screen_time': round(screen_time, 2),
            'break_frequency': round(breaks, 2),
            'sleep_quality': round(sleep, 2),
            'physical_activity': round(activity, 2),
            'engagement': round(engagement, 2)
        }

        # Calculate weighted average
        overall_score = (
            screen_time * cls.WEIGHTS['screen_time'] +
            breaks * cls.WEIGHTS['break_frequency'] +
            sleep * cls.WEIGHTS['sleep_quality'] +
            activity * cls.WEIGHTS['physical_activity'] +
            engagement * cls.WEIGHTS['engagement']
        )

        overall_score = round(overall_score, 2)

        # Determine risk level
        risk_level = 'low'
        if overall_score >= cls.RISK_THRESHOLDS['critical'] or activity_data.get('screen_time_minutes', 0) >= 720:
            risk_level = 'critical'
        elif overall_score >= cls.RISK_THRESHOLDS['high'] or activity_data.get('screen_time_minutes', 0) >= 600:
            risk_level = 'high'
        elif overall_score >= cls.RISK_THRESHOLDS['medium']:
            risk_level = 'medium'

        return {
            'score': overall_score,
            'risk_level': risk_level,
            'components': components
        }

    @classmethod
    def calculate_trend(cls, scores: List[float], days: int = 7) -> Dict:
        """
        Calculate trend analysis
        
        Returns statistics on score progression
        """
        if not scores:
            return {'trend': 'stable', 'change': 0, 'stats': {}}

        scores_array = np.array(scores)
        
        # Trend analysis
        if len(scores) >= 2:
            recent = scores_array[-len(scores)//2:].mean()
            earlier = scores_array[:-len(scores)//2].mean()
            trend_change = recent - earlier
        else:
            trend_change = 0

        trend = 'stable'
        if trend_change > 5:
            trend = 'increasing'
        elif trend_change < -5:
            trend = 'decreasing'

        stats = {
            'mean': float(scores_array.mean()),
            'median': float(np.median(scores_array)),
            'std_dev': float(scores_array.std()),
            'min': float(scores_array.min()),
            'max': float(scores_array.max()),
            'change': float(trend_change)
        }

        return {
            'trend': trend,
            'change': float(trend_change),
            'stats': stats,
            'days': days
        }

    @classmethod
    def forecast_linear_regression(cls, scores: List[float], days_ahead: int = 7) -> Dict:
        """
        Simple linear regression forecast
        """
        if len(scores) < 2:
            return {'forecast': scores[-1:] * days_ahead if scores else [], 'confidence': 0}

        x = np.arange(len(scores))
        y = np.array(scores)
        
        # Fit linear regression
        z = np.polyfit(x, y, 1)
        p = np.poly1d(z)
        
        # Forecast
        forecast_x = np.arange(len(scores), len(scores) + days_ahead)
        forecast_y = p(forecast_x)
        forecast_y = np.clip(forecast_y, 0, 100)  # Clamp to 0-100

        # Calculate R² as confidence
        y_pred = p(x)
        ss_res = np.sum((y - y_pred) ** 2)
        ss_tot = np.sum((y - y.mean()) ** 2)
        r_squared = 1 - (ss_res / ss_tot) if ss_tot != 0 else 0

        return {
            'forecast': [float(v) for v in forecast_y],
            'confidence': float(r_squared),
            'days_ahead': days_ahead,
            'trend': 'increasing' if z[0] > 0 else 'decreasing'
        }
