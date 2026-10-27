from pydantic import BaseModel, Field
from typing import Optional, Any, Dict, List
from uuid import UUID
from datetime import datetime

class TemplateVersionCreate(BaseModel):
    layout_data: Dict[str, Any] # Front/Back positioning details, shapes, variables mappings

class TemplateVersionOut(BaseModel):
    id: UUID
    template_id: UUID
    version_number: int
    layout_data: Dict[str, Any]
    created_at: datetime

    class Config:
        from_attributes = True

class TemplateCreate(BaseModel):
    name: str
    category: str
    card_width: float = 3.375
    card_height: float = 2.125
    unit: str = "in"
    orientation: str = "Landscape"
    layout_data: Dict[str, Any] # Initial canvas configuration

class TemplateOut(BaseModel):
    id: UUID
    organization_id: Optional[UUID] = None
    name: str
    category: str
    card_width: float
    card_height: float
    unit: str
    orientation: str
    is_published: bool
    is_locked: bool
    created_at: datetime
    updated_at: datetime
    
    # We can fetch latest version or version list as sub-relations if requested
    versions: List[TemplateVersionOut] = []

    class Config:
        from_attributes = True

class TemplateUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    card_width: Optional[float] = None
    card_height: Optional[float] = None
    unit: Optional[str] = None
    orientation: Optional[str] = None
    is_published: Optional[bool] = None
    is_locked: Optional[bool] = None
