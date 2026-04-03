import uuid
from typing import Optional, Dict, Any
from sqlalchemy import String, Text, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID, JSONB
from pgvector.sqlalchemy import Vector
from datetime import datetime
from app.models.base import Base

class AIKnowledgeBase(Base):
    __tablename__ = "ai_knowledge_base"
    __table_args__ = {"schema": "ai_access"}  # Note: The new script places this in public schema in table definition but describes it as ai_access logically, wait, script.sql line 733 says `__table_args__ = {"schema": "public"}` actually. Looking at script: `CREATE TABLE public.ai_knowledge_base`.

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("public.organizations.id", ondelete="CASCADE"), nullable=True)
    
    content: Mapped[str] = mapped_column(Text, nullable=False)
    # 1536 is the dimension size for OpenAI's text-embedding-3-small
    embedding = mapped_column(Vector(1536))
    
    metadata_col: Mapped[Optional[Dict[str, Any]]] = mapped_column("metadata", JSONB, default=dict)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

class AIDailyMetrics(Base):
    """
    This is an ORM representation of the secure View 'ai_access.daily_metrics'.
    We can read from it like a table, but cannot write to it.
    """
    __tablename__ = "daily_metrics"
    __table_args__ = {"schema": "ai_access"}
    
    org_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    day = mapped_column(DateTime(timezone=False), primary_key=True)
    total_transactions: Mapped[int] = mapped_column()
    points_issued: Mapped[int] = mapped_column()
    points_redeemed: Mapped[int] = mapped_column()
