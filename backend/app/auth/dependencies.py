from fastapi import Depends, HTTPException, status, Security, Cookie, Header
from fastapi.security import APIKeyCookie
from sqlalchemy.orm import Session
from jose import jwt, JWTError
from typing import List, Optional
from uuid import UUID

from app.core.config import settings
from app.core.database import get_db
from app.models.user import User, Role
from app.models.organization import Organization

# Use Cookie auth
oauth2_scheme = APIKeyCookie(name="access_token", auto_error=False)

def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> User:
    # Support both Cookie and Authorization Header (for API testing / ease of access)
    actual_token = None
    if authorization and authorization.startswith("Bearer "):
        actual_token = authorization.split(" ")[1]
    elif token:
        actual_token = token

    if not actual_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated. Please login.",
        )
    
    try:
        payload = jwt.decode(actual_token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token.",
            )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token.",
        )
        
    user = db.query(User).filter(User.username == username, User.deleted_at == None).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user account.",
        )
    return user

class RoleChecker:
    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, current_user: User = Depends(get_current_user)) -> User:
        user_roles = [r.name for r in current_user.roles]
        
        # SUPER_ADMIN bypasses all role checks
        if "SUPER_ADMIN" in user_roles:
            return current_user
            
        for role in self.allowed_roles:
            if role in user_roles:
                return current_user
                
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this resource.",
        )

# Base permission dependencies
def get_current_active_admin(user: User = Depends(RoleChecker(["SUPER_ADMIN"]))):
    return user

def get_current_vendor(user: User = Depends(RoleChecker(["SUPER_ADMIN", "VENDOR"]))):
    return user

def get_current_production_operator(user: User = Depends(RoleChecker(["SUPER_ADMIN", "PRODUCTION_OPERATOR"]))):
    return user

def get_current_org_admin(user: User = Depends(RoleChecker(["SUPER_ADMIN", "VENDOR", "ORGANIZATION_ADMIN", "STAFF_ADMIN"]))):
    return user

def get_current_org_staff(user: User = Depends(RoleChecker(["SUPER_ADMIN", "VENDOR", "ORGANIZATION_ADMIN", "STAFF_ADMIN", "STAFF", "DATA_ENTRY_STAFF"]))):
    return user

def get_current_org_designer(user: User = Depends(RoleChecker(["SUPER_ADMIN", "VENDOR", "ORGANIZATION_ADMIN", "STAFF_ADMIN", "DESIGNER"]))):
    return user

def get_current_org_member(user: User = Depends(RoleChecker(["SUPER_ADMIN", "VENDOR", "ORGANIZATION_ADMIN", "STAFF_ADMIN", "STAFF", "DATA_ENTRY_STAFF", "DESIGNER", "VIEWER"]))):
    return user

def verify_vendor_isolation(vendor_id: UUID, current_user: User):
    """
    Enforce server-side vendor tenant isolation.
    Verifies that the user belongs to the requested vendor_id.
    SUPER_ADMIN bypasses this check.
    """
    user_roles = [r.name for r in current_user.roles]
    if "SUPER_ADMIN" in user_roles:
        return
        
    if current_user.vendor_id != vendor_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Cross-vendor operation blocked.",
        )

def verify_tenant_isolation(organization_id: UUID, current_user: User, db: Optional[Session] = None):
    """
    Enforce server-side multi-tier tenant isolation:
    1. SUPER_ADMIN bypasses all checks.
    2. VENDOR can access any organization owned by their vendor_id.
    3. ORGANIZATION_ADMIN / STAFF can only access their specific organization_id.
    """
    user_roles = [r.name for r in current_user.roles]
    if "SUPER_ADMIN" in user_roles:
        return

    # Check if Vendor owns this organization
    if "VENDOR" in user_roles and current_user.vendor_id:
        if db:
            org = db.query(Organization).filter(Organization.id == organization_id).first()
            if org and org.vendor_id == current_user.vendor_id:
                return
        elif current_user.organization_id == organization_id:
            return
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Vendor does not own this organization.",
            )

    if current_user.organization_id != organization_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Cross-tenant operation blocked.",
        )

def get_effective_org_id(user: User, db: Session) -> Optional[UUID]:
    """
    Returns the user's explicit organization_id.
    If the user has SUPER_ADMIN or VENDOR role and no explicit org_id is assigned,
    seamlessly resolves to the first available organization so that administrative dashboards work without errors.
    """
    if user.organization_id:
        return user.organization_id
    user_roles = [r.name for r in user.roles]
    if "SUPER_ADMIN" in user_roles:
        first_org = db.query(Organization).filter(Organization.deleted_at == None).first()
        if first_org:
            return first_org.id
    if "VENDOR" in user_roles and user.vendor_id:
        first_org = db.query(Organization).filter(
            Organization.vendor_id == user.vendor_id,
            Organization.deleted_at == None
        ).first()
        if first_org:
            return first_org.id
        # Fallback to any organization
        first_any = db.query(Organization).filter(Organization.deleted_at == None).first()
        if first_any:
            return first_any.id
    return None

