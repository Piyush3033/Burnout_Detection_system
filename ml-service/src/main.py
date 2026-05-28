"""
FastAPI ML Service for Digital Burnout Detector
Handles burnout scoring, analytics, and background jobs
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
from dotenv import load_dotenv
import os

from src.database import connect_db, disconnect_db
from src.scheduler import init_scheduler, shutdown_scheduler
from src.routes import scoring, analytics, health

load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Lifespan context manager
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("🚀 Starting ML Service...")
    await connect_db()
    init_scheduler()
    logger.info("✅ ML Service started")
    yield
    # Shutdown
    logger.info("🛑 Shutting down ML Service...")
    await disconnect_db()
    shutdown_scheduler()
    logger.info("✅ ML Service shutdown complete")

# Create FastAPI app
app = FastAPI(
    title="Burnout Detector ML Service",
    description="ML analytics engine for digital burnout detection",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routes
app.include_router(health.router)
app.include_router(scoring.router)
app.include_router(analytics.router)

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
