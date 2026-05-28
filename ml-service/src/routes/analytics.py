"""
Analytics and trend analysis endpoints
"""

from fastapi import APIRouter, Query
from pydantic import BaseModel
from typing import List
from src.scoring import BurnoutScorer

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])

class TrendAnalysisResponse(BaseModel):
    trend: str
    change: float
    stats: dict
    days: int

class ForecastResponse(BaseModel):
    forecast: List[float]
    confidence: float
    days_ahead: int
    trend: str

@router.post("/trends")
async def analyze_trends(
    scores: List[float],
    days: int = Query(7, ge=1, le=30)
):
    """
    Analyze burnout score trends
    
    Args:
    - scores: List of burnout scores
    - days: Number of days for analysis
    
    Returns trend analysis with statistics
    """
    try:
        if not scores:
            raise ValueError("No scores provided")
        
        result = BurnoutScorer.calculate_trend(scores, days=days)
        return TrendAnalysisResponse(**result)
    except Exception as e:
        return {"error": str(e)}

@router.post("/forecast")
async def forecast_burnout(
    scores: List[float],
    days_ahead: int = Query(7, ge=1, le=30)
):
    """
    Forecast burnout score using linear regression
    
    Args:
    - scores: Historical burnout scores
    - days_ahead: Number of days to forecast
    
    Returns predicted scores and confidence
    """
    try:
        if len(scores) < 2:
            raise ValueError("Need at least 2 historical scores")
        
        result = BurnoutScorer.forecast_linear_regression(scores, days_ahead=days_ahead)
        return ForecastResponse(**result)
    except Exception as e:
        return {"error": str(e)}

@router.get("/algorithms")
async def get_algorithms():
    """Get information about algorithms used"""
    return {
        "algorithms": {
            "burnout_scoring": {
                "name": "5-Factor Weighted Burnout Model",
                "factors": {
                    "screen_time": {"weight": 0.30, "range": "0-100 based on 10h threshold"},
                    "break_frequency": {"weight": 0.25, "range": "0-100 based on 5 breaks goal"},
                    "sleep_quality": {"weight": 0.20, "range": "0-100 based on late-night use"},
                    "physical_activity": {"weight": 0.15, "range": "0-100 based on app switches"},
                    "engagement": {"weight": 0.10, "range": "0-100 focus metrics"}
                },
                "output": "0-100 score with risk level (low, medium, high, critical)"
            },
            "trend_analysis": {
                "name": "Statistical Trend Analysis",
                "metrics": ["mean", "median", "std_dev", "min", "max", "trend", "change"],
                "description": "Analyzes score progression over specified period"
            },
            "forecasting": {
                "name": "Linear Regression Forecasting",
                "metrics": ["forecast", "confidence (R²)", "trend"],
                "description": "Predicts future burnout scores based on historical data"
            }
        }
    }
