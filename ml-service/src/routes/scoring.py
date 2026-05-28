"""
Burnout scoring endpoints
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from src.scoring import BurnoutScorer

router = APIRouter(prefix="/api/scoring", tags=["Scoring"])

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
