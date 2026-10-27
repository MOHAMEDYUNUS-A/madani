import uuid
from sqlalchemy import Column, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.core.database import Base

class Organization(Base):
    __tablename__ = "organizations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    org_id = Column(String, unique=True, nullable=False, index=True)
    vendor_id = Column(UUID(as_uuid=True), ForeignKey("vendors.id", ondelete="SET NULL"), nullable=True, index=True)
    name = Column(String, nullable=False)
    short_name = Column(String, nullable=True)
    org_type = Column(String, nullable=False) # School, College, University, Corporate, Hospital, Industrial
    reg_number = Column(String, nullable=True)
    address = Column(Text, nullable=True)
    city = Column(String, nullable=True)
    state = Column(String, nullable=True)
    country = Column(String, nullable=True)
    pincode = Column(String, nullable=True)
    website = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)

    vendor = relationship("Vendor", back_populates="organizations")
    branding = relationship("OrganizationBranding", back_populates="organization", uselist=False, cascade="all, delete-orphan")
    users = relationship("User", back_populates="organization", cascade="all, delete-orphan")
    members = relationship("Member", back_populates="organization", cascade="all, delete-orphan")
    departments = relationship("Department", back_populates="organization", cascade="all, delete-orphan")
    templates = relationship("Template", back_populates="organization", cascade="all, delete-orphan")
    orders = relationship("Order", back_populates="organization", cascade="all, delete-orphan")
    classes = relationship("OrganizationClass", back_populates="organization", cascade="all, delete-orphan")

class OrganizationBranding(Base):
    __tablename__ = "organization_branding"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    primary_logo = Column(String, nullable=True) # Storage path
    secondary_logo = Column(String, nullable=True)
    favicon = Column(String, nullable=True)
    primary_color = Column(String(7), default="#1e3a8a") # Hex
    secondary_color = Column(String(7), default="#f59e0b")
    text_color = Column(String(7), default="#1f2937")
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    organization = relationship("Organization", back_populates="branding")

class OrganizationClass(Base):
    __tablename__ = "organization_classes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String, nullable=False) # e.g. "Grade 1-A", "LKG-B", "CSE-3"
    section = Column(String, nullable=True)
    description = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    organization = relationship("Organization", back_populates="classes")

