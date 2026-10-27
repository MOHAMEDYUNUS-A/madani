from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from datetime import datetime

from app.core.database import get_db
from app.auth.dependencies import get_current_org_admin, verify_tenant_isolation, get_current_org_member, get_effective_org_id
from app.core.security import get_password_hash
from app.models.user import User, Role
from app.models.organization import Organization
from app.schemas.auth import UserOut, UserCreate, UserUpdate
from app.services.audit import AuditService

router = APIRouter(prefix="/api/staff", tags=["Staff Management"])

@router.get("", response_model=List[UserOut])
def list_staff(
    current_user: User = Depends(get_current_org_member),
    db: Session = Depends(get_db)
):
    org_id = get_effective_org_id(current_user, db)
    if not org_id:
        raise HTTPException(status_code=400, detail="User does not belong to any organization.")

    users = db.query(User).filter(
        User.organization_id == org_id,
        User.deleted_at == None
    ).all()
    
    out = []
    for u in users:
        out.append(UserOut(
            id=u.id,
            organization_id=u.organization_id,
            full_name=u.full_name,
            email=u.email,
            phone=u.phone,
            username=u.username,
            assigned_class=u.assigned_class,
            is_active=u.is_active,
            roles=[r.name for r in u.roles]
        ))
    return out

@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_staff(
    payload: UserCreate,
    current_user: User = Depends(get_current_org_admin),
    db: Session = Depends(get_db)
):
    org_id = get_effective_org_id(current_user, db)
    if not org_id:
        raise HTTPException(status_code=400, detail="User does not belong to any organization.")

    # Check unique constraints
    existing_email = db.query(User).filter(User.email == payload.email).first()
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already taken.")
        
    existing_username = db.query(User).filter(User.username == payload.username).first()
    if existing_username:
        raise HTTPException(status_code=400, detail="Username already taken.")

    # Get Role
    role = db.query(Role).filter(Role.name == payload.role_name).first()
    if not role or payload.role_name == "SUPER_ADMIN":
        # Fallback to STAFF role if not found or if DATA_ENTRY_STAFF
        if payload.role_name == "DATA_ENTRY_STAFF":
            role = db.query(Role).filter(Role.name == "STAFF").first()
        if not role:
            raise HTTPException(status_code=400, detail="Invalid role specified.")

    user = User(
        organization_id=org_id,
        full_name=payload.full_name,
        email=payload.email,
        phone=payload.phone,
        username=payload.username,
        assigned_class=payload.assigned_class,
        password_hash=get_password_hash(payload.password),
        is_active=True
    )
    user.roles.append(role)
    db.add(user)
    db.commit()
    db.refresh(user)

    AuditService.log(
        db=db,
        action="Staff User Created",
        entity="users",
        entity_id=user.id,
        user_id=current_user.id,
        organization_id=current_user.organization_id,
        new_values={"username": user.username, "role": role.name, "assigned_class": user.assigned_class}
    )

    return UserOut(
        id=user.id,
        organization_id=user.organization_id,
        full_name=user.full_name,
        email=user.email,
        phone=user.phone,
        username=user.username,
        assigned_class=user.assigned_class,
        is_active=user.is_active,
        roles=[role.name]
    )

@router.patch("/{user_id}", response_model=UserOut)
def update_staff(
    user_id: UUID,
    payload: UserUpdate,
    current_user: User = Depends(get_current_org_admin),
    db: Session = Depends(get_db)
):
    staff_user = db.query(User).filter(
        User.id == user_id,
        User.organization_id == current_user.organization_id,
        User.deleted_at == None
    ).first()
    
    if not staff_user:
        raise HTTPException(status_code=404, detail="Staff user not found.")

    old_vals = {c.name: getattr(staff_user, c.name) for c in staff_user.__table__.columns}

    # Update basic fields
    update_data = payload.model_dump(exclude_unset=True)
    if "role_name" in update_data:
        role_name = update_data.pop("role_name")
        if role_name:
            role = db.query(Role).filter(Role.name == role_name).first()
            if not role or role_name == "SUPER_ADMIN":
                raise HTTPException(status_code=400, detail="Invalid role specified.")
            staff_user.roles = [role]

    for key, value in update_data.items():
        setattr(staff_user, key, value)
        
    db.commit()
    db.refresh(staff_user)

    new_vals = {c.name: getattr(staff_user, c.name) for c in staff_user.__table__.columns}
    AuditService.log(
        db=db,
        action="Staff User Updated",
        entity="users",
        entity_id=staff_user.id,
        user_id=current_user.id,
        organization_id=current_user.organization_id,
        old_values=old_vals,
        new_values=new_vals
    )

    return UserOut(
        id=staff_user.id,
        organization_id=staff_user.organization_id,
        full_name=staff_user.full_name,
        email=staff_user.email,
        phone=staff_user.phone,
        username=staff_user.username,
        assigned_class=staff_user.assigned_class,
        is_active=staff_user.is_active,
        roles=[r.name for r in staff_user.roles]
    )

@router.delete("/{user_id}", status_code=status.HTTP_200_OK)
def delete_staff(
    user_id: UUID,
    current_user: User = Depends(get_current_org_admin),
    db: Session = Depends(get_db)
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot self-delete.")
        
    staff_user = db.query(User).filter(
        User.id == user_id,
        User.organization_id == current_user.organization_id,
        User.deleted_at == None
    ).first()
    
    if not staff_user:
        raise HTTPException(status_code=404, detail="Staff user not found.")

    staff_user.deleted_at = datetime.utcnow()
    db.commit()

    AuditService.log(
        db=db,
        action="Staff User Soft-Deleted",
        entity="users",
        entity_id=staff_user.id,
        user_id=current_user.id,
        organization_id=current_user.organization_id
    )

    return {"message": "Staff user successfully deleted."}
