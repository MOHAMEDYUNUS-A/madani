import uuid
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Integer, Numeric, Text, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class BatchSnapshot(Base):
    __tablename__ = "batch_snapshots"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    vendor_id = Column(UUID(as_uuid=True), ForeignKey("vendors.id", ondelete="CASCADE"), nullable=True, index=True)
    batch_name = Column(String, nullable=False)
    
    # Frozen snapshots
    template_version_id = Column(UUID(as_uuid=True), nullable=True)
    frozen_template_layout = Column(JSON, nullable=False) # Immutable snapshot of canvas layout
    frozen_records_data = Column(JSON, nullable=False) # Array of student records at approval moment
    
    card_count = Column(Integer, nullable=False)
    card_width = Column(Numeric(6, 3), default=3.375)
    card_height = Column(Numeric(6, 3), default=2.125)
    orientation = Column(String, default="Landscape")
    print_settings = Column(JSON, nullable=True) # Paper size, margin, bleed, crop marks
    
    approved_by = Column(UUID(as_uuid=True), nullable=False)
    approved_at = Column(DateTime, default=datetime.utcnow)
    
    pdf_proof_url = Column(String, nullable=True)
    pdf_production_url = Column(String, nullable=True)
    pdf_checksum = Column(String, nullable=True)
    
    is_locked = Column(Boolean, default=True) # Immutable flag
    created_at = Column(DateTime, default=datetime.utcnow)

    organization = relationship("Organization")
    vendor = relationship("Vendor")
    print_jobs = relationship("PrintJob", back_populates="batch_snapshot")

class PrintJob(Base):
    __tablename__ = "print_jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    job_id = Column(String, unique=True, nullable=False, index=True) # e.g. MAD-JOB-2026-000001
    vendor_id = Column(UUID(as_uuid=True), ForeignKey("vendors.id", ondelete="CASCADE"), nullable=False, index=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    batch_snapshot_id = Column(UUID(as_uuid=True), ForeignKey("batch_snapshots.id", ondelete="RESTRICT"), nullable=False, index=True)
    
    # Strict Production Status Machine
    status = Column(String, default="Awaiting Review")
    # Allowed: Draft, Awaiting Review, Revision Required, Quotation Pending, Awaiting Payment, 
    #          Approved for Production, Queued, Printing, Quality Check, Rework Required, 
    #          Packed, Dispatched, Delivered, Completed, Cancelled
    
    quantity = Column(Integer, nullable=False)
    card_material = Column(String, default="Standard PVC (30 mil)") # Standard PVC, Matte Premium, Eco Composite
    lamination_type = Column(String, default="Glossy UV") # Glossy UV, Matte Velvet, None
    accessories = Column(JSON, nullable=True) # e.g. {"lanyards": True, "holders": True}
    
    # Delivery Info
    delivery_recipient = Column(String, nullable=False)
    delivery_phone = Column(String, nullable=False)
    delivery_address = Column(Text, nullable=False)
    delivery_city = Column(String, nullable=False)
    delivery_state = Column(String, nullable=False)
    delivery_pincode = Column(String, nullable=False)
    requested_delivery_date = Column(DateTime, nullable=True)
    
    # Commercials & Quotation
    quotation_details = Column(JSON, nullable=True) # Breakdown: unit_rate, lamination, accessories, delivery, gst, total
    total_amount = Column(Numeric(10, 2), default=0.0)
    payment_status = Column(String, default="Pending") # Pending, Confirmed, Waived, Refunded
    
    production_notes = Column(Text, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    vendor = relationship("Vendor", back_populates="print_jobs")
    organization = relationship("Organization")
    batch_snapshot = relationship("BatchSnapshot", back_populates="print_jobs")
    events = relationship("PrintJobEvent", back_populates="print_job", cascade="all, delete-orphan")
    qc_checks = relationship("QualityControlCheck", back_populates="print_job", cascade="all, delete-orphan")
    dispatch = relationship("DispatchRecord", back_populates="print_job", uselist=False, cascade="all, delete-orphan")

class PrintJobEvent(Base):
    __tablename__ = "print_job_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    print_job_id = Column(UUID(as_uuid=True), ForeignKey("print_jobs.id", ondelete="CASCADE"), nullable=False, index=True)
    from_status = Column(String, nullable=True)
    to_status = Column(String, nullable=False)
    changed_by = Column(UUID(as_uuid=True), nullable=True)
    reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    print_job = relationship("PrintJob", back_populates="events")

class QualityControlCheck(Base):
    __tablename__ = "quality_control_checks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    print_job_id = Column(UUID(as_uuid=True), ForeignKey("print_jobs.id", ondelete="CASCADE"), nullable=False, index=True)
    check_name = Column(String, nullable=False) # e.g. Color calibration, Cutting alignment, QR readability, Lamination adhesion
    passed = Column(Boolean, default=True)
    notes = Column(Text, nullable=True)
    checked_by = Column(UUID(as_uuid=True), nullable=True)
    checked_at = Column(DateTime, default=datetime.utcnow)

    print_job = relationship("PrintJob", back_populates="qc_checks")

class DispatchRecord(Base):
    __tablename__ = "dispatch_records"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    print_job_id = Column(UUID(as_uuid=True), ForeignKey("print_jobs.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    courier_name = Column(String, nullable=False) # e.g. BlueDart, DTDC, Delhivery, Fedex
    tracking_number = Column(String, nullable=False, index=True)
    tracking_url = Column(String, nullable=True)
    dispatch_date = Column(DateTime, default=datetime.utcnow)
    expected_delivery_date = Column(DateTime, nullable=True)
    delivered_at = Column(DateTime, nullable=True)
    recipient_signature_name = Column(String, nullable=True)
    notes = Column(Text, nullable=True)

    print_job = relationship("PrintJob", back_populates="dispatch")
