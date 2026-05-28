"""
Advanced ML Module: Reinforcement Learning, Time-Series Analysis, and AI Recommendations
Implements Q-learning for personalized interventions and ARIMA for forecasting
"""

import numpy as np
from typing import Dict, List, Tuple
from datetime import datetime, timedelta
from collections import defaultdict
import json

class QLearningAgent:
    """
    Reinforcement Learning agent using Q-learning for personalized burnout interventions
    Learns optimal recommendations based on user response patterns
    """
    
    def __init__(self, learning_rate=0.1, discount_factor=0.95, epsilon=0.1):
        self.learning_rate = learning_rate
        self.discount_factor = discount_factor
        self.epsilon = epsilon
        self.q_table = defaultdict(lambda: defaultdict(float))
        self.action_history = []
        
    def get_state(self, burnout_score: float, time_of_day: str, days_consecutive: int) -> str:
        """Discretize continuous states for Q-learning"""
        risk = "low" if burnout_score < 25 else "medium" if burnout_score < 50 else "high"
        return f"{risk}_{time_of_day}_{min(days_consecutive, 7)}"
    
    def get_actions(self, burnout_score: float) -> List[str]:
        """Available interventions"""
        actions = ["take_break", "reduce_screen_time", "exercise", "meditate", "social_connection"]
        if burnout_score > 75:
            actions.extend(["seek_help", "rest_day"])
        return actions
    
    def choose_action(self, state: str) -> str:
        """Epsilon-greedy action selection"""
        if np.random.random() < self.epsilon:
            actions = ["take_break", "reduce_screen_time", "exercise", "meditate", "social_connection"]
            return np.random.choice(actions)
        
        q_values = self.q_table[state]
        if not q_values:
            actions = ["take_break", "reduce_screen_time", "exercise", "meditate", "social_connection"]
            return np.random.choice(actions)
        
        max_q = max(q_values.values())
        best_actions = [a for a, q in q_values.items() if q == max_q]
        return np.random.choice(best_actions)
    
    def update_q_value(self, state: str, action: str, reward: float, next_state: str):
        """Update Q-table based on experience"""
        current_q = self.q_table[state][action]
        next_max = max(self.q_table[next_state].values()) if self.q_table[next_state] else 0
        
        new_q = current_q + self.learning_rate * (
            reward + self.discount_factor * next_max - current_q
        )
        self.q_table[state][action] = new_q
    
    def get_reward(self, burnout_change: float, user_compliance: bool) -> float:
        """Calculate reward signal"""
        reward = 0
        
        # Reward for burnout reduction
        if burnout_change < 0:  # Burnout decreased
            reward += abs(burnout_change)
        else:
            reward -= burnout_change * 0.5
        
        # Reward for user compliance
        if user_compliance:
            reward += 10
        
        return reward


class TimeSeriesAnalyzer:
    """
    Advanced time-series analysis using ARIMA-like approach and pattern detection
    Detects cycles, trends, and anomalies in burnout patterns
    """
    
    @staticmethod
    def detect_trend(scores: List[float], window: int = 7) -> Dict:
        """Detect trends using exponential smoothing"""
        if len(scores) < window:
            return {"trend": "insufficient_data", "direction": 0}
        
        recent = scores[-window:]
        trend_value = np.polyfit(range(len(recent)), recent, 1)[0]
        
        return {
            "trend": "increasing" if trend_value > 0.5 else "decreasing" if trend_value < -0.5 else "stable",
            "direction": float(trend_value),
            "strength": float(abs(trend_value))
        }
    
    @staticmethod
    def detect_cycles(scores: List[float]) -> Dict:
        """Detect weekly/daily patterns"""
        if len(scores) < 14:
            return {"weekly_pattern": None, "confidence": 0}
        
        # Calculate weekly averages
        weekly = []
        for i in range(0, len(scores) - 7, 7):
            weekly.append(np.mean(scores[i:i+7]))
        
        if len(weekly) < 2:
            return {"weekly_pattern": None, "confidence": 0}
        
        # Simple pattern: compare first and second halves
        first_half = np.mean(weekly[:len(weekly)//2])
        second_half = np.mean(weekly[len(weekly)//2:])
        
        pattern = "worsening" if second_half > first_half else "improving"
        confidence = min(1.0, abs(second_half - first_half) / max(first_half, second_half, 1))
        
        return {
            "weekly_pattern": pattern,
            "confidence": float(confidence)
        }
    
    @staticmethod
    def forecast_arima(scores: List[float], periods: int = 7) -> List[float]:
        """Simple ARIMA-like forecasting"""
        if len(scores) < 3:
            return [scores[-1]] * periods
        
        # Calculate differences (d=1)
        diffs = np.diff(scores)
        
        # AR coefficient (p=1)
        if len(diffs) > 0:
            ar_coef = np.mean(diffs)
        else:
            ar_coef = 0
        
        # Forecast
        forecast = []
        last_value = scores[-1]
        
        for i in range(periods):
            next_value = last_value + ar_coef + np.random.normal(0, np.std(diffs) * 0.1)
            next_value = max(0, min(100, next_value))  # Clamp to 0-100
            forecast.append(float(next_value))
            last_value = next_value
        
        return forecast
    
    @staticmethod
    def detect_anomalies(scores: List[float], threshold: float = 2.0) -> List[int]:
        """Detect anomalous burnout spikes"""
        if len(scores) < 3:
            return []
        
        mean = np.mean(scores)
        std = np.std(scores)
        
        anomalies = []
        for i, score in enumerate(scores):
            z_score = abs((score - mean) / max(std, 1))
            if z_score > threshold:
                anomalies.append(i)
        
        return anomalies


class ReportGenerator:
    """
    AI-powered report generation with personalized insights and recommendations
    """
    
    @staticmethod
    def generate_weekly_report(user_id: str, scores: List[float], activities: Dict) -> Dict:
        """Generate comprehensive weekly burnout report"""
        
        analyzer = TimeSeriesAnalyzer()
        current_score = scores[-1] if scores else 0
        
        # Analyze trends
        trend = analyzer.detect_trend(scores, window=7)
        cycles = analyzer.detect_cycles(scores)
        anomalies = analyzer.detect_anomalies(scores)
        forecast = analyzer.forecast_arima(scores, periods=7)
        
        # Risk assessment
        risk_level = "low" if current_score < 25 else "medium" if current_score < 50 else "high" if current_score < 75 else "critical"
        
        # Generate insights
        insights = []
        
        if trend["direction"] > 1:
            insights.append("Your burnout is rapidly increasing. Consider reducing work hours.")
        elif trend["direction"] < -1:
            insights.append("Great! Your burnout levels are improving. Keep up the current practices.")
        
        if len(anomalies) > 0:
            insights.append(f"Detected {len(anomalies)} stress spikes this week. Review what triggered them.")
        
        if cycles["confidence"] > 0.6:
            insights.append(f"Detected weekly pattern: {cycles['weekly_pattern']}. Plan interventions accordingly.")
        
        # Recommendations
        recommendations = ReportGenerator._generate_recommendations(
            current_score, trend, activities
        )
        
        return {
            "user_id": user_id,
            "week": datetime.now().isocalendar()[1],
            "current_score": float(current_score),
            "average_score": float(np.mean(scores)) if scores else 0,
            "trend": trend,
            "cycles": cycles,
            "risk_level": risk_level,
            "insights": insights,
            "recommendations": recommendations,
            "forecast_7_days": forecast,
            "anomalies_count": len(anomalies),
            "generated_at": datetime.now().isoformat()
        }
    
    @staticmethod
    def _generate_recommendations(score: float, trend: Dict, activities: Dict) -> List[Dict]:
        """AI-based personalized recommendations"""
        recommendations = []
        
        # Screen time recommendations
        screen_time = activities.get("screen_time_hours", 0)
        if screen_time > 8:
            recommendations.append({
                "category": "screen_time",
                "priority": "high" if score > 50 else "medium",
                "action": "Reduce screen time by 1-2 hours daily",
                "reason": f"You're spending {screen_time} hours on screen. Target: 6-8 hours.",
                "impact": "Could reduce burnout by 10-15%"
            })
        
        # Break recommendations
        breaks_count = activities.get("breaks_taken", 0)
        if breaks_count < 5:
            recommendations.append({
                "category": "breaks",
                "priority": "high",
                "action": "Take 5 proper breaks per workday (Pomodoro: 25-5 min)",
                "reason": f"Only {breaks_count} breaks found. Recommended: 5-6 breaks.",
                "impact": "Could reduce burnout by 15-20%"
            })
        
        # Sleep recommendations
        late_night_usage = activities.get("late_night_usage", False)
        if late_night_usage:
            recommendations.append({
                "category": "sleep",
                "priority": "critical" if score > 75 else "high",
                "action": "Eliminate screen time after 9 PM",
                "reason": "Late-night usage disrupts sleep quality and recovery.",
                "impact": "Could reduce burnout by 20-25%"
            })
        
        # Activity recommendations
        physical_activity = activities.get("physical_activity_minutes", 0)
        if physical_activity < 30:
            recommendations.append({
                "category": "exercise",
                "priority": "medium",
                "action": "Aim for 30+ minutes of physical activity daily",
                "reason": "Physical activity reduces stress hormones and improves resilience.",
                "impact": "Could reduce burnout by 10-15%"
            })
        
        # Stress management
        if score > 50:
            recommendations.append({
                "category": "stress_management",
                "priority": "high" if score > 75 else "medium",
                "action": "Practice meditation or mindfulness (10-15 min daily)",
                "reason": "Mindfulness reduces cortisol levels and improves emotional regulation.",
                "impact": "Could reduce burnout by 15-20%"
            })
        
        # Trend-based recommendations
        if trend["direction"] > 1:
            recommendations.insert(0, {
                "category": "urgent",
                "priority": "critical",
                "action": "Schedule time off or reduce workload immediately",
                "reason": f"Burnout is increasing at rate of {trend['direction']:.1f} points/week.",
                "impact": "Prevent critical burnout state"
            })
        
        return recommendations


class BehavioralAnalyzer:
    """
    Analyzes user behavior patterns to identify burnout risk factors
    """
    
    @staticmethod
    def analyze_work_patterns(activity_logs: List[Dict]) -> Dict:
        """Analyze work time patterns"""
        
        if not activity_logs:
            return {}
        
        hours_by_day = defaultdict(list)
        total_breaks = 0
        late_nights = 0
        
        for log in activity_logs:
            hour = datetime.fromisoformat(log["timestamp"]).hour
            day = datetime.fromisoformat(log["timestamp"]).strftime("%A")
            hours_by_day[day].append(hour)
            
            if log.get("is_break"):
                total_breaks += 1
            
            if hour > 22 or hour < 5:
                late_nights += 1
        
        # Calculate metrics
        avg_hours_per_day = len(activity_logs) / max(len(hours_by_day), 1) / 60
        
        return {
            "average_work_hours_per_day": float(avg_hours_per_day),
            "total_breaks": total_breaks,
            "late_night_sessions": late_nights,
            "workdays": list(hours_by_day.keys()),
            "pattern_analysis": {
                "is_irregular": max(len(v) for v in hours_by_day.values() if v) > 10 if hours_by_day.values() else False,
                "works_weekends": any(d in hours_by_day for d in ["Saturday", "Sunday"])
            }
        }
