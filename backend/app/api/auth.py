from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import uuid

from app.core.database import get_db
from app.core.security import get_password_hash, verify_password, create_access_token
from app.core.config import settings
from app.models.organization import Organization, OrganizationBranding
from app.models.user import User, Role
from app.schemas.auth import LoginRequest, UserCreate, UserOut, Token
from app.schemas.organization import OrganizationCreate, OrganizationOut
from app.services.audit import AuditService
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

def get_next_org_id(db: Session) -> str:
    # Get total active/inactive count
    count = db.query(Organization).count()
    return f"MAD-ORG-{count + 1:06d}"

def get_or_create_role(db: Session, name: str, desc: str = "") -> Role:
    role = db.query(Role).filter(Role.name == name).first()
    if not role:
        role = Role(name=name, description=desc)
        db.add(role)
        db.commit()
        db.refresh(role)
    return role

@router.post("/register", response_model=OrganizationOut, status_code=status.HTTP_201_CREATED)
def register_organization(payload: OrganizationCreate, db: Session = Depends(get_db)):
    # Check if admin user exists (email/username check)
    existing_email = db.query(User).filter(User.email == payload.admin_email).first()
    if existing_email:
        raise HTTPException(status_code=400, detail="Admin email already registered.")
        
    existing_username = db.query(User).filter(User.username == payload.admin_username).first()
    if existing_username:
        raise HTTPException(status_code=400, detail="Admin username already taken.")

    # 1. Create Organization
    org_id = get_next_org_id(db)
    organization = Organization(
        org_id=org_id,
        name=payload.name,
        org_type=payload.org_type,
        short_name=payload.short_name,
        reg_number=payload.reg_number,
        address=payload.address,
        city=payload.city,
        state=payload.state,
        country=payload.country,
        pincode=payload.pincode,
        website=payload.website
    )
    db.add(organization)
    db.commit()
    db.refresh(organization)

    # 2. Create Default Branding
    branding = OrganizationBranding(
        organization_id=organization.id,
        primary_color="#1e3a8a",
        secondary_color="#f59e0b",
        text_color="#1f2937"
    )
    db.add(branding)
    
    # Ensure default roles exist in the system
    admin_role = get_or_create_role(db, "ORGANIZATION_ADMIN", "Administrator of the organization workspace")
    get_or_create_role(db, "STAFF", "Organization operator staff")
    get_or_create_role(db, "DESIGNER", "ID card template designer")
    get_or_create_role(db, "SUPER_ADMIN", "Madani overall platform admin")

    # 3. Create Admin User
    admin_user = User(
        organization_id=organization.id,
        full_name=payload.admin_name,
        email=payload.admin_email,
        phone=payload.admin_phone,
        username=payload.admin_username,
        password_hash=get_password_hash(payload.admin_password),
        is_active=True
    )
    admin_user.roles.append(admin_role)
    db.add(admin_user)
    db.commit()
    
    # Log Audit
    AuditService.log(
        db=db,
        action="Organization Registered",
        entity="organizations",
        entity_id=organization.id,
        user_id=admin_user.id,
        organization_id=organization.id,
        new_values={"org_id": org_id, "name": organization.name}
    )

    db.refresh(organization)
    return organization

@router.post("/login", response_model=Token)
def login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == payload.username, User.deleted_at == None).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Account is deactivated.")

    # Create Token
    token_delta = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(subject=user.username, expires_delta=token_delta)

    # Set Cookie
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        samesite="lax",
        secure=False, # Set to True in production with HTTPS
    )

    # Log login audit
    AuditService.log(
        db=db,
        action="User Logged In",
        entity="users",
        entity_id=user.id,
        user_id=user.id,
        organization_id=user.organization_id
    )

    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/logout")
def logout(response: Response, request: Request, db: Session = Depends(get_db)):
    # Clear cookie
    response.delete_cookie("access_token")
    return {"message": "Successfully logged out"}

@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    # Map roles string array
    roles_list = [r.name for r in current_user.roles]
    
    # Construct response
    user_out = UserOut(
        id=current_user.id,
        vendor_id=current_user.vendor_id,
        organization_id=current_user.organization_id,
        full_name=current_user.full_name,
        email=current_user.email,
        username=current_user.username,
        phone=current_user.phone,
        is_active=current_user.is_active,
        roles=roles_list
    )
    return user_out

from pydantic import BaseModel
from app.models.invitation import Invitation
from app.models.vendor import Vendor

class ActivateAccountRequest(BaseModel):
    token: str
    full_name: str
    username: str
    password: str

@router.get("/invitations/{token}")
def get_invitation_details(token: str, db: Session = Depends(get_db)):
    inv = db.query(Invitation).filter(Invitation.token == token).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invitation not found.")
    if not inv.is_valid:
        raise HTTPException(status_code=400, detail="Invitation is expired or already used.")
    
    target_name = ""
    if inv.vendor:
        target_name = inv.vendor.business_name
    elif inv.organization:
        target_name = inv.organization.name

    return {
        "email": inv.email,
        "role": inv.role,
        "target_name": target_name,
        "expires_at": inv.expires_at,
        "status": inv.status
    }

@router.post("/activate-vendor")
def activate_vendor_account(
    payload: ActivateAccountRequest, 
    response: Response,
    db: Session = Depends(get_db)
):
    inv = db.query(Invitation).filter(Invitation.token == payload.token).first()
    if not inv or not inv.is_valid or inv.role != "VENDOR_ADMIN":
        raise HTTPException(status_code=400, detail="Invalid or expired vendor invitation.")

    # Check if username or email is already taken
    if db.query(User).filter(User.username == payload.username).first():
        raise HTTPException(status_code=400, detail="Username already in use.")

    vendor = db.query(Vendor).filter(Vendor.id == inv.vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Associated vendor not found.")

    vendor_role = get_or_create_role(db, "VENDOR", "Print Vendor Account Owner")

    user = User(
        vendor_id=vendor.id,
        full_name=payload.full_name,
        email=inv.email,
        username=payload.username,
        password_hash=get_password_hash(payload.password),
        is_active=True
    )
    user.roles.append(vendor_role)
    db.add(user)

    # Mark vendor Active and invitation ACCEPTED
    vendor.status = "Active"
    inv.status = "ACCEPTED"
    inv.accepted_at = datetime.utcnow()

    db.commit()
    db.refresh(user)

    access_token = create_access_token(
        subject=user.username,
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        samesite="lax",
        secure=False
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "vendor_id": str(vendor.id),
        "message": "Vendor account activated successfully."
    }

@router.post("/activate-org-admin")
def activate_org_admin_account(
    payload: ActivateAccountRequest,
    response: Response,
    db: Session = Depends(get_db)
):
    inv = db.query(Invitation).filter(Invitation.token == payload.token).first()
    if not inv or not inv.is_valid or inv.role != "ORGANIZATION_ADMIN":
        raise HTTPException(status_code=400, detail="Invalid or expired organization invitation.")

    if db.query(User).filter(User.username == payload.username).first():
        raise HTTPException(status_code=400, detail="Username already in use.")

    org = db.query(Organization).filter(Organization.id == inv.organization_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Associated organization not found.")

    admin_role = get_or_create_role(db, "ORGANIZATION_ADMIN", "Administrator of the organization workspace")

    user = User(
        organization_id=org.id,
        vendor_id=org.vendor_id,
        full_name=payload.full_name,
        email=inv.email,
        username=payload.username,
        password_hash=get_password_hash(payload.password),
        is_active=True
    )
    user.roles.append(admin_role)
    db.add(user)

    inv.status = "ACCEPTED"
    inv.accepted_at = datetime.utcnow()

    db.commit()
    db.refresh(user)

    access_token = create_access_token(
        subject=user.username,
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        samesite="lax",
        secure=False
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "organization_id": str(org.id),
        "message": "Organization Admin account activated successfully."
    }
