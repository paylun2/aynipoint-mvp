import uuid
from typing import Optional
from sqlalchemy import String, Boolean, DateTime, Float, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from datetime import datetime
from app.models.base import Base

class User(Base):
    __tablename__ = "users"
    __table_args__ = {"schema": "public"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    phone: Mapped[Optional[str]] = mapped_column(String(20), unique=True)
    email: Mapped[Optional[str]] = mapped_column(String(255))
    full_name: Mapped[Optional[str]] = mapped_column(String(150))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_registered: Mapped[bool] = mapped_column(Boolean, default=False)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    # Relationships
    memberships = relationship("OrganizationMember", back_populates="user")

class Organization(Base):
    __tablename__ = "organizations"
    __table_args__ = {"schema": "public"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    legal_name: Mapped[str] = mapped_column(String(200))
    commercial_name: Mapped[str] = mapped_column(String(100))
    short_code: Mapped[str] = mapped_column(String(20), unique=True)
    slug: Mapped[Optional[str]] = mapped_column(String(100), unique=True)
    status: Mapped[str] = mapped_column(String(30), default="PENDING_VERIFICATION")
    is_public: Mapped[bool] = mapped_column(Boolean, default=False)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    # Relationships
    members = relationship("OrganizationMember", back_populates="organization")

class OrganizationMember(Base):
    __tablename__ = "organization_members"
    __table_args__ = {"schema": "public"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("public.organizations.id", ondelete="CASCADE"))
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("public.users.id", ondelete="CASCADE"))
    role_code: Mapped[str] = mapped_column(String(50))
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE")
    
    # Relationships
    user = relationship("User", back_populates="memberships")
    organization = relationship("Organization", back_populates="members")
