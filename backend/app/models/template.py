import uuid
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Numeric, Integer, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class Template(Base):
    __tablename__ = "templates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True, index=True) # NULL means Global template
    name = Column(String, nullable=False)
    category = Column(String, nullable=False) # School, Corporate, Minimal, etc.
    card_width = Column(Numeric(precision=6, scale=3), default=3.375) # Default CR80 width
    card_height = Column(Numeric(precision=6, scale=3), default=2.125) # Default CR80 height
    unit = Column(String, default="in") # in, mm, cm
    orientation = Column(String, default="Landscape") # Portrait / Landscape
    is_published = Column(Boolean, default=False)
    is_locked = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)

    organization = relationship("Organization", back_populates="templates")
    versions = relationship("TemplateVersion", back_populates="template", cascade="all, delete-orphan")

class TemplateVersion(Base):
    __tablename__ = "template_versions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    template_id = Column(UUID(as_uuid=True), ForeignKey("templates.id", ondelete="CASCADE"), nullable=False, index=True)
    version_number = Column(Integer, nullable=False)
    layout_data = Column(JSON, nullable=False) # Front/Back canvas properties, elements, fonts
    created_by = Column(UUID(as_uuid=True), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    template = relationship("Template", back_populates="versions")
