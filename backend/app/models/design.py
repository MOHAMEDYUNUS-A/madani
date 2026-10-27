import uuid
from sqlalchemy import Column, String, Boolean, DateTime, Text, ForeignKey, Integer, Numeric, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class BrandKit(Base):
    __tablename__ = "brand_kits"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    
    primary_color = Column(String(7), default="#1e3a8a")
    secondary_color = Column(String(7), default="#f59e0b")
    accent_color = Column(String(7), default="#10b981")
    background_color = Column(String(7), default="#ffffff")
    text_color = Column(String(7), default="#1f2937")
    
    font_heading = Column(String, default="Inter")
    font_body = Column(String, default="Inter")
    
    extracted_colors = Column(JSON, nullable=True) # Colors extracted by Brand Intelligence Agent
    brand_guidelines = Column(Text, nullable=True)
    style_keywords = Column(JSON, nullable=True) # e.g. ["corporate", "clean", "minimal"]
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    organization = relationship("Organization")

class BrandAsset(Base):
    __tablename__ = "brand_assets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    
    asset_type = Column(String, nullable=False) # logo, watermark, signature, badge, reference_design
    file_url = Column(String, nullable=False)
    original_filename = Column(String, nullable=True)
    file_size = Column(Integer, nullable=True)
    mime_type = Column(String, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    organization = relationship("Organization")

class DesignProject(Base):
    __tablename__ = "design_projects"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    vendor_id = Column(UUID(as_uuid=True), ForeignKey("vendors.id", ondelete="CASCADE"), nullable=True, index=True)
    
    name = Column(String, nullable=False)
    brief = Column(Text, nullable=True) # Natural language design brief
    card_category = Column(String, default="School") # School, Corporate, Hospital, Industrial, Membership
    card_width = Column(Numeric(6, 3), default=3.375)
    card_height = Column(Numeric(6, 3), default=2.125)
    orientation = Column(String, default="Landscape") # Landscape / Portrait
    has_back_side = Column(Boolean, default=True)
    required_fields = Column(JSON, nullable=True) # e.g. ["name", "id", "photo", "blood_group", "qr"]
    
    status = Column(String, default="Draft") # Draft, Proposed, Revision_Requested, Approved, Archived
    created_by = Column(UUID(as_uuid=True), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    organization = relationship("Organization")
    vendor = relationship("Vendor")
    variations = relationship("DesignVariation", back_populates="project", cascade="all, delete-orphan")
    approvals = relationship("DesignApproval", back_populates="project", cascade="all, delete-orphan")

class DesignVariation(Base):
    __tablename__ = "design_variations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("design_projects.id", ondelete="CASCADE"), nullable=False, index=True)
    
    variation_name = Column(String, nullable=False) # e.g. "Minimal Corporate Navy", "Modern Geometric"
    style_family = Column(String, nullable=False) # minimal, executive, modern, academic, healthcare, industrial
    layout_data = Column(JSON, nullable=False) # Front & Back canvas layout elements
    preview_thumbnail_url = Column(String, nullable=True)
    quality_score = Column(Numeric(4, 2), default=100.0)
    quality_report = Column(JSON, nullable=True) # Print quality agent checks
    is_selected = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("DesignProject", back_populates="variations")

class DesignApproval(Base):
    __tablename__ = "design_approvals"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("design_projects.id", ondelete="CASCADE"), nullable=False, index=True)
    variation_id = Column(UUID(as_uuid=True), ForeignKey("design_variations.id", ondelete="SET NULL"), nullable=True)
    
    decision = Column(String, nullable=False) # Approved, Revision_Requested
    comments = Column(Text, nullable=True)
    approved_by = Column(UUID(as_uuid=True), nullable=False) # User ID who made the decision
    immutable_layout_snapshot = Column(JSON, nullable=True) # Frozen immutable design layout
    
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("DesignProject", back_populates="approvals")

class AIGenerationLog(Base):
    __tablename__ = "ai_generation_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    vendor_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    organization_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    
    action = Column(String, nullable=False) # brief_analysis, variation_generation, canvas_chat_edit, print_check
    prompt = Column(Text, nullable=True)
    response_payload = Column(JSON, nullable=True)
    tokens_used = Column(Integer, default=0)
    model_name = Column(String, default="mock-ai-engine")
    
    created_at = Column(DateTime, default=datetime.utcnow)
