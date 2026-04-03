from typing import AsyncGenerator, Optional
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
from app.core.config import settings

# Create the async engine
# Note: Supabase pooler runs on port 6543 for transaction mode
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,  # Set to True for SQL query logging in development
    future=True,
    pool_pre_ping=True,
    # Supabase pooler requires specific settings for asyncpg to work flawlessly
    connect_args={"server_settings": {"search_path": "public, ai_access"}},
)

# Create an async session maker
AsyncSessionLocal = sessionmaker(
    bind=engine, 
    class_=AsyncSession, 
    expire_on_commit=False
)

# Dependency to get a raw DB session (Service Role level / Unauthenticated)
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

async def set_rls_context(session: AsyncSession, user_id: Optional[str] = None, org_id: Optional[str] = None):
    """
    Injects the FastAPI session context into PostgreSQL for Row Level Security (RLS).
    Uses set_config(..., true) so the variables are only alive during the current transaction.
    """
    if user_id:
        await session.execute(text("SELECT set_config('app.current_user_id', :val, true)"), {"val": str(user_id)})
    if org_id:
        await session.execute(text("SELECT set_config('app.current_org_id', :val, true)"), {"val": str(org_id)})
