from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from uuid import UUID
from pydantic import BaseModel

from app.core.database import get_db
from app.auth.dependencies import get_current_user, verify_tenant_isolation
from app.models.user import User
from app.models.organization import Organization
from app.models.design import BrandKit, DesignProject, DesignVariation
from app.services.ai.orchestrator import AIDesignOrchestrator, PrintQualityAgent

router = APIRouter(prefix="/api/ai/design", tags=["AI Design Studio Engine"])

class GenerateVariationsRequest(BaseModel):
    organization_id: UUID
    brief: str
    category: Optional[str] = "School" # School, Corporate, Hospital, Industrial, Membership
    orientation: Optional[str] = "Landscape" # Landscape, Portrait
    card_width: Optional[float] = 3.375
    card_height: Optional[float] = 2.125
    brand_colors: Optional[Dict[str, str]] = None

class ChatRefineRequest(BaseModel):
    organization_id: UUID
    current_layout: Dict[str, Any]
    user_command: str

class QualityCheckRequest(BaseModel):
    layout: Dict[str, Any]
    card_width: Optional[float] = 3.375
    card_height: Optional[float] = 2.125

@router.post("/generate")
def generate_design_variations(
    payload: GenerateVariationsRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    verify_tenant_isolation(payload.organization_id, current_user, db)
    
    user_roles = [r.name for r in current_user.roles]
    if "VENDOR" not in user_roles and "SUPER_ADMIN" not in user_roles and "DESIGNER" not in user_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Design creation and AI tools are restricted to Vendors. Organizations review and approve designs."
        )

    # Retrieve BrandKit if present
    brand = db.query(BrandKit).filter(BrandKit.organization_id == payload.organization_id).first()
    brand_dict = payload.brand_colors or {}
    if brand and not brand_dict:
        brand_dict = {
            "primary": brand.primary_color,
            "secondary": brand.secondary_color,
            "accent": brand.accent_color,
            "background": brand.background_color,
            "text": brand.text_color
        }

    orchestrator = AIDesignOrchestrator()
    try:
        variations = orchestrator.generate_variations(
            db=db,
            organization_id=payload.organization_id,
            vendor_id=current_user.vendor_id,
            brief=payload.brief,
            category=payload.category,
            orientation=payload.orientation,
            card_width=payload.card_width,
            card_height=payload.card_height,
            brand_colors=brand_dict
        )
    except ValueError as ve:
        raise HTTPException(status_code=402, detail=str(ve))

    return {
        "status": "success",
        "count": len(variations),
        "variations": variations
    }

@router.post("/chat-refine")
def chat_to_canvas_refinement(
    payload: ChatRefineRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    verify_tenant_isolation(payload.organization_id, current_user, db)

    user_roles = [r.name for r in current_user.roles]
    if "VENDOR" not in user_roles and "SUPER_ADMIN" not in user_roles and "DESIGNER" not in user_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Design mutation tools are restricted to Vendors."
        )

    orchestrator = AIDesignOrchestrator()
    result = orchestrator.execute_chat_to_canvas(
        db=db,
        current_layout=payload.current_layout,
        user_command=payload.user_command,
        organization_id=payload.organization_id,
        vendor_id=current_user.vendor_id
    )

    return result

@router.post("/quality-check")
def run_print_quality_check(payload: QualityCheckRequest):
    audit = PrintQualityAgent.audit_layout(
        layout=payload.layout,
        card_w=payload.card_width,
        card_h=payload.card_height
    )
    return audit
