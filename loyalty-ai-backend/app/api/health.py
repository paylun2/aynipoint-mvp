from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.core.database import get_db

router = APIRouter()

@router.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    db_status = False
    try:
        # Ping the database to ensure connection is alive
        result = await db.execute(text("SELECT 1"))
        if result.scalar() == 1:
            db_status = True
    except Exception as e:
        print(f"Database connection error: {e}")
        
    return {
        "status": "healthy" if db_status else "degraded",
        "service": "ayniwin-ai-engine",
        "database_connected": db_status
    }
