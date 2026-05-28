"""
Health check and status endpoints
"""

from fastapi import APIRouter
from datetime import datetime

router = APIRouter()

@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "ok",
        "service": "Burnout Detector ML Service",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat()
    }

@router.get("/status")
async def status():
    """Service status endpoint"""
    return {
        "status": "running",
        "timestamp": datetime.utcnow().isoformat()
    }
