import uuid
from datetime import datetime, timedelta
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base

class Invitation(Base):
    __tablename__ = "invitations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    token = Column(String, unique=True, nullable=False, index=True)
    email = Column(String, nullable=False, index=True)
    role = Column(String, nullable=False) # VENDOR_ADMIN, ORGANIZATION_ADMIN, STAFF
    
    # Ownership scopes
    vendor_id = Column(UUID(as_uuid=True), ForeignKey("vendors.id", ondelete="CASCADE"), nullable=True, index=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True, index=True)
    
    invited_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    status = Column(String, default="PENDING") # PENDING, ACCEPTED, EXPIRED, REVOKED
    expires_at = Column(DateTime, nullable=False)
    accepted_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    vendor = relationship("Vendor")
    organization = relationship("Organization")
    invited_by = relationship("User", foreign_keys=[invited_by_id])

    @property
    def is_valid(self) -> bool:
        return self.status == "PENDING" and datetime.utcnow() <= self.expires_at
