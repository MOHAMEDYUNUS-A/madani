from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from uuid import UUID

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class LoginRequest(BaseModel):
    username: str
    password: str

class UserCreate(BaseModel):
    full_name: str
    email: EmailStr
    username: str
    password: str
    phone: Optional[str] = None
    role_name: str = "STAFF" # STAFF, DESIGNER, etc.
    assigned_class: Optional[str] = None

class UserOut(BaseModel):
    id: UUID
    vendor_id: Optional[UUID] = None
    organization_id: Optional[UUID] = None
    full_name: str
    email: EmailStr
    username: str
    phone: Optional[str] = None
    assigned_class: Optional[str] = None
    is_active: bool
    roles: List[str] = []

    model_config = {"from_attributes": True}

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    assigned_class: Optional[str] = None
    is_active: Optional[bool] = None
    role_name: Optional[str] = None

