from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from uuid import UUID

class BrandingOut(BaseModel):
    id: UUID
    primary_logo: Optional[str] = None
    secondary_logo: Optional[str] = None
    favicon: Optional[str] = None
    primary_color: str
    secondary_color: str
    text_color: str

    class Config:
        from_attributes = True

class BrandingUpdate(BaseModel):
    primary_color: Optional[str] = Field(None, pattern="^#[0-9a-fA-F]{6}$")
    secondary_color: Optional[str] = Field(None, pattern="^#[0-9a-fA-F]{6}$")
    text_color: Optional[str] = Field(None, pattern="^#[0-9a-fA-F]{6}$")

class OrganizationCreate(BaseModel):
    name: str
    org_type: str = Field(..., description="School, College, University, Corporate, Hospital, Hostel, Factory, Training Institute, Other")
    short_name: Optional[str] = None
    reg_number: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    pincode: Optional[str] = None
    website: Optional[str] = None
    
    # Org Admin User fields (created along with org)
    admin_name: str
    admin_email: EmailStr
    admin_phone: Optional[str] = None
    admin_username: str
    admin_password: str

class OrganizationOut(BaseModel):
    id: UUID
    org_id: str
    name: str
    short_name: Optional[str] = None
    org_type: str
    reg_number: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    pincode: Optional[str] = None
    website: Optional[str] = None
    is_active: bool
    branding: Optional[BrandingOut] = None

    class Config:
        from_attributes = True

class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    short_name: Optional[str] = None
    org_type: Optional[str] = None
    reg_number: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    pincode: Optional[str] = None
    website: Optional[str] = None
