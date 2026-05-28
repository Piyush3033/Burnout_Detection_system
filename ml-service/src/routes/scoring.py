"""
Burnout scoring endpoints
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from src.scoring import BurnoutScorer
from src.advanced_ml import QLearningAgent, ReportGenerator

router = APIRouter(prefix="/api/scoring", tags=["Scoring"])

_rl_agent = QLearningAgent(learning_rate=0.15, epsilon=0.05)

class ActivityData(BaseModel):
    screen_time_minutes: float
    active_window: str
    idle_time_minutes: float
    app_switches: int
    is_late_night: bool
    breaks_taken: Optional[int] = 0

class ScoringResponse(BaseModel):
    score: float
    risk_level: str
    components: dict
    recommendation: Optional[str] = None
    rl_action: Optional[str] = None

@router.post("/calculate", response_model=ScoringResponse)
async def calculate_burnout_score(data: ActivityData):
    """
    Calculate burnout score from activity data
    
    Returns:
    - score: 0-100 burnout severity
    - risk_level: low, medium, high, or critical
    - components: breakdown of each factor
    """
    try:
        activity_dict = data.model_dump()
        result = BurnoutScorer.calculate_score(activity_dict)
        return ScoringResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class RealtimeScoringRequest(BaseModel):
    screen_time_minutes: float
    active_window: str = ""
    idle_time_minutes: float = 0
    app_switches: int = 0
    is_late_night: bool = False
    breaks_taken: int = 0
    previous_score: float = 0
    platform: str = "desktop"


@router.post("/realtime", response_model=ScoringResponse)
async def calculate_realtime_score(data: RealtimeScoringRequest):
    """
    Per-second friendly scoring with Q-learning intervention selection.
    Blends base burnout score with short-term momentum from previous_score.
    """
    try:
        base = BurnoutScorer.calculate_score(data.model_dump())
        hour = datetime.utcnow().hour
        time_of_day = "night" if hour >= 22 or hour < 6 else "day"
        state = _rl_agent.get_state(base["score"], time_of_day, 1)
        action = _rl_agent.choose_action(base["score"])

        momentum = (base["score"] - data.previous_score) * 0.35
        adjusted = max(0, min(100, round(base["score"] + momentum, 2)))

        risk_level = "low"
        if adjusted >= 75:
            risk_level = "critical"
        elif adjusted >= 50:
            risk_level = "high"
        elif adjusted >= 25:
            risk_level = "medium"

        action_labels = {
            "take_break": "Take a 5-minute break away from your screen",
            "reduce_screen_time": "Close non-essential apps for 10 minutes",
            "exercise": "Do light stretching or a short walk",
            "meditate": "Try 3 minutes of deep breathing",
            "social_connection": "Reach out to someone for a quick chat",
            "seek_help": "Consider talking to a manager or counselor",
            "rest_day": "Plan lighter work or rest for the remainder of today",
        }

        return {
            "score": adjusted,
            "risk_level": risk_level,
            "components": base["components"],
            "recommendation": action_labels.get(action, "Take a short rest break"),
            "rl_action": action,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/recommendations")
async def get_personalized_recommendations(data: RealtimeScoringRequest):
    """Generate personalized recommendations from activity + score."""
    try:
        base = BurnoutScorer.calculate_score(data.model_dump())
        activities = {
            "screen_time_hours": data.screen_time_minutes / 60,
            "breaks_taken": data.breaks_taken,
            "late_night_usage": data.is_late_night,
            "physical_activity_minutes": max(0, 30 - data.idle_time_minutes),
        }
        report = ReportGenerator.generate_weekly_report(
            "user",
            [data.previous_score, base["score"]],
            activities,
        )
        return report
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/risk-levels")
async def get_risk_levels():
    """Get burnout risk level thresholds"""
    return {
        "thresholds": BurnoutScorer.RISK_THRESHOLDS,
        "weights": BurnoutScorer.WEIGHTS,
        "description": {
            "low": "0-25: Healthy burnout level",
            "medium": "25-50: Moderate burnout risk",
            "high": "50-75: High burnout risk - intervention recommended",
            "critical": "75-100: Critical burnout state - immediate attention needed"
        }
    }
