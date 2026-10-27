from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse, Response
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel

from app.core.database import get_db
from app.auth.dependencies import (
    get_current_user, 
    get_current_active_admin, 
    verify_tenant_isolation, 
    verify_vendor_isolation
)
from app.models.user import User
from app.models.organization import Organization
from app.models.member import Member
from app.models.template import Template, TemplateVersion
from app.models.production import (
    BatchSnapshot, 
    PrintJob, 
    PrintJobEvent, 
    QualityControlCheck, 
    DispatchRecord
)
from app.services.audit import AuditService

router = APIRouter(prefix="/api/production", tags=["Print Production & Fulfillment"])

class CreateBatchSnapshotRequest(BaseModel):
    organization_id: UUID
    template_version_id: UUID
    batch_name: str
    print_settings: Optional[Dict[str, Any]] = None # Paper size, margin, bleed, crop marks

class SubmitPrintJobRequest(BaseModel):
    batch_snapshot_id: UUID
    card_material: Optional[str] = "Standard PVC (30 mil)"
    lamination_type: Optional[str] = "Glossy UV"
    accessories: Optional[Dict[str, Any]] = None
    delivery_recipient: str
    delivery_phone: str
    delivery_address: str
    delivery_city: str
    delivery_state: str
    delivery_pincode: str
    requested_delivery_date: Optional[datetime] = None

class UpdateJobStatusRequest(BaseModel):
    status: str
    reason: Optional[str] = None
    quotation_amount: Optional[float] = None
    production_notes: Optional[str] = None

class QualityCheckCreate(BaseModel):
    check_name: str
    passed: bool
    notes: Optional[str] = None

class DispatchCreate(BaseModel):
    courier_name: str
    tracking_number: str
    tracking_url: Optional[str] = None
    expected_delivery_date: Optional[datetime] = None

def get_next_job_id(db: Session) -> str:
    count = db.query(PrintJob).count()
    year = datetime.utcnow().year
    return f"MAD-JOB-{year}-{count + 1:06d}"

VALID_STATUS_TRANSITIONS = {
    "Draft": ["Awaiting Review", "Cancelled"],
    "Awaiting Review": ["Revision Required", "Quotation Pending", "Approved for Production", "Cancelled"],
    "Revision Required": ["Awaiting Review", "Cancelled"],
    "Quotation Pending": ["Awaiting Payment", "Approved for Production", "Cancelled"],
    "Awaiting Payment": ["Approved for Production", "Cancelled"],
    "Approved for Production": ["Queued", "Cancelled"],
    "Queued": ["Printing", "Cancelled"],
    "Printing": ["Quality Check", "Rework Required"],
    "Quality Check": ["Packed", "Rework Required"],
    "Rework Required": ["Printing", "Cancelled"],
    "Packed": ["Dispatched"],
    "Dispatched": ["Delivered"],
    "Delivered": ["Completed"],
    "Completed": [],
    "Cancelled": []
}

@router.post("/batch-snapshots", status_code=status.HTTP_201_CREATED)
def create_batch_snapshot(
    payload: CreateBatchSnapshotRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Organization Admin / Staff creates an immutable batch snapshot:
    Freezes approved template layout AND all student/member records currently approved.
    Subsequent changes to members or templates will NOT alter this snapshot!
    """
    verify_tenant_isolation(payload.organization_id, current_user, db)

    version = db.query(TemplateVersion).filter(TemplateVersion.id == payload.template_version_id).first()
    if not version:
        raise HTTPException(status_code=404, detail="Template version not found.")

    # Fetch approved student records for this organization
    members = db.query(Member).filter(
        Member.organization_id == payload.organization_id,
        Member.deleted_at == None,
        Member.status == "APPROVED"
    ).all()

    if not members:
        # Fallback to active members if not using strict approval gate
        members = db.query(Member).filter(
            Member.organization_id == payload.organization_id,
            Member.deleted_at == None
        ).limit(100).all()

    if not members:
        raise HTTPException(status_code=400, detail="Cannot snapshot an empty batch. Add students/members first.")

    # Freeze records data
    frozen_records = [
        {
            "id": str(m.id),
            "member_id": m.member_id,
            "name": m.name,
            "dob": str(m.dob) if m.dob else "",
            "gender": m.gender or "",
            "blood_group": m.blood_group or "",
            "designation": m.designation or "",
            "class_name": m.class_name or "",
            "section": m.section or "",
            "academic_year": m.academic_year or "",
            "phone": m.phone or "",
            "email": m.email or "",
            "photo_url": m.photo_url or ""
        }
        for m in members
    ]

    # Calculate class breakdown and photo stats
    class_breakdown = {}
    missing_photos = 0
    for r in frozen_records:
        c_name = r.get("class_name") or "Unassigned"
        class_breakdown[c_name] = class_breakdown.get(c_name, 0) + 1
        if not r.get("photo_url"):
            missing_photos += 1

    settings_dict = payload.print_settings or {"imposition": "duplex", "crop_marks": True, "bleed": 2.0}
    settings_dict["class_breakdown"] = class_breakdown
    settings_dict["missing_photos_count"] = missing_photos

    snapshot = BatchSnapshot(
        organization_id=payload.organization_id,
        vendor_id=current_user.vendor_id,
        batch_name=payload.batch_name,
        template_version_id=payload.template_version_id,
        frozen_template_layout=version.layout_data,
        frozen_records_data=frozen_records,
        card_count=len(frozen_records),
        card_width=version.template.card_width if version.template else 3.375,
        card_height=version.template.card_height if version.template else 2.125,
        orientation=version.template.orientation if version.template else "Landscape",
        print_settings=settings_dict,
        approved_by=current_user.id,
        is_locked=True
    )
    db.add(snapshot)
    db.commit()
    db.refresh(snapshot)

    AuditService.log(
        db=db,
        action="Immutable Batch Snapshot Approved & Created",
        entity="batch_snapshots",
        entity_id=snapshot.id,
        user_id=current_user.id,
        organization_id=payload.organization_id,
        new_values={"count": snapshot.card_count, "name": snapshot.batch_name, "class_breakdown": class_breakdown}
    )

    return {
        "id": str(snapshot.id),
        "batch_name": snapshot.batch_name,
        "card_count": snapshot.card_count,
        "class_breakdown": class_breakdown,
        "missing_photos": missing_photos,
        "is_locked": snapshot.is_locked,
        "created_at": snapshot.created_at
    }

@router.get("/batch-snapshots")
def list_batch_snapshots(
    organization_id: Optional[UUID] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(BatchSnapshot)
    user_roles = [r.name for r in current_user.roles]

    if "SUPER_ADMIN" in user_roles:
        if organization_id:
            query = query.filter(BatchSnapshot.organization_id == organization_id)
    elif "VENDOR" in user_roles and current_user.vendor_id:
        if organization_id:
            verify_tenant_isolation(organization_id, current_user, db)
            query = query.filter(BatchSnapshot.organization_id == organization_id)
        else:
            query = query.filter(
                (BatchSnapshot.vendor_id == current_user.vendor_id) |
                (BatchSnapshot.organization_id.in_(
                    db.query(Organization.id).filter(Organization.vendor_id == current_user.vendor_id)
                ))
            )
    elif current_user.organization_id:
        query = query.filter(BatchSnapshot.organization_id == current_user.organization_id)
    else:
        raise HTTPException(status_code=403, detail="Unauthorized")

    snapshots = query.order_by(BatchSnapshot.created_at.desc()).all()
    out = []
    for s in snapshots:
        has_job = db.query(PrintJob).filter(PrintJob.batch_snapshot_id == s.id).first()
        out.append({
            "id": str(s.id),
            "organization_id": str(s.organization_id),
            "organization_name": s.organization.name if s.organization else "Organization",
            "batch_name": s.batch_name,
            "card_count": s.card_count,
            "class_breakdown": (s.print_settings or {}).get("class_breakdown", {}),
            "missing_photos": (s.print_settings or {}).get("missing_photos_count", 0),
            "is_locked": s.is_locked,
            "has_submitted_job": bool(has_job),
            "job_id": has_job.job_id if has_job else None,
            "job_status": has_job.status if has_job else "Awaiting Vendor Validation",
            "approved_at": s.approved_at,
            "created_at": s.created_at
        })
    return out

@router.get("/batch-snapshots/{snapshot_uuid}")
def get_batch_snapshot_details(
    snapshot_uuid: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    snapshot = db.query(BatchSnapshot).filter(BatchSnapshot.id == snapshot_uuid).first()
    if not snapshot:
        raise HTTPException(status_code=404, detail="Batch snapshot not found.")

    verify_tenant_isolation(snapshot.organization_id, current_user, db)

    has_job = db.query(PrintJob).filter(PrintJob.batch_snapshot_id == snapshot.id).first()

    return {
        "id": str(snapshot.id),
        "organization_id": str(snapshot.organization_id),
        "organization_name": snapshot.organization.name if snapshot.organization else "Organization",
        "batch_name": snapshot.batch_name,
        "card_count": snapshot.card_count,
        "card_width": float(snapshot.card_width) if snapshot.card_width else 3.375,
        "card_height": float(snapshot.card_height) if snapshot.card_height else 2.125,
        "orientation": snapshot.orientation,
        "class_breakdown": (snapshot.print_settings or {}).get("class_breakdown", {}),
        "missing_photos": (snapshot.print_settings or {}).get("missing_photos_count", 0),
        "print_settings": snapshot.print_settings,
        "frozen_template_layout": snapshot.frozen_template_layout,
        "records_sample": snapshot.frozen_records_data[:10] if snapshot.frozen_records_data else [],
        "has_submitted_job": bool(has_job),
        "job_id": has_job.job_id if has_job else None,
        "job_status": has_job.status if has_job else "Awaiting Vendor Validation",
        "approved_at": snapshot.approved_at,
        "created_at": snapshot.created_at
    }

@router.post("/jobs", status_code=status.HTTP_201_CREATED)
def submit_print_job(
    payload: SubmitPrintJobRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Vendor validates an organization-approved batch snapshot and submits it to Super Admin for physical print production.
    ORGANIZATION_ADMIN and STAFF are strictly prohibited from submitting physical print jobs directly.
    """
    user_roles = [r.name for r in current_user.roles]
    if "VENDOR" not in user_roles and "SUPER_ADMIN" not in user_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Organizations cannot submit physical print orders directly. Only the assigned Vendor can submit verified batches to Super Admin."
        )

    snapshot = db.query(BatchSnapshot).filter(BatchSnapshot.id == payload.batch_snapshot_id).first()
    if not snapshot:
        raise HTTPException(status_code=404, detail="Batch snapshot not found.")

    verify_tenant_isolation(snapshot.organization_id, current_user, db)

    # Check if a print job already exists for this snapshot
    existing_job = db.query(PrintJob).filter(PrintJob.batch_snapshot_id == snapshot.id).first()
    if existing_job:
        raise HTTPException(
            status_code=400,
            detail=f"A physical print job ({existing_job.job_id}) has already been submitted for this batch snapshot."
        )

    # Quotation calculation
    unit_rate = 22.0
    lamination_rate = 8.0 if payload.lamination_type != "None" else 0.0
    subtotal = snapshot.card_count * (unit_rate + lamination_rate)
    delivery_fee = 150.0
    gst = subtotal * 0.18
    total = round(subtotal + delivery_fee + gst, 2)

    quotation = {
        "unit_rate": unit_rate,
        "lamination_rate": lamination_rate,
        "card_count": snapshot.card_count,
        "subtotal": subtotal,
        "delivery": delivery_fee,
        "gst_18": gst,
        "total": total
    }

    vendor_id = current_user.vendor_id or snapshot.vendor_id
    if not vendor_id:
        # Fallback: get vendor from organization
        org = db.query(Organization).filter(Organization.id == snapshot.organization_id).first()
        vendor_id = org.vendor_id if org else None

    if not vendor_id:
        from app.models.vendor import Vendor
        first_vendor = db.query(Vendor).first()
        if first_vendor:
            vendor_id = first_vendor.id

    if not vendor_id:
        raise HTTPException(status_code=400, detail="Print job requires vendor affiliation.")

    job_id = get_next_job_id(db)
    job = PrintJob(
        job_id=job_id,
        vendor_id=vendor_id,
        organization_id=snapshot.organization_id,
        batch_snapshot_id=snapshot.id,
        status="Awaiting Review",
        quantity=snapshot.card_count,
        card_material=payload.card_material,
        lamination_type=payload.lamination_type,
        accessories=payload.accessories,
        delivery_recipient=payload.delivery_recipient,
        delivery_phone=payload.delivery_phone,
        delivery_address=payload.delivery_address,
        delivery_city=payload.delivery_city,
        delivery_state=payload.delivery_state,
        delivery_pincode=payload.delivery_pincode,
        requested_delivery_date=payload.requested_delivery_date,
        quotation_details=quotation,
        total_amount=total,
        payment_status="Pending"
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    # Log initial status event
    event = PrintJobEvent(
        print_job_id=job.id,
        from_status=None,
        to_status="Awaiting Review",
        changed_by=current_user.id,
        reason="Print job submitted by vendor to centralized production."
    )
    db.add(event)
    db.commit()

    return {
        "id": str(job.id),
        "job_id": job.job_id,
        "status": job.status,
        "quantity": job.quantity,
        "total_amount": float(job.total_amount),
        "created_at": job.created_at
    }

@router.get("/jobs")
def list_print_jobs(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_roles = [r.name for r in current_user.roles]
    if "SUPER_ADMIN" in user_roles or "PRODUCTION_OPERATOR" in user_roles:
        jobs = db.query(PrintJob).order_by(PrintJob.created_at.desc()).all()
    elif "VENDOR" in user_roles and current_user.vendor_id:
        jobs = db.query(PrintJob).filter(PrintJob.vendor_id == current_user.vendor_id).order_by(PrintJob.created_at.desc()).all()
    elif current_user.organization_id:
        jobs = db.query(PrintJob).filter(PrintJob.organization_id == current_user.organization_id).order_by(PrintJob.created_at.desc()).all()
    else:
        raise HTTPException(status_code=403, detail="Unauthorized")

    return [
        {
            "id": str(j.id),
            "job_id": j.job_id,
            "organization_name": j.organization.name if j.organization else "Unknown",
            "quantity": j.quantity,
            "status": j.status,
            "total_amount": float(j.total_amount),
            "payment_status": j.payment_status,
            "created_at": j.created_at
        }
        for j in jobs
    ]

def find_job(job_identifier: str, db: Session) -> PrintJob:
    job = None
    try:
        val = UUID(job_identifier)
        job = db.query(PrintJob).filter(PrintJob.id == val).first()
    except Exception:
        pass
    if not job:
        job = db.query(PrintJob).filter(PrintJob.job_id == job_identifier).first()
    if not job:
        raise HTTPException(status_code=404, detail=f"Print job '{job_identifier}' not found.")
    return job

@router.get("/jobs/{job_identifier}")
def get_print_job(
    job_identifier: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    job = find_job(job_identifier, db)
    user_roles = [r.name for r in current_user.roles]
    if "SUPER_ADMIN" not in user_roles and "PRODUCTION_OPERATOR" not in user_roles:
        if "VENDOR" in user_roles and current_user.vendor_id != job.vendor_id:
            raise HTTPException(status_code=403, detail="Unauthorized")
        elif current_user.organization_id and current_user.organization_id != job.organization_id:
            raise HTTPException(status_code=403, detail="Unauthorized")

    snapshot = job.batch_snapshot
    return {
        "id": str(job.id),
        "job_id": job.job_id,
        "organization_id": str(job.organization_id),
        "organization_name": job.organization.name if job.organization else "Organization",
        "vendor_id": str(job.vendor_id),
        "vendor_name": job.vendor.company_name if job.vendor else "Vendor",
        "batch_snapshot_id": str(job.batch_snapshot_id),
        "batch_name": snapshot.batch_name if snapshot else "Batch",
        "status": job.status,
        "quantity": job.quantity,
        "card_material": job.card_material,
        "lamination_type": job.lamination_type,
        "accessories": job.accessories,
        "delivery_recipient": job.delivery_recipient,
        "delivery_phone": job.delivery_phone,
        "delivery_address": job.delivery_address,
        "delivery_city": job.delivery_city,
        "delivery_state": job.delivery_state,
        "delivery_pincode": job.delivery_pincode,
        "total_amount": float(job.total_amount),
        "payment_status": job.payment_status,
        "production_notes": job.production_notes,
        "created_at": job.created_at,
        "download_pdf_url": f"/api/production/jobs/{job.id}/download-pdf",
        "download_csv_url": f"/api/production/jobs/{job.id}/download-csv"
    }

@router.get("/jobs/{job_identifier}/download-pdf")
def download_job_pdf(
    job_identifier: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Allows Super Admin and assigned Vendor to download the 300 DPI A4 imposition print sheets.
    """
    job = find_job(job_identifier, db)
    user_roles = [r.name for r in current_user.roles]
    if "SUPER_ADMIN" not in user_roles and "PRODUCTION_OPERATOR" not in user_roles:
        if "VENDOR" in user_roles and current_user.vendor_id != job.vendor_id:
            raise HTTPException(status_code=403, detail="Unauthorized")
        elif current_user.organization_id and current_user.organization_id != job.organization_id:
            raise HTTPException(status_code=403, detail="Unauthorized")

    import os
    from app.services.pdf_generator import PDFGeneratorService

    snapshot = job.batch_snapshot
    if snapshot and snapshot.pdf_production_url and os.path.exists(snapshot.pdf_production_url):
        pdf_path = snapshot.pdf_production_url
    else:
        pdf_path = PDFGeneratorService.generate_job_imposition_pdf(job, db)

    return FileResponse(
        pdf_path,
        media_type="application/pdf",
        filename=f"{job.job_id}_imposition_A4.pdf"
    )

@router.get("/jobs/{job_identifier}/download-csv")
def download_job_csv(
    job_identifier: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Allows Super Admin and assigned Vendor to download the student records manifest CSV.
    """
    job = find_job(job_identifier, db)
    user_roles = [r.name for r in current_user.roles]
    if "SUPER_ADMIN" not in user_roles and "PRODUCTION_OPERATOR" not in user_roles:
        if "VENDOR" in user_roles and current_user.vendor_id != job.vendor_id:
            raise HTTPException(status_code=403, detail="Unauthorized")
        elif current_user.organization_id and current_user.organization_id != job.organization_id:
            raise HTTPException(status_code=403, detail="Unauthorized")

    from app.services.pdf_generator import PDFGeneratorService
    csv_data = PDFGeneratorService.generate_job_manifest_csv(job)

    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{job.job_id}_manifest.csv"'}
    )

@router.patch("/jobs/{job_uuid}/status")
def update_job_status(
    job_uuid: UUID,
    payload: UpdateJobStatusRequest,
    current_user: User = Depends(get_current_active_admin),
    db: Session = Depends(get_db)
):
    """Super Admin manages the centralized production state machine."""
    job = db.query(PrintJob).filter(PrintJob.id == job_uuid).first()
    if not job:
        raise HTTPException(status_code=404, detail="Print job not found.")

    old_status = job.status
    new_status = payload.status

    allowed_next = VALID_STATUS_TRANSITIONS.get(old_status, [])
    if new_status not in allowed_next:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid state transition from '{old_status}' to '{new_status}'. Allowed: {allowed_next}"
        )

    job.status = new_status
    if payload.production_notes:
        job.production_notes = payload.production_notes
    if payload.quotation_amount:
        job.total_amount = payload.quotation_amount

    event = PrintJobEvent(
        print_job_id=job.id,
        from_status=old_status,
        to_status=new_status,
        changed_by=current_user.id,
        reason=payload.reason
    )
    db.add(event)
    db.commit()

    return {
        "job_id": job.job_id,
        "from_status": old_status,
        "to_status": new_status,
        "updated_at": datetime.utcnow()
    }

@router.post("/jobs/{job_uuid}/qc")
def add_qc_check(
    job_uuid: UUID,
    payload: QualityCheckCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    qc = QualityControlCheck(
        print_job_id=job_uuid,
        check_name=payload.check_name,
        passed=payload.passed,
        notes=payload.notes,
        checked_by=current_user.id
    )
    db.add(qc)
    db.commit()
    return {"message": "Quality control check recorded.", "passed": qc.passed}

@router.post("/jobs/{job_uuid}/dispatch")
def record_dispatch(
    job_uuid: UUID,
    payload: DispatchCreate,
    current_user: User = Depends(get_current_active_admin),
    db: Session = Depends(get_db)
):
    job = db.query(PrintJob).filter(PrintJob.id == job_uuid).first()
    if not job:
        raise HTTPException(status_code=404, detail="Print job not found.")

    dispatch = DispatchRecord(
        print_job_id=job.id,
        courier_name=payload.courier_name,
        tracking_number=payload.tracking_number,
        tracking_url=payload.tracking_url,
        expected_delivery_date=payload.expected_delivery_date
    )
    db.add(dispatch)
    job.status = "Dispatched"
    db.commit()

    return {
        "message": "Dispatch tracking recorded.",
        "courier": dispatch.courier_name,
        "tracking_number": dispatch.tracking_number
    }

@router.get("/jobs/{job_uuid}")
def get_job_details(
    job_uuid: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Fetch complete job command center details, timeline events, QC checks, and dispatch manifest."""
    job = db.query(PrintJob).filter(PrintJob.id == job_uuid).first()
    if not job:
        raise HTTPException(status_code=404, detail="Print job not found.")

    verify_tenant_isolation(job.organization_id, current_user, db)

    events = [
        {
            "id": str(e.id),
            "from_status": e.from_status,
            "to_status": e.to_status,
            "reason": e.reason,
            "created_at": e.created_at
        }
        for e in sorted(job.events, key=lambda x: x.created_at)
    ]

    qc_checks = [
        {
            "id": str(q.id),
            "check_name": q.check_name,
            "passed": q.passed,
            "notes": q.notes,
            "created_at": q.created_at
        }
        for q in job.qc_checks
    ]

    dispatch_info = None
    if job.dispatch:
        dispatch_info = {
            "courier_name": job.dispatch.courier_name,
            "tracking_number": job.dispatch.tracking_number,
            "tracking_url": job.dispatch.tracking_url,
            "dispatch_date": job.dispatch.dispatch_date,
            "expected_delivery_date": job.dispatch.expected_delivery_date
        }

    snapshot_info = None
    if job.batch_snapshot:
        snapshot_info = {
            "id": str(job.batch_snapshot.id),
            "batch_name": job.batch_snapshot.batch_name,
            "card_count": job.batch_snapshot.card_count,
            "orientation": job.batch_snapshot.orientation,
            "class_breakdown": (job.batch_snapshot.print_settings or {}).get("class_breakdown", {}),
            "frozen_template_layout": job.batch_snapshot.frozen_template_layout,
            "approved_at": job.batch_snapshot.approved_at
        }

    return {
        "id": str(job.id),
        "job_id": job.job_id,
        "status": job.status,
        "quantity": job.quantity,
        "card_material": job.card_material,
        "lamination_type": job.lamination_type,
        "accessories": job.accessories,
        "organization_id": str(job.organization_id),
        "organization_name": job.organization.name if job.organization else "Organization",
        "organization_code": job.organization.org_id if job.organization else "",
        "vendor_id": str(job.vendor_id),
        "vendor_name": job.vendor.business_name if job.vendor else "Vendor",
        "vendor_email": job.vendor.email if job.vendor else "",
        "delivery_recipient": job.delivery_recipient,
        "delivery_phone": job.delivery_phone,
        "delivery_address": job.delivery_address,
        "delivery_city": job.delivery_city,
        "delivery_state": job.delivery_state,
        "delivery_pincode": job.delivery_pincode,
        "requested_delivery_date": job.requested_delivery_date,
        "quotation_details": job.quotation_details,
        "total_amount": float(job.total_amount),
        "payment_status": job.payment_status,
        "production_notes": job.production_notes,
        "rejection_reason": job.rejection_reason,
        "batch_snapshot": snapshot_info,
        "events": events,
        "qc_checks": qc_checks,
        "dispatch": dispatch_info,
        "created_at": job.created_at,
        "updated_at": job.updated_at
    }

@router.get("/metrics/summary")
def get_production_metrics_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns live database metrics tailored to the calling role:
    - SUPER_ADMIN: Platform-wide vendors, orgs, student counts, and production states.
    - VENDOR: My orgs, students, design review pipeline, validation queue, in-production.
    - ORGANIZATION_ADMIN: Classes, staff, students, review queue, frozen batches, print progress.
    """
    from app.models.vendor import Vendor
    from app.models.design import DesignProject
    from app.models.organization import OrganizationClass

    user_roles = [r.name for r in current_user.roles]

    if "SUPER_ADMIN" in user_roles:
        total_vendors = db.query(Vendor).filter(Vendor.deleted_at == None).count()
        total_orgs = db.query(Organization).filter(Organization.deleted_at == None).count()
        total_students = db.query(Member).filter(Member.deleted_at == None).count()
        
        pending_org_design_approvals = db.query(DesignProject).filter(DesignProject.status == "Proposed").count()
        pending_vendor_submissions = db.query(BatchSnapshot).filter(
            BatchSnapshot.id.notin_(db.query(PrintJob.batch_snapshot_id))
        ).count()
        
        jobs_awaiting_review = db.query(PrintJob).filter(PrintJob.status == "Awaiting Review").count()
        jobs_printing = db.query(PrintJob).filter(PrintJob.status.in_(["Approved for Production", "Queued", "Printing"])).count()
        jobs_qc = db.query(PrintJob).filter(PrintJob.status == "Quality Check").count()
        jobs_dispatch = db.query(PrintJob).filter(PrintJob.status == "Packed").count()
        jobs_delivered = db.query(PrintJob).filter(PrintJob.status.in_(["Dispatched", "Delivered", "Completed"])).count()
        quotations_pending = db.query(PrintJob).filter(PrintJob.payment_status == "Pending").count()

        return {
            "role": "SUPER_ADMIN",
            "active_vendors": total_vendors,
            "total_organizations": total_orgs,
            "total_students": total_students,
            "pending_org_approvals": pending_org_design_approvals,
            "pending_vendor_submissions": pending_vendor_submissions,
            "jobs_awaiting_review": jobs_awaiting_review,
            "jobs_printing": jobs_printing,
            "jobs_awaiting_qc": jobs_qc,
            "jobs_awaiting_dispatch": jobs_dispatch,
            "jobs_delivered": jobs_delivered,
            "quotations_pending": quotations_pending
        }

    elif "VENDOR" in user_roles and current_user.vendor_id:
        v_id = current_user.vendor_id
        my_org_ids = [o.id for o in db.query(Organization.id).filter(Organization.vendor_id == v_id, Organization.deleted_at == None).all()]
        
        total_orgs = len(my_org_ids)
        total_students = db.query(Member).filter(Member.organization_id.in_(my_org_ids), Member.deleted_at == None).count() if my_org_ids else 0
        
        designs_awaiting_org = db.query(DesignProject).filter(
            DesignProject.vendor_id == v_id,
            DesignProject.status == "Proposed"
        ).count()

        # Batches approved by org awaiting vendor submission to print
        batches_awaiting_vendor = db.query(BatchSnapshot).filter(
            BatchSnapshot.organization_id.in_(my_org_ids),
            BatchSnapshot.id.notin_(db.query(PrintJob.batch_snapshot_id))
        ).count() if my_org_ids else 0

        submissions_awaiting_superadmin = db.query(PrintJob).filter(
            PrintJob.vendor_id == v_id,
            PrintJob.status == "Awaiting Review"
        ).count()

        jobs_in_production = db.query(PrintJob).filter(
            PrintJob.vendor_id == v_id,
            PrintJob.status.in_(["Approved for Production", "Queued", "Printing", "Quality Check", "Packed"])
        ).count()

        jobs_delivered = db.query(PrintJob).filter(
            PrintJob.vendor_id == v_id,
            PrintJob.status.in_(["Dispatched", "Delivered", "Completed"])
        ).count()

        return {
            "role": "VENDOR",
            "my_organizations": total_orgs,
            "total_students": total_students,
            "designs_awaiting_approval": designs_awaiting_org,
            "approved_batches_awaiting_vendor": batches_awaiting_vendor,
            "submissions_awaiting_admin": submissions_awaiting_superadmin,
            "jobs_in_production": jobs_in_production,
            "jobs_delivered": jobs_delivered
        }

    elif current_user.organization_id:
        org_id = current_user.organization_id
        total_classes = db.query(OrganizationClass).filter(OrganizationClass.organization_id == org_id).count()
        total_staff = db.query(User).filter(User.organization_id == org_id, User.deleted_at == None).count()
        total_students = db.query(Member).filter(Member.organization_id == org_id, Member.deleted_at == None).count()
        
        draft_students = db.query(Member).filter(Member.organization_id == org_id, Member.deleted_at == None, Member.status == "DRAFT").count()
        review_students = db.query(Member).filter(Member.organization_id == org_id, Member.deleted_at == None, Member.status.in_(["PENDING", "SUBMITTED"])).count()
        approved_students = db.query(Member).filter(Member.organization_id == org_id, Member.deleted_at == None, Member.status == "APPROVED").count()

        # Design status
        latest_design = db.query(DesignProject).filter(DesignProject.organization_id == org_id).order_by(DesignProject.created_at.desc()).first()
        design_status = latest_design.status if latest_design else "No Design Created Yet"

        approved_batches = db.query(BatchSnapshot).filter(BatchSnapshot.organization_id == org_id).count()
        
        jobs_in_production = db.query(PrintJob).filter(
            PrintJob.organization_id == org_id,
            PrintJob.status.in_(["Awaiting Review", "Approved for Production", "Queued", "Printing", "Quality Check", "Packed"])
        ).count()
        
        jobs_delivered = db.query(PrintJob).filter(
            PrintJob.organization_id == org_id,
            PrintJob.status.in_(["Dispatched", "Delivered", "Completed"])
        ).count()

        return {
            "role": "ORGANIZATION",
            "total_classes": total_classes,
            "total_staff": total_staff,
            "total_students": total_students,
            "draft_students": draft_students,
            "review_students": review_students,
            "approved_students": approved_students,
            "design_status": design_status,
            "approved_batches": approved_batches,
            "jobs_in_production": jobs_in_production,
            "jobs_delivered": jobs_delivered
        }

    return {"detail": "No role metrics available."}

