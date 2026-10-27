from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, EmailStr

from app.core.database import get_db
from app.auth.dependencies import (
    get_current_active_admin, 
    get_current_vendor, 
    get_current_user,
    verify_vendor_isolation
)
from app.models.user import User, Role
from app.models.vendor import Vendor, SubscriptionPlan, VendorSubscription
from app.models.organization import Organization, OrganizationBranding
from app.core.security import get_password_hash
from app.services.audit import AuditService

router = APIRouter(prefix="/api/vendors", tags=["Vendor Management"])

class VendorCreate(BaseModel):
    business_name: str
    contact_name: str
    email: EmailStr
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = "India"
    pincode: Optional[str] = None
    gst_number: Optional[str] = None
    plan_slug: str = "starter" # trial, starter, pro, enterprise
    admin_password: str

class VendorUpdate(BaseModel):
    business_name: Optional[str] = None
    contact_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    gst_number: Optional[str] = None
    status: Optional[str] = None # Active, Suspended, Closed

def get_next_vendor_id(db: Session) -> str:
    count = db.query(Vendor).count()
    return f"MAD-VND-{count + 1:06d}"

@router.get("", response_model=List[Dict[str, Any]])
def list_vendors(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_roles = [r.name for r in current_user.roles]
    if "SUPER_ADMIN" in user_roles:
        vendors = db.query(Vendor).filter(Vendor.deleted_at == None).all()
    elif "VENDOR" in user_roles and current_user.vendor_id:
        vendors = db.query(Vendor).filter(Vendor.id == current_user.vendor_id, Vendor.deleted_at == None).all()
    else:
        raise HTTPException(status_code=403, detail="Unauthorized to list vendors.")
        
    out = []
    for v in vendors:
        org_count = db.query(Organization).filter(Organization.vendor_id == v.id, Organization.deleted_at == None).count()
        plan_name = v.subscription.plan.name if (v.subscription and v.subscription.plan) else "Standard"
        out.append({
            "id": str(v.id),
            "vendor_id": v.vendor_id,
            "business_name": v.business_name,
            "contact_name": v.contact_name,
            "email": v.email,
            "phone": v.phone,
            "city": v.city,
            "state": v.state,
            "status": v.status,
            "plan_name": plan_name,
            "organization_count": org_count,
            "created_at": v.created_at
        })
    return out

@router.post("", status_code=status.HTTP_201_CREATED)
def create_vendor(
    payload: VendorCreate,
    current_user: User = Depends(get_current_active_admin),
    db: Session = Depends(get_db)
):
    # Unique email check
    if db.query(Vendor).filter(Vendor.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Vendor email already registered.")
        
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="User account with this email already exists.")

    # 1. Create Vendor Record
    vendor_id = get_next_vendor_id(db)
    vendor = Vendor(
        vendor_id=vendor_id,
        business_name=payload.business_name,
        contact_name=payload.contact_name,
        email=payload.email,
        phone=payload.phone,
        address=payload.address,
        city=payload.city,
        state=payload.state,
        country=payload.country,
        pincode=payload.pincode,
        gst_number=payload.gst_number,
        status="Active",
        is_active=True
    )
    db.add(vendor)
    db.commit()
    db.refresh(vendor)

    # 2. Attach Subscription Plan
    plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.slug == payload.plan_slug).first()
    if not plan:
        plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.slug == "starter").first()

    sub = VendorSubscription(
        vendor_id=vendor.id,
        plan_id=plan.id,
        status="Active"
    )
    db.add(sub)

    # 3. Create Vendor Admin User
    vendor_role = db.query(Role).filter(Role.name == "VENDOR").first()
    if not vendor_role:
        vendor_role = Role(name="VENDOR", description="Print Vendor Account Owner")
        db.add(vendor_role)
        db.commit()
        db.refresh(vendor_role)

    user = User(
        vendor_id=vendor.id,
        full_name=payload.contact_name,
        email=payload.email,
        phone=payload.phone,
        username=payload.email.split("@")[0] + "_vnd",
        password_hash=get_password_hash(payload.admin_password),
        is_active=True
    )
    user.roles.append(vendor_role)
    db.add(user)
    db.commit()

    AuditService.log(
        db=db,
        action="Vendor Account Created",
        entity="vendors",
        entity_id=vendor.id,
        user_id=current_user.id,
        new_values={"vendor_id": vendor.vendor_id, "business_name": vendor.business_name}
    )

    return {
        "id": str(vendor.id),
        "vendor_id": vendor.vendor_id,
        "business_name": vendor.business_name,
        "email": vendor.email,
        "username": user.username,
        "status": vendor.status
    }

@router.get("/{vendor_uuid}")
def get_vendor_details(
    vendor_uuid: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    verify_vendor_isolation(vendor_uuid, current_user)
    vendor = db.query(Vendor).filter(Vendor.id == vendor_uuid, Vendor.deleted_at == None).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found.")

    sub_info = None
    if vendor.subscription and vendor.subscription.plan:
        sub_info = {
            "plan_name": vendor.subscription.plan.name,
            "price_monthly": float(vendor.subscription.plan.price_monthly),
            "max_organizations": vendor.subscription.plan.max_organizations,
            "max_ai_generations": vendor.subscription.plan.max_ai_generations_per_month,
            "ai_generations_used": vendor.subscription.ai_generations_used,
            "max_pdf_generations": vendor.subscription.plan.max_pdf_generations_per_month,
            "pdf_generations_used": vendor.subscription.pdf_generations_used,
            "status": vendor.subscription.status
        }

    return {
        "id": str(vendor.id),
        "vendor_id": vendor.vendor_id,
        "business_name": vendor.business_name,
        "contact_name": vendor.contact_name,
        "email": vendor.email,
        "phone": vendor.phone,
        "address": vendor.address,
        "city": vendor.city,
        "state": vendor.state,
        "pincode": vendor.pincode,
        "gst_number": vendor.gst_number,
        "status": vendor.status,
        "subscription": sub_info,
        "created_at": vendor.created_at
    }

@router.get("/{vendor_uuid}/organizations")
def list_vendor_organizations(
    vendor_uuid: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    verify_vendor_isolation(vendor_uuid, current_user)
    orgs = db.query(Organization).filter(
        Organization.vendor_id == vendor_uuid,
        Organization.deleted_at == None
    ).order_by(Organization.created_at.desc()).all()

    return [
        {
            "id": str(o.id),
            "org_id": o.org_id,
            "name": o.name,
            "org_type": o.org_type,
            "city": o.city,
            "state": o.state,
            "is_active": o.is_active,
            "created_at": o.created_at
        }
        for o in orgs
    ]

import secrets
from datetime import timedelta
from app.models.invitation import Invitation

class VendorInviteRequest(BaseModel):
    business_name: str
    contact_name: str
    email: EmailStr
    phone: Optional[str] = None
    plan_slug: str = "starter"

@router.post("/invite", status_code=status.HTTP_201_CREATED)
def invite_vendor(
    payload: VendorInviteRequest,
    current_user: User = Depends(get_current_active_admin),
    db: Session = Depends(get_db)
):
    """Super Admin initiates an expiring invitation for a new Vendor."""
    if db.query(Vendor).filter(Vendor.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Vendor email already registered.")
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="User account with this email already exists.")

    vendor_id = get_next_vendor_id(db)
    vendor = Vendor(
        vendor_id=vendor_id,
        business_name=payload.business_name,
        contact_name=payload.contact_name,
        email=payload.email,
        phone=payload.phone,
        status="Pending Activation",
        is_active=True
    )
    db.add(vendor)
    db.commit()
    db.refresh(vendor)

    # Attach subscription
    plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.slug == payload.plan_slug).first()
    if not plan:
        plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.slug == "starter").first()

    sub = VendorSubscription(
        vendor_id=vendor.id,
        plan_id=plan.id,
        status="Active"
    )
    db.add(sub)

    # Create expiring invitation token
    token = secrets.token_urlsafe(32)
    invitation = Invitation(
        token=token,
        email=payload.email,
        role="VENDOR_ADMIN",
        vendor_id=vendor.id,
        invited_by_id=current_user.id,
        status="PENDING",
        expires_at=datetime.utcnow() + timedelta(days=7)
    )
    db.add(invitation)
    db.commit()

    return {
        "vendor_id": vendor.vendor_id,
        "email": vendor.email,
        "invitation_token": token,
        "activation_url": f"/activate-vendor?token={token}",
        "expires_at": invitation.expires_at,
        "message": "Vendor invitation created successfully."
    }

class OrgInviteRequest(BaseModel):
    name: str
    org_type: str = "School" # School, College, Corporate, Healthcare
    admin_name: str
    admin_email: EmailStr
    city: Optional[str] = None
    state: Optional[str] = None

@router.post("/{vendor_uuid}/organizations/invite", status_code=status.HTTP_201_CREATED)
def invite_organization_admin(
    vendor_uuid: UUID,
    payload: OrgInviteRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Vendor registers an organization and sends an expiring invitation to the Org Admin."""
    verify_vendor_isolation(vendor_uuid, current_user)

    if db.query(User).filter(User.email == payload.admin_email).first():
        raise HTTPException(status_code=400, detail="User account with this email already exists.")

    count = db.query(Organization).count()
    org_id = f"MAD-ORG-{count + 1:06d}"

    org = Organization(
        org_id=org_id,
        vendor_id=vendor_uuid,
        name=payload.name,
        org_type=payload.org_type,
        city=payload.city,
        state=payload.state,
        is_active=True
    )
    db.add(org)
    db.commit()
    db.refresh(org)

    # Create default branding
    branding = OrganizationBranding(
        organization_id=org.id,
        primary_color="#1e3a8a",
        secondary_color="#f59e0b",
        text_color="#1f2937"
    )
    db.add(branding)

    # Create invitation for Org Admin
    token = secrets.token_urlsafe(32)
    invitation = Invitation(
        token=token,
        email=payload.admin_email,
        role="ORGANIZATION_ADMIN",
        vendor_id=vendor_uuid,
        organization_id=org.id,
        invited_by_id=current_user.id,
        status="PENDING",
        expires_at=datetime.utcnow() + timedelta(days=7)
    )
    db.add(invitation)
    db.commit()

    return {
        "org_id": org.org_id,
        "name": org.name,
        "admin_email": payload.admin_email,
        "invitation_token": token,
        "activation_url": f"/activate-org-admin?token={token}",
        "expires_at": invitation.expires_at,
        "message": "Organization registered and Organization Admin invitation created successfully."
    }
