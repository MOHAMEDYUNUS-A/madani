from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel

from app.core.database import get_db
from app.auth.dependencies import get_current_user, verify_tenant_isolation
from app.models.user import User
from app.models.organization import Organization
from app.models.design import DesignProject, DesignVariation, DesignApproval
from app.models.template import Template, TemplateVersion
from app.services.audit import AuditService

router = APIRouter(prefix="/api/design/projects", tags=["Design Projects & Approvals"])

class DesignProjectCreate(BaseModel):
    organization_id: UUID
    name: str
    brief: Optional[str] = None
    card_category: Optional[str] = "School"
    card_width: Optional[float] = 3.375
    card_height: Optional[float] = 2.125
    orientation: Optional[str] = "Landscape"
    has_back_side: Optional[bool] = True
    initial_variations: Optional[List[Dict[str, Any]]] = None

class DesignApprovalRequest(BaseModel):
    variation_id: UUID
    decision: str # "Approved" or "Revision_Requested"
    comments: Optional[str] = None

@router.post("", status_code=status.HTTP_201_CREATED)
def create_design_project(
    payload: DesignProjectCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    verify_tenant_isolation(payload.organization_id, current_user, db)

    user_roles = [r.name for r in current_user.roles]
    if "VENDOR" not in user_roles and "SUPER_ADMIN" not in user_roles and "DESIGNER" not in user_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Design creation is restricted to Vendors. Organizations review and approve designs."
        )

    project = DesignProject(
        organization_id=payload.organization_id,
        vendor_id=current_user.vendor_id,
        name=payload.name,
        brief=payload.brief,
        card_category=payload.card_category,
        card_width=payload.card_width,
        card_height=payload.card_height,
        orientation=payload.orientation,
        has_back_side=payload.has_back_side,
        status="Draft",
        created_by=current_user.id
    )
    db.add(project)
    db.commit()
    db.refresh(project)

    # Save initial generated variations if provided
    if payload.initial_variations:
        for idx, var in enumerate(payload.initial_variations):
            variation = DesignVariation(
                project_id=project.id,
                variation_name=var.get("variation_name", f"Variation {idx+1}"),
                style_family=var.get("style_family", "custom"),
                layout_data={"front": var.get("front", {}), "back": var.get("back", {})},
                quality_score=var.get("quality_score", 100.0),
                quality_report=var.get("quality_report", {}),
                is_selected=(idx == 0)
            )
            db.add(variation)
        db.commit()
        db.refresh(project)

    return {
        "id": str(project.id),
        "name": project.name,
        "status": project.status,
        "variations_count": len(project.variations)
    }

@router.get("")
def list_design_projects(
    organization_id: Optional[UUID] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(DesignProject)
    if organization_id:
        verify_tenant_isolation(organization_id, current_user, db)
        query = query.filter(DesignProject.organization_id == organization_id)
    elif current_user.vendor_id:
        query = query.filter(DesignProject.vendor_id == current_user.vendor_id)
    elif current_user.organization_id:
        query = query.filter(DesignProject.organization_id == current_user.organization_id)
    else:
        user_roles = [r.name for r in current_user.roles]
        if "SUPER_ADMIN" not in user_roles:
            raise HTTPException(status_code=403, detail="Unauthorized")

    projects = query.order_by(DesignProject.created_at.desc()).all()
    return [
        {
            "id": str(p.id),
            "organization_id": str(p.organization_id),
            "name": p.name,
            "card_category": p.card_category,
            "orientation": p.orientation,
            "status": p.status,
            "variations_count": len(p.variations),
            "created_at": p.created_at
        }
        for p in projects
    ]

@router.get("/{project_uuid}")
def get_design_project(
    project_uuid: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    project = db.query(DesignProject).filter(DesignProject.id == project_uuid).first()
    if not project:
        raise HTTPException(status_code=404, detail="Design project not found.")

    verify_tenant_isolation(project.organization_id, current_user, db)

    variations = [
        {
            "id": str(v.id),
            "variation_name": v.variation_name,
            "style_family": v.style_family,
            "layout_data": v.layout_data,
            "quality_score": float(v.quality_score) if v.quality_score else 100.0,
            "quality_report": v.quality_report,
            "is_selected": v.is_selected,
            "created_at": v.created_at
        }
        for v in project.variations
    ]

    approvals = [
        {
            "id": str(a.id),
            "decision": a.decision,
            "comments": a.comments,
            "approved_at": a.created_at
        }
        for a in project.approvals
    ]

    return {
        "id": str(project.id),
        "organization_id": str(project.organization_id),
        "vendor_id": str(project.vendor_id) if project.vendor_id else None,
        "name": project.name,
        "brief": project.brief,
        "card_category": project.card_category,
        "card_width": float(project.card_width),
        "card_height": float(project.card_height),
        "orientation": project.orientation,
        "status": project.status,
        "variations": variations,
        "approvals": approvals,
        "created_at": project.created_at
    }

@router.post("/{project_uuid}/submit")
def submit_design_to_organization(
    project_uuid: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Vendor submits the selected design variation to the Organization Admin for review."""
    project = db.query(DesignProject).filter(DesignProject.id == project_uuid).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    verify_tenant_isolation(project.organization_id, current_user, db)

    project.status = "Proposed"
    db.commit()

    AuditService.log(
        db=db,
        action="Design Submitted to Organization",
        entity="design_projects",
        entity_id=project.id,
        user_id=current_user.id,
        organization_id=project.organization_id
    )

    return {"message": "Design proposal submitted to organization for approval.", "status": project.status}

@router.post("/{project_uuid}/review")
def review_design_project(
    project_uuid: UUID,
    payload: DesignApprovalRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Organization Admin reviews design proposal:
    - If Approved: Creates an immutable Template & TemplateVersion snapshot and locks it.
    - If Revision_Requested: Records itemized comments for vendor refinement.
    """
    project = db.query(DesignProject).filter(DesignProject.id == project_uuid).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    verify_tenant_isolation(project.organization_id, current_user, db)

    user_roles = [r.name for r in current_user.roles]
    if "ORGANIZATION_ADMIN" not in user_roles and "STAFF_ADMIN" not in user_roles and "SUPER_ADMIN" not in user_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Organization Admins can approve or request revisions on designs."
        )

    variation = db.query(DesignVariation).filter(
        DesignVariation.id == payload.variation_id,
        DesignVariation.project_id == project.id
    ).first()
    if not variation:
        raise HTTPException(status_code=404, detail="Selected variation not found.")

    if payload.decision == "Approved":
        project.status = "Approved"
        
        # 1. Create an immutable Template record
        template = Template(
            organization_id=project.organization_id,
            name=f"{project.name} - Approved Design",
            category=project.card_category,
            card_width=project.card_width,
            card_height=project.card_height,
            unit="in",
            orientation=project.orientation,
            is_published=True,
            is_locked=True # Immutable
        )
        db.add(template)
        db.commit()
        db.refresh(template)

        # 2. Freeze layout snapshot
        version = TemplateVersion(
            template_id=template.id,
            version_number=1,
            layout_data=variation.layout_data,
            created_by=current_user.id
        )
        db.add(version)

        # 3. Record DesignApproval with immutable snapshot
        approval = DesignApproval(
            project_id=project.id,
            variation_id=variation.id,
            decision="Approved",
            comments=payload.comments,
            approved_by=current_user.id,
            immutable_layout_snapshot=variation.layout_data
        )
        db.add(approval)
        db.commit()

        AuditService.log(
            db=db,
            action="Design Approved & Immutable Template Locked",
            entity="design_projects",
            entity_id=project.id,
            user_id=current_user.id,
            organization_id=project.organization_id,
            new_values={"template_id": str(template.id)}
        )

        return {
            "status": "Approved",
            "message": "Design approved and locked as official organization template.",
            "template_id": str(template.id)
        }
    else:
        project.status = "Revision_Requested"
        approval = DesignApproval(
            project_id=project.id,
            variation_id=variation.id,
            decision="Revision_Requested",
            comments=payload.comments,
            approved_by=current_user.id
        )
        db.add(approval)
        db.commit()

        AuditService.log(
            db=db,
            action="Design Revision Requested",
            entity="design_projects",
            entity_id=project.id,
            user_id=current_user.id,
            organization_id=project.organization_id,
            new_values={"comments": payload.comments}
        )

        return {
            "status": "Revision_Requested",
            "message": "Revision request recorded with feedback for vendor."
        }
