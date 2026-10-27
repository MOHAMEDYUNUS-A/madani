from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import date
from uuid import UUID

class DepartmentCreate(BaseModel):
    name: str

class DepartmentOut(BaseModel):
    id: UUID
    name: str
    class Config:
        from_attributes = True

class MemberBase(BaseModel):
    member_id: str
    admission_number: Optional[str] = None
    name: str
    dob: Optional[date] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    designation: Optional[str] = None
    class_name: Optional[str] = None
    section: Optional[str] = None
    academic_year: Optional[str] = None
    roll_number: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    parent_name: Optional[str] = None
    emergency_contact: Optional[str] = None
    joining_date: Optional[date] = None
    expiry_date: Optional[date] = None
    status: Optional[str] = "Active"
    rejection_reason: Optional[str] = None

class MemberCreate(MemberBase):
    department_id: Optional[UUID] = None

class MemberUpdate(BaseModel):
    member_id: Optional[str] = None
    admission_number: Optional[str] = None
    name: Optional[str] = None
    dob: Optional[date] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    department_id: Optional[UUID] = None
    designation: Optional[str] = None
    class_name: Optional[str] = None
    section: Optional[str] = None
    academic_year: Optional[str] = None
    roll_number: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    parent_name: Optional[str] = None
    emergency_contact: Optional[str] = None
    joining_date: Optional[date] = None
    expiry_date: Optional[date] = None
    status: Optional[str] = None
    rejection_reason: Optional[str] = None
    photo_url: Optional[str] = None
    photo_original_url: Optional[str] = None

class MemberOut(MemberBase):
    id: UUID
    organization_id: UUID
    department: Optional[DepartmentOut] = None
    photo_url: Optional[str] = None
    photo_original_url: Optional[str] = None

    class Config:
        from_attributes = True

class ImportSummary(BaseModel):
    total_records: int
    valid_count: int
    duplicate_count: int
    error_count: int
    errors: List[str]
