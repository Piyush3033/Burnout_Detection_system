"""
MongoDB connection and management
"""

from motor.motor_asyncio import AsyncClient, AsyncDatabase
import os
import logging

logger = logging.getLogger(__name__)

_db: AsyncDatabase = None

async def connect_db():
    """Connect to MongoDB"""
    global _db
    try:
        client = AsyncClient(os.getenv('MONGODB_URI'))
        _db = client.burnout_detector
        # Verify connection
        await _db.command('ping')
        logger.info("✅ Connected to MongoDB")
    except Exception as e:
        logger.error(f"❌ MongoDB connection failed: {e}")
        raise

async def disconnect_db():
    """Disconnect from MongoDB"""
    global _db
    if _db:
        _db.client.close()
        logger.info("✅ Disconnected from MongoDB")

def get_db() -> AsyncDatabase:
    """Get database instance"""
    if _db is None:
        raise RuntimeError("Database not initialized. Call connect_db() first.")
    return _db
