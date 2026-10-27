import uuid
from sqlalchemy import Column, String, Boolean, DateTime, Text, ForeignKey, Integer, Numeric, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class Vendor(Base):
    __tablename__ = "vendors"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    vendor_id = Column(String, unique=True, nullable=False, index=True) # e.g. MAD-VND-000001
    business_name = Column(String, nullable=False)
    contact_name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    phone = Column(String, nullable=True)
    address = Column(Text, nullable=True)
    city = Column(String, nullable=True)
    state = Column(String, nullable=True)
    country = Column(String, default="India")
    pincode = Column(String, nullable=True)
    gst_number = Column(String, nullable=True)
    
    status = Column(String, default="Active") # Invited, Pending Activation, Active, Suspended, Closed
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)

    # Relationships
    organizations = relationship("Organization", back_populates="vendor", cascade="all, delete-orphan")
    users = relationship("User", back_populates="vendor")
    subscription = relationship("VendorSubscription", back_populates="vendor", uselist=False, cascade="all, delete-orphan")
    print_jobs = relationship("PrintJob", back_populates="vendor")

class SubscriptionPlan(Base):
    __tablename__ = "subscription_plans"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String, unique=True, nullable=False) # e.g. Free Trial, Starter, Professional, Enterprise
    slug = Column(String, unique=True, nullable=False) # e.g. trial, starter, pro, enterprise
    price_monthly = Column(Numeric(10, 2), default=0.0) # in INR (e.g. 499.00, 999.00)
    max_organizations = Column(Integer, default=5)
    max_ai_generations_per_month = Column(Integer, default=50)
    max_pdf_generations_per_month = Column(Integer, default=200)
    max_storage_mb = Column(Integer, default=1024)
    features = Column(JSON, nullable=True)
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class VendorSubscription(Base):
    __tablename__ = "vendor_subscriptions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    vendor_id = Column(UUID(as_uuid=True), ForeignKey("vendors.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    plan_id = Column(UUID(as_uuid=True), ForeignKey("subscription_plans.id", ondelete="RESTRICT"), nullable=False, index=True)
    status = Column(String, default="Active") # Active, Past Due, Canceled, Trialing
    ai_generations_used = Column(Integer, default=0)
    pdf_generations_used = Column(Integer, default=0)
    current_period_start = Column(DateTime, default=datetime.utcnow)
    current_period_end = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    vendor = relationship("Vendor", back_populates="subscription")
    plan = relationship("SubscriptionPlan")
