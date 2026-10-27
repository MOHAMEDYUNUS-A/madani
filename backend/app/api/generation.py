from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from uuid import UUID
from typing import Dict, Any

from app.core.database import get_db
from app.auth.dependencies import get_current_org_staff, verify_tenant_isolation, get_effective_org_id
from app.models.user import User
from app.models.order import GeneratedBatch
from app.schemas.order import GeneratedBatchOut, GeneratedBatchCreate
from app.services.pdf_generator import PDFGeneratorService
from app.services.audit import AuditService

router = APIRouter(prefix="/api/generation", tags=["PDF Generation Batches"])

@router.post("", response_model=GeneratedBatchOut, status_code=status.HTTP_201_CREATED)
def trigger_generation(
    payload: GeneratedBatchCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_org_staff),
    db: Session = Depends(get_db)
):
    org_id = get_effective_org_id(current_user, db)
    if not org_id:
        raise HTTPException(status_code=400, detail="User does not belong to any organization.")

    # 1. Create Batch database record
    batch = GeneratedBatch(
        organization_id=org_id,
        template_version_id=payload.template_version_id,
        name=payload.name,
        status="Queued",
        progress=0.0,
        generation_config=payload.generation_config,
        created_by=current_user.id
    )
    db.add(batch)
    db.commit()
    db.refresh(batch)

    # 2. Add as a background task to process asynchronously
    background_tasks.add_task(
        PDFGeneratorService.generate_pdf_batch,
        db=db,
        batch_id=batch.id
    )

    AuditService.log(
        db=db,
        action="PDF Generation Queue Triggered",
        entity="generated_batches",
        entity_id=batch.id,
        user_id=current_user.id,
        organization_id=current_user.organization_id,
        new_values={"batch_name": batch.name}
    )

    return batch

@router.get("/{batch_uuid}", response_model=GeneratedBatchOut)
def get_generation_status(
    batch_uuid: UUID,
    current_user: User = Depends(get_current_org_staff),
    db: Session = Depends(get_db)
):
    batch = db.query(GeneratedBatch).filter(GeneratedBatch.id == batch_uuid).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Generation batch not found.")

    verify_tenant_isolation(batch.organization_id, current_user)
    return batch
