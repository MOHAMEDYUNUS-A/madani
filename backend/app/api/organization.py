from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from uuid import UUID

from app.core.database import get_db
from app.auth.dependencies import get_current_org_admin, verify_tenant_isolation, get_current_org_member
from app.models.user import User
from app.models.organization import Organization, OrganizationBranding
from app.schemas.organization import OrganizationOut, OrganizationUpdate, BrandingOut, BrandingUpdate
from app.services.storage import StorageService
from app.services.audit import AuditService

router = APIRouter(prefix="/api/organization", tags=["Organization Management"])

@router.get("", response_model=OrganizationOut)
def get_my_organization(
    current_user: User = Depends(get_current_org_member),
    db: Session = Depends(get_db)
):
    if not current_user.organization_id:
        raise HTTPException(status_code=400, detail="User does not belong to any organization.")
        
    organization = db.query(Organization).filter(
        Organization.id == current_user.organization_id,
        Organization.deleted_at == None
    ).first()
    
    if not organization:
        raise HTTPException(status_code=404, detail="Organization not found.")
        
    return organization

@router.patch("", response_model=OrganizationOut)
def update_my_organization(
    payload: OrganizationUpdate,
    current_user: User = Depends(get_current_org_admin),
    db: Session = Depends(get_db)
):
    if not current_user.organization_id:
        raise HTTPException(status_code=400, detail="User does not belong to any organization.")
        
    organization = db.query(Organization).filter(
        Organization.id == current_user.organization_id,
        Organization.deleted_at == None
    ).first()
    
    if not organization:
        raise HTTPException(status_code=404, detail="Organization not found.")

    old_vals = {c.name: getattr(organization, c.name) for c in organization.__table__.columns}
    
    # Update fields
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(organization, key, value)
        
    db.commit()
    db.refresh(organization)

    new_vals = {c.name: getattr(organization, c.name) for c in organization.__table__.columns}
    AuditService.log(
        db=db,
        action="Organization Updated",
        entity="organizations",
        entity_id=organization.id,
        user_id=current_user.id,
        organization_id=organization.id,
        old_values=old_vals,
        new_values=new_vals
    )

    return organization

@router.get("/branding", response_model=BrandingOut)
def get_my_branding(
    current_user: User = Depends(get_current_org_member),
    db: Session = Depends(get_db)
):
    if not current_user.organization_id:
        raise HTTPException(status_code=400, detail="User does not belong to any organization.")
        
    branding = db.query(OrganizationBranding).filter(
        OrganizationBranding.organization_id == current_user.organization_id
    ).first()
    
    if not branding:
        raise HTTPException(status_code=404, detail="Branding configurations not found.")
        
    return branding

@router.patch("/branding", response_model=BrandingOut)
def update_my_branding(
    payload: BrandingUpdate,
    current_user: User = Depends(get_current_org_admin),
    db: Session = Depends(get_db)
):
    if not current_user.organization_id:
        raise HTTPException(status_code=400, detail="User does not belong to any organization.")
        
    branding = db.query(OrganizationBranding).filter(
        OrganizationBranding.organization_id == current_user.organization_id
    ).first()
    
    if not branding:
        raise HTTPException(status_code=404, detail="Branding configurations not found.")

    old_vals = {c.name: getattr(branding, c.name) for c in branding.__table__.columns}
    
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(branding, key, value)
        
    db.commit()
    db.refresh(branding)

    new_vals = {c.name: getattr(branding, c.name) for c in branding.__table__.columns}
    AuditService.log(
        db=db,
        action="Branding Updated",
        entity="organization_branding",
        entity_id=branding.id,
        user_id=current_user.id,
        organization_id=current_user.organization_id,
        old_values=old_vals,
        new_values=new_vals
    )

    return branding

@router.post("/branding/logo", response_model=BrandingOut)
def upload_branding_logo(
    logo_type: str, # "primary" or "secondary" or "favicon"
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_org_admin),
    db: Session = Depends(get_db)
):
    if not current_user.organization_id:
        raise HTTPException(status_code=400, detail="User does not belong to any organization.")
        
    if logo_type not in ["primary", "secondary", "favicon"]:
        raise HTTPException(status_code=400, detail="Invalid logo_type. Must be 'primary', 'secondary' or 'favicon'.")
        
    organization = db.query(Organization).filter(Organization.id == current_user.organization_id).first()
    branding = db.query(OrganizationBranding).filter(OrganizationBranding.organization_id == current_user.organization_id).first()
    
    if not branding:
        raise HTTPException(status_code=404, detail="Branding configurations not found.")

    # Save to storage
    file_url = StorageService.save_generic_file(
        file=file,
        org_id=organization.org_id,
        subfolder="branding"
    )

    # Clean old file if it exists
    old_file_url = None
    if logo_type == "primary" and branding.primary_logo:
        old_file_url = branding.primary_logo
        branding.primary_logo = file_url
    elif logo_type == "secondary" and branding.secondary_logo:
        old_file_url = branding.secondary_logo
        branding.secondary_logo = file_url
    elif logo_type == "favicon" and branding.favicon:
        old_file_url = branding.favicon
        branding.favicon = file_url
    else:
        if logo_type == "primary": branding.primary_logo = file_url
        elif logo_type == "secondary": branding.secondary_logo = file_url
        elif logo_type == "favicon": branding.favicon = file_url

    if old_file_url:
        StorageService.delete_file(old_file_url)

    db.commit()
    db.refresh(branding)

    AuditService.log(
        db=db,
        action=f"Branding Logo Uploaded: {logo_type}",
        entity="organization_branding",
        entity_id=branding.id,
        user_id=current_user.id,
        organization_id=current_user.organization_id,
        new_values={"logo_type": logo_type, "url": file_url}
    )

    return branding

# -------------------------------------------------------------
# Class & Section Management
# -------------------------------------------------------------
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from app.models.organization import OrganizationClass
from app.models.member import Member

class ClassCreate(BaseModel):
    name: str # e.g. "Grade 1-A", "LKG-B", "CSE-3"
    section: Optional[str] = None
    description: Optional[str] = None

class ClassUpdate(BaseModel):
    name: Optional[str] = None
    section: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

@router.get("/classes", response_model=List[Dict[str, Any]])
def list_classes(
    current_user: User = Depends(get_current_org_member),
    db: Session = Depends(get_db)
):
    if not current_user.organization_id:
        raise HTTPException(status_code=400, detail="User does not belong to any organization.")

    classes = db.query(OrganizationClass).filter(
        OrganizationClass.organization_id == current_user.organization_id
    ).order_by(OrganizationClass.name.asc()).all()

    # Also discover any distinct class names already present in members that haven't been added to organization_classes yet
    existing_names = {c.name for c in classes}
    member_classes = db.query(Member.class_name).filter(
        Member.organization_id == current_user.organization_id,
        Member.deleted_at == None,
        Member.class_name != None
    ).distinct().all()

    for (mc_name,) in member_classes:
        if mc_name and mc_name not in existing_names:
            new_cls = OrganizationClass(
                organization_id=current_user.organization_id,
                name=mc_name,
                is_active=True
            )
            db.add(new_cls)
            classes.append(new_cls)
            existing_names.add(mc_name)
    db.commit()

    # Re-fetch or calculate metrics
    out = []
    for c in classes:
        student_count = db.query(Member).filter(
            Member.organization_id == current_user.organization_id,
            Member.class_name == c.name,
            Member.deleted_at == None
        ).count()

        assigned_staff_users = db.query(User.full_name).filter(
            User.organization_id == current_user.organization_id,
            User.assigned_class == c.name,
            User.deleted_at == None
        ).all()
        assigned_staff = [u[0] for u in assigned_staff_users]

        out.append({
            "id": str(c.id),
            "name": c.name,
            "section": c.section,
            "description": c.description,
            "is_active": c.is_active,
            "student_count": student_count,
            "assigned_staff": assigned_staff,
            "created_at": c.created_at
        })

    return out

@router.post("/classes", status_code=status.HTTP_201_CREATED)
def create_class(
    payload: ClassCreate,
    current_user: User = Depends(get_current_org_admin),
    db: Session = Depends(get_db)
):
    if not current_user.organization_id:
        raise HTTPException(status_code=400, detail="User does not belong to any organization.")

    existing = db.query(OrganizationClass).filter(
        OrganizationClass.organization_id == current_user.organization_id,
        OrganizationClass.name == payload.name.strip()
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail=f"Class '{payload.name}' already exists in your organization.")

    new_class = OrganizationClass(
        organization_id=current_user.organization_id,
        name=payload.name.strip(),
        section=payload.section.strip() if payload.section else None,
        description=payload.description,
        is_active=True
    )
    db.add(new_class)
    db.commit()
    db.refresh(new_class)

    AuditService.log(
        db=db,
        action="Class Created",
        entity="organization_classes",
        entity_id=new_class.id,
        user_id=current_user.id,
        organization_id=current_user.organization_id,
        new_values={"name": new_class.name, "section": new_class.section}
    )

    return {
        "id": str(new_class.id),
        "name": new_class.name,
        "section": new_class.section,
        "description": new_class.description,
        "is_active": new_class.is_active,
        "student_count": 0,
        "assigned_staff": [],
        "created_at": new_class.created_at
    }

@router.patch("/classes/{class_id}")
def update_class(
    class_id: UUID,
    payload: ClassUpdate,
    current_user: User = Depends(get_current_org_admin),
    db: Session = Depends(get_db)
):
    cls = db.query(OrganizationClass).filter(
        OrganizationClass.id == class_id,
        OrganizationClass.organization_id == current_user.organization_id
    ).first()

    if not cls:
        raise HTTPException(status_code=404, detail="Class not found.")

    old_name = cls.name
    if payload.name and payload.name.strip() != old_name:
        # Check duplicate
        dup = db.query(OrganizationClass).filter(
            OrganizationClass.organization_id == current_user.organization_id,
            OrganizationClass.name == payload.name.strip(),
            OrganizationClass.id != class_id
        ).first()
        if dup:
            raise HTTPException(status_code=400, detail=f"Class name '{payload.name}' already in use.")

        # Also rename class in members and staff assigned to it
        db.query(Member).filter(
            Member.organization_id == current_user.organization_id,
            Member.class_name == old_name
        ).update({"class_name": payload.name.strip()})

        db.query(User).filter(
            User.organization_id == current_user.organization_id,
            User.assigned_class == old_name
        ).update({"assigned_class": payload.name.strip()})

        cls.name = payload.name.strip()

    if payload.section is not None:
        cls.section = payload.section.strip() if payload.section else None
    if payload.description is not None:
        cls.description = payload.description
    if payload.is_active is not None:
        cls.is_active = payload.is_active

    db.commit()
    db.refresh(cls)

    return {
        "id": str(cls.id),
        "name": cls.name,
        "section": cls.section,
        "description": cls.description,
        "is_active": cls.is_active,
        "created_at": cls.created_at
    }

@router.delete("/classes/{class_id}")
def delete_class(
    class_id: UUID,
    current_user: User = Depends(get_current_org_admin),
    db: Session = Depends(get_db)
):
    cls = db.query(OrganizationClass).filter(
        OrganizationClass.id == class_id,
        OrganizationClass.organization_id == current_user.organization_id
    ).first()

    if not cls:
        raise HTTPException(status_code=404, detail="Class not found.")

    # Check if students are currently enrolled in this class
    count = db.query(Member).filter(
        Member.organization_id == current_user.organization_id,
        Member.class_name == cls.name,
        Member.deleted_at == None
    ).count()

    if count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete class '{cls.name}' because {count} active student record(s) are assigned to it. Reassign or archive the students first."
        )

    db.delete(cls)
    db.commit()

    return {"message": f"Class '{cls.name}' successfully deleted."}

