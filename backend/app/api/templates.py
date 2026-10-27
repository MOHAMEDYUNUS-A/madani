from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from uuid import UUID
from datetime import datetime

from app.core.database import get_db
from app.auth.dependencies import get_current_org_designer, get_current_org_member, verify_tenant_isolation, get_effective_org_id
from app.models.user import User
from app.models.template import Template, TemplateVersion
from app.models.organization import Organization
from app.schemas.template import TemplateOut, TemplateCreate, TemplateUpdate, TemplateVersionOut, TemplateVersionCreate
from app.services.audit import AuditService

router = APIRouter(prefix="/api/templates", tags=["Template Management & Designer"])

@router.get("", response_model=List[TemplateOut])
def list_templates(
    current_user: User = Depends(get_current_org_member),
    db: Session = Depends(get_db)
):
    org_id = get_effective_org_id(current_user, db)
    # Fetch global read-only templates (where organization_id IS NULL) + tenant-owned templates
    templates = db.query(Template).filter(
        (Template.organization_id == None) | 
        (Template.organization_id == org_id),
        Template.deleted_at == None
    ).all()
    return templates

@router.post("", response_model=TemplateOut, status_code=status.HTTP_201_CREATED)
def create_template(
    payload: TemplateCreate,
    current_user: User = Depends(get_current_org_designer),
    db: Session = Depends(get_db)
):
    org_id = get_effective_org_id(current_user, db)
    if not org_id:
        raise HTTPException(status_code=400, detail="User does not belong to any organization.")

    # 1. Create base template
    template = Template(
        organization_id=org_id,
        name=payload.name,
        category=payload.category,
        card_width=payload.card_width,
        card_height=payload.card_height,
        unit=payload.unit,
        orientation=payload.orientation,
        is_published=False,
        is_locked=False
    )
    db.add(template)
    db.commit()
    db.refresh(template)

    # 2. Create version 1 layout
    version = TemplateVersion(
        template_id=template.id,
        version_number=1,
        layout_data=payload.layout_data,
        created_by=current_user.id
    )
    db.add(version)
    db.commit()
    db.refresh(template)

    AuditService.log(
        db=db,
        action="Template Created",
        entity="templates",
        entity_id=template.id,
        user_id=current_user.id,
        organization_id=current_user.organization_id,
        new_values={"name": template.name, "dimensions": f"{template.card_width}x{template.card_height} {template.unit}"}
    )

    return template

@router.get("/{template_uuid}", response_model=TemplateOut)
def get_template(
    template_uuid: UUID,
    current_user: User = Depends(get_current_org_member),
    db: Session = Depends(get_db)
):
    template = db.query(Template).filter(
        Template.id == template_uuid,
        Template.deleted_at == None
    ).first()

    if not template:
        raise HTTPException(status_code=404, detail="Template not found.")

    # Check Tenant Authorization (Global templates have organization_id=None, anyone can see them)
    if template.organization_id is not None:
        verify_tenant_isolation(template.organization_id, current_user)

    return template

@router.patch("/{template_uuid}", response_model=TemplateOut)
def update_template(
    template_uuid: UUID,
    payload: TemplateUpdate,
    current_user: User = Depends(get_current_org_designer),
    db: Session = Depends(get_db)
):
    template = db.query(Template).filter(
        Template.id == template_uuid,
        Template.deleted_at == None
    ).first()

    if not template:
        raise HTTPException(status_code=404, detail="Template not found.")

    if template.organization_id is None:
        raise HTTPException(status_code=403, detail="Global base templates are read-only.")

    verify_tenant_isolation(template.organization_id, current_user)
    
    if template.is_locked:
        raise HTTPException(status_code=400, detail="Template is locked. Unlock it in settings first.")

    old_vals = {c.name: getattr(template, c.name) for c in template.__table__.columns}

    # Update metadata fields
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(template, key, value)

    db.commit()
    db.refresh(template)

    new_vals = {c.name: getattr(template, c.name) for c in template.__table__.columns}
    AuditService.log(
        db=db,
        action="Template Metadata Updated",
        entity="templates",
        entity_id=template.id,
        user_id=current_user.id,
        organization_id=current_user.organization_id,
        old_values=old_vals,
        new_values=new_vals
    )

    return template

@router.post("/{template_uuid}/duplicate", response_model=TemplateOut)
def duplicate_template(
    template_uuid: UUID,
    name_suffix: str = " Copy",
    current_user: User = Depends(get_current_org_designer),
    db: Session = Depends(get_db)
):
    """
    Copies a template (either global or from own tenant) into the organization workspace
    to allow custom styling.
    """
    source_template = db.query(Template).filter(
        Template.id == template_uuid,
        Template.deleted_at == None
    ).first()

    if not source_template:
        raise HTTPException(status_code=404, detail="Source template not found.")

    # Check permission if it's from another tenant (must be global template)
    if source_template.organization_id is not None:
        verify_tenant_isolation(source_template.organization_id, current_user)

    # Fetch latest version
    latest_version = db.query(TemplateVersion).filter(
        TemplateVersion.template_id == source_template.id
    ).order_by(TemplateVersion.version_number.desc()).first()

    if not latest_version:
        raise HTTPException(status_code=400, detail="Source template has no layout configuration versions.")

    # 1. Create duplicate metadata
    new_template = Template(
        organization_id=current_user.organization_id,
        name=f"{source_template.name}{name_suffix}",
        category=source_template.category,
        card_width=source_template.card_width,
        card_height=source_template.card_height,
        unit=source_template.unit,
        orientation=source_template.orientation,
        is_published=False,
        is_locked=False
    )
    db.add(new_template)
    db.commit()
    db.refresh(new_template)

    # 2. Duplicate layout
    new_version = TemplateVersion(
        template_id=new_template.id,
        version_number=1,
        layout_data=latest_version.layout_data,
        created_by=current_user.id
    )
    db.add(new_version)
    db.commit()
    db.refresh(new_template)

    AuditService.log(
        db=db,
        action="Template Duplicated",
        entity="templates",
        entity_id=new_template.id,
        user_id=current_user.id,
        organization_id=current_user.organization_id,
        new_values={"source_template_id": str(source_template.id), "new_name": new_template.name}
    )

    return new_template

@router.post("/{template_uuid}/version", response_model=TemplateVersionOut)
def save_template_version(
    template_uuid: UUID,
    payload: TemplateVersionCreate,
    current_user: User = Depends(get_current_org_designer),
    db: Session = Depends(get_db)
):
    template = db.query(Template).filter(
        Template.id == template_uuid,
        Template.deleted_at == None
    ).first()

    if not template:
        raise HTTPException(status_code=404, detail="Template not found.")

    if template.organization_id is None:
        raise HTTPException(status_code=403, detail="Cannot create version changes on global read-only templates.")

    verify_tenant_isolation(template.organization_id, current_user)
    
    if template.is_locked:
        raise HTTPException(status_code=400, detail="Template is locked.")

    # Get max version count
    max_ver = db.query(TemplateVersion).filter(
        TemplateVersion.template_id == template.id
    ).order_by(TemplateVersion.version_number.desc()).first()

    next_ver_num = (max_ver.version_number + 1) if max_ver else 1

    # Create new version
    version = TemplateVersion(
        template_id=template.id,
        version_number=next_ver_num,
        layout_data=payload.layout_data,
        created_by=current_user.id
    )
    db.add(version)
    db.commit()
    db.refresh(version)

    AuditService.log(
        db=db,
        action="Template Version Created",
        entity="template_versions",
        entity_id=version.id,
        user_id=current_user.id,
        organization_id=current_user.organization_id,
        new_values={"version_number": next_ver_num}
    )

    return version
