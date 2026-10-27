import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, Integer, Numeric, Text, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class GeneratedBatch(Base):
    __tablename__ = "generated_batches"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    template_version_id = Column(UUID(as_uuid=True), ForeignKey("template_versions.id", ondelete="SET NULL"), nullable=True)
    name = Column(String, nullable=False)
    status = Column(String, default="Queued") # Queued, Processing, Completed, Failed
    progress = Column(Numeric(precision=5, scale=2), default=0.0) # 0 to 100
    pdf_url = Column(String, nullable=True) # S3 link
    card_count = Column(Integer, default=0)
    generation_config = Column(JSON, nullable=True) # Margin, layout size, orientation config
    error_message = Column(Text, nullable=True)
    created_by = Column(UUID(as_uuid=True), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    cards = relationship("GeneratedCard", back_populates="batch", cascade="all, delete-orphan")
    orders = relationship("Order", back_populates="batch")

class GeneratedCard(Base):
    __tablename__ = "generated_cards"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    batch_id = Column(UUID(as_uuid=True), ForeignKey("generated_batches.id", ondelete="CASCADE"), nullable=False, index=True)
    member_id = Column(UUID(as_uuid=True), ForeignKey("members.id", ondelete="CASCADE"), nullable=False, index=True)
    verification_token = Column(String, unique=True, nullable=False, index=True) # Public verification slug
    rendered_data = Column(JSON, nullable=False) # Snapshot of variables used at runtime
    created_at = Column(DateTime, default=datetime.utcnow)

    batch = relationship("GeneratedBatch", back_populates="cards")
    member = relationship("Member")

class Order(Base):
    __tablename__ = "orders"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    order_id = Column(String, unique=True, nullable=False, index=True) # Human readable: MAD-ORD-2026-000001
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    generated_batch_id = Column(UUID(as_uuid=True), ForeignKey("generated_batches.id", ondelete="RESTRICT"), nullable=False, index=True)
    
    status = Column(String, default="Submitted") # Draft, Submitted, Under Review, Quotation Sent, Payment Pending, Payment Confirmed, Approved, Printing, Quality Check, Packed, Dispatched, Delivered, Completed, Cancelled
    quantity = Column(Integer, nullable=False)
    material = Column(String, nullable=True) # Standard PVC, Matte, Eco, etc.
    lamination = Column(String, nullable=True) # Glossy, Matte, None
    
    delivery_recipient = Column(String, nullable=False)
    delivery_phone = Column(String, nullable=False)
    delivery_address = Column(Text, nullable=False)
    delivery_city = Column(String, nullable=False)
    delivery_state = Column(String, nullable=False)
    delivery_pincode = Column(String, nullable=False)
    
    courier_name = Column(String, nullable=True)
    tracking_number = Column(String, nullable=True)
    dispatch_date = Column(DateTime, nullable=True)
    expected_delivery_date = Column(DateTime, nullable=True)
    
    price_details = Column(JSON, nullable=True) # Price breakdown (itemized)
    special_instructions = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    organization = relationship("Organization", back_populates="orders")
    batch = relationship("GeneratedBatch", back_populates="orders")
    status_history = relationship("OrderStatusHistory", back_populates="order", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="order", cascade="all, delete-orphan")

class OrderStatusHistory(Base):
    __tablename__ = "order_status_history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    order_id = Column(UUID(as_uuid=True), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String, nullable=False)
    changed_by = Column(UUID(as_uuid=True), nullable=True) # User ID who made the change
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    order = relationship("Order", back_populates="status_history")

class Payment(Base):
    __tablename__ = "payments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    order_id = Column(UUID(as_uuid=True), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    payment_gateway = Column(String, nullable=True) # Razorpay, Cashfree, manual
    transaction_id = Column(String, nullable=True, index=True)
    amount = Column(Numeric(precision=10, scale=2), nullable=False)
    status = Column(String, default="Pending") # Pending, Success, Failed, Refunded
    payment_details = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    order = relationship("Order", back_populates="payments")
class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    organization_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    action = Column(String, nullable=False) # Organization Created, Student Added...
    entity = Column(String, nullable=False) # members, templates, orders...
    entity_id = Column(UUID(as_uuid=True), nullable=True)
    old_values = Column(JSON, nullable=True)
    new_values = Column(JSON, nullable=True)
    ip_address = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
