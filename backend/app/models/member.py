import uuid
from sqlalchemy import Column, String, DateTime, Date, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class Department(Base):
    __tablename__ = "departments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    organization = relationship("Organization", back_populates="departments")
    members = relationship("Member", back_populates="department")

class Member(Base):
    __tablename__ = "members"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    member_id = Column(String, nullable=False, index=True) # ID card number e.g. MAM2026001
    admission_number = Column(String, nullable=True, index=True)
    name = Column(String, nullable=False)
    dob = Column(Date, nullable=True)
    gender = Column(String, nullable=True)
    blood_group = Column(String, nullable=True)
    
    department_id = Column(UUID(as_uuid=True), ForeignKey("departments.id", ondelete="SET NULL"), nullable=True, index=True)
    designation = Column(String, nullable=True)
    class_name = Column(String, nullable=True)
    section = Column(String, nullable=True)
    academic_year = Column(String, nullable=True)
    roll_number = Column(String, nullable=True)
    
    phone = Column(String, nullable=True)
    email = Column(String, nullable=True)
    address = Column(String, nullable=True)
    parent_name = Column(String, nullable=True)
    emergency_contact = Column(String, nullable=True)
    
    joining_date = Column(Date, nullable=True)
    expiry_date = Column(Date, nullable=True)
    status = Column(String, default="Active") # Active, Inactive, Suspended
    rejection_reason = Column(String, nullable=True)
    
    photo_url = Column(String, nullable=True) # Normalized/Cropped S3 key
    photo_original_url = Column(String, nullable=True) # Original uploaded photo S3 key
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)

    organization = relationship("Organization", back_populates="members")
    department = relationship("Department", back_populates="members")

    # Enforce uniqueness within each organization
    __table_args__ = (
        UniqueConstraint("organization_id", "member_id", name="uq_organization_member_id"),
    )
