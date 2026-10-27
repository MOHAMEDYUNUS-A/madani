from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime

from app.core.database import get_db
from app.auth.dependencies import get_current_org_staff, verify_tenant_isolation, get_current_org_member, get_current_org_admin, get_effective_org_id
from app.models.user import User
from app.models.member import Member, Department
from app.models.organization import Organization
from app.schemas.member import MemberOut, MemberCreate, MemberUpdate, DepartmentOut, DepartmentCreate, ImportSummary
from app.services.storage import StorageService
from app.services.importer import ImportService
from app.services.audit import AuditService

router = APIRouter(prefix="/api/members", tags=["Member/Student Management"])

@router.get("", response_model=Dict) # Returns pagination metadata + results
def list_members(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    search: Optional[str] = Query(None),
    department_id: Optional[UUID] = Query(None),
    class_name: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    has_photo: Optional[bool] = Query(None),
    current_user: User = Depends(get_current_org_member),
    db: Session = Depends(get_db)
):
    org_id = get_effective_org_id(current_user, db)
    if not org_id:
        raise HTTPException(status_code=400, detail="User does not belong to any organization.")

    query = db.query(Member).filter(
        Member.organization_id == org_id,
        Member.deleted_at == None
    )

    # Apply search filter
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            (Member.name.ilike(search_pattern)) |
            (Member.member_id.ilike(search_pattern)) |
            (Member.admission_number.ilike(search_pattern)) |
            (Member.phone.ilike(search_pattern))
        )

    user_roles = [r.name for r in current_user.roles]
    is_admin = any(r in ["SUPER_ADMIN", "VENDOR", "ORGANIZATION_ADMIN", "STAFF_ADMIN"] for r in user_roles)
    if not is_admin and current_user.assigned_class:
        query = query.filter(Member.class_name == current_user.assigned_class)

    # Apply category filters
    if department_id:
        query = query.filter(Member.department_id == department_id)
    if class_name:
        query = query.filter(Member.class_name == class_name)
    if status:
        if status in ["PENDING", "SUBMITTED"]:
            query = query.filter(Member.status.in_(["PENDING", "SUBMITTED"]))
        elif status in ["REJECTED", "CHANGES_REQUESTED"]:
            query = query.filter(Member.status.in_(["REJECTED", "CHANGES_REQUESTED"]))
        else:
            query = query.filter(Member.status == status)
    if has_photo is not None:
        if has_photo:
            query = query.filter(Member.photo_url != None)
        else:
            query = query.filter(Member.photo_url == None)

    # Pagination calculations
    total_count = query.count()
    offset = (page - 1) * limit
    members = query.order_by(Member.member_id).offset(offset).limit(limit).all()

    # Convert results
    results = []
    for m in members:
        dept_out = None
        if m.department:
            dept_out = DepartmentOut(id=m.department.id, name=m.department.name)
            
        results.append(MemberOut(
            id=m.id,
            organization_id=m.organization_id,
            member_id=m.member_id,
            admission_number=m.admission_number,
            name=m.name,
            dob=m.dob,
            gender=m.gender,
            blood_group=m.blood_group,
            department=dept_out,
            designation=m.designation,
            class_name=m.class_name,
            section=m.section,
            academic_year=m.academic_year,
            roll_number=m.roll_number,
            phone=m.phone,
            email=m.email,
            address=m.address,
            parent_name=m.parent_name,
            emergency_contact=m.emergency_contact,
            joining_date=m.joining_date,
            expiry_date=m.expiry_date,
            status=m.status,
            rejection_reason=m.rejection_reason,
            photo_url=m.photo_url,
            photo_original_url=m.photo_original_url
        ))

    return {
        "total": total_count,
        "page": page,
        "limit": limit,
        "pages": (total_count + limit - 1) // limit,
        "results": results
    }

@router.post("", response_model=MemberOut, status_code=status.HTTP_201_CREATED)
def create_member(
    payload: MemberCreate,
    current_user: User = Depends(get_current_org_staff),
    db: Session = Depends(get_db)
):
    org_id = get_effective_org_id(current_user, db)
    if not org_id:
        raise HTTPException(status_code=400, detail="User does not belong to any organization.")

    # Duplicate check within tenant
    duplicate = db.query(Member).filter(
        Member.organization_id == org_id,
        Member.member_id == payload.member_id,
        Member.deleted_at == None
    ).first()

    if duplicate:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Student/Employee ID '{payload.member_id}' already exists in your organization."
        )

    # Department validation
    if payload.department_id:
        dept = db.query(Department).filter(
            Department.id == payload.department_id,
            Department.organization_id == org_id
        ).first()
        if not dept:
            raise HTTPException(status_code=400, detail="Invalid department_id specified.")

    is_admin = any(r.name in ["ORGANIZATION_ADMIN", "STAFF_ADMIN", "SUPER_ADMIN"] for r in current_user.roles)
    status_val = payload.status if (payload.status and is_admin) else "DRAFT"

    # Enforce class scoping for staff
    target_class = payload.class_name
    if not is_admin and current_user.assigned_class:
        target_class = current_user.assigned_class

    member = Member(
        organization_id=org_id,
        member_id=payload.member_id,
        admission_number=payload.admission_number,
        name=payload.name,
        dob=payload.dob,
        gender=payload.gender,
        blood_group=payload.blood_group,
        department_id=payload.department_id,
        designation=payload.designation,
        class_name=target_class,
        section=payload.section,
        academic_year=payload.academic_year,
        roll_number=payload.roll_number,
        phone=payload.phone,
        email=payload.email,
        address=payload.address,
        parent_name=payload.parent_name,
        emergency_contact=payload.emergency_contact,
        joining_date=payload.joining_date,
        expiry_date=payload.expiry_date,
        status=status_val
    )

    db.add(member)
    db.commit()
    db.refresh(member)

    AuditService.log(
        db=db,
        action="Member Manually Created",
        entity="members",
        entity_id=member.id,
        user_id=current_user.id,
        organization_id=current_user.organization_id,
        new_values={"member_id": member.member_id, "name": member.name}
    )

    return member

@router.get("/{member_uuid}", response_model=MemberOut)
def get_member(
    member_uuid: UUID,
    current_user: User = Depends(get_current_org_member),
    db: Session = Depends(get_db)
):
    member = db.query(Member).filter(
        Member.id == member_uuid,
        Member.deleted_at == None
    ).first()

    if not member:
        raise HTTPException(status_code=404, detail="Member not found.")

    verify_tenant_isolation(member.organization_id, current_user)
    return member

@router.patch("/{member_uuid}", response_model=MemberOut)
def update_member(
    member_uuid: UUID,
    payload: MemberUpdate,
    current_user: User = Depends(get_current_org_staff),
    db: Session = Depends(get_db)
):
    member = db.query(Member).filter(
        Member.id == member_uuid,
        Member.deleted_at == None
    ).first()

    if not member:
        raise HTTPException(status_code=404, detail="Member not found.")

    verify_tenant_isolation(member.organization_id, current_user)

    old_vals = {c.name: getattr(member, c.name) for c in member.__table__.columns}

    # Handle optional department check
    update_data = payload.model_dump(exclude_unset=True)
    if "department_id" in update_data and update_data["department_id"]:
        dept = db.query(Department).filter(
            Department.id == update_data["department_id"],
            Department.organization_id == current_user.organization_id
        ).first()
        if not dept:
            raise HTTPException(status_code=400, detail="Invalid department_id.")

    user_roles = [r.name for r in current_user.roles]
    is_admin = any(r in ["SUPER_ADMIN", "VENDOR", "ORGANIZATION_ADMIN", "STAFF_ADMIN"] for r in user_roles)
    if not is_admin and current_user.assigned_class:
        if member.class_name != current_user.assigned_class:
            raise HTTPException(status_code=403, detail="Staff can only edit students in their assigned class.")
        if "class_name" in update_data and update_data["class_name"] != current_user.assigned_class:
            raise HTTPException(status_code=403, detail="Staff cannot reassign students to another class.")

    # Apply changes
    for key, value in update_data.items():
        setattr(member, key, value)

    db.commit()
    db.refresh(member)

    new_vals = {c.name: getattr(member, c.name) for c in member.__table__.columns}
    AuditService.log(
        db=db,
        action="Member Updated",
        entity="members",
        entity_id=member.id,
        user_id=current_user.id,
        organization_id=current_user.organization_id,
        old_values=old_vals,
        new_values=new_vals
    )

    return member

@router.delete("/{member_uuid}", status_code=status.HTTP_200_OK)
def delete_member(
    member_uuid: UUID,
    current_user: User = Depends(get_current_org_staff),
    db: Session = Depends(get_db)
):
    member = db.query(Member).filter(
        Member.id == member_uuid,
        Member.deleted_at == None
    ).first()

    if not member:
        raise HTTPException(status_code=404, detail="Member not found.")

    verify_tenant_isolation(member.organization_id, current_user)

    member.deleted_at = datetime.utcnow()
    db.commit()

    AuditService.log(
        db=db,
        action="Member Soft-Deleted",
        entity="members",
        entity_id=member.id,
        user_id=current_user.id,
        organization_id=current_user.organization_id
    )

    return {"message": "Member record soft-deleted successfully."}

@router.post("/{member_uuid}/photo", response_model=MemberOut)
def upload_member_photo(
    member_uuid: UUID,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_org_staff),
    db: Session = Depends(get_db)
):
    org = db.query(Organization).filter(Organization.id == current_user.organization_id).first()
    member = db.query(Member).filter(
        Member.id == member_uuid,
        Member.deleted_at == None
    ).first()

    if not member:
        raise HTTPException(status_code=404, detail="Member not found.")

    verify_tenant_isolation(member.organization_id, current_user)

    # Process and save
    cropped_url, original_url = StorageService.process_and_save_photo(
        file=file,
        org_id=org.org_id
    )

    # Clean old paths if they exist
    if member.photo_url: StorageService.delete_file(member.photo_url)
    if member.photo_original_url: StorageService.delete_file(member.photo_original_url)

    member.photo_url = cropped_url
    member.photo_original_url = original_url
    db.commit()
    db.refresh(member)

    AuditService.log(
        db=db,
        action="Member Photo Uploaded",
        entity="members",
        entity_id=member.id,
        user_id=current_user.id,
        organization_id=current_user.organization_id,
        new_values={"photo_url": cropped_url}
    )

    return member

@router.post("/import", response_model=ImportSummary)
def import_members_bulk(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_org_staff),
    db: Session = Depends(get_db)
):
    org_id = get_effective_org_id(current_user, db)
    if not org_id:
        raise HTTPException(status_code=400, detail="User does not belong to any organization.")

    df = ImportService.parse_excel_or_csv(file)
    summary = ImportService.import_members_task(
        db=db,
        organization_id=org_id,
        df=df,
        user_id=current_user.id
    )
    return summary

@router.post("/photos/import")
def import_photos_zip(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_org_staff),
    db: Session = Depends(get_db)
):
    org_id = get_effective_org_id(current_user, db)
    if not org_id:
        raise HTTPException(status_code=400, detail="User does not belong to any organization.")

    if not file.filename.lower().endswith(".zip"):
        raise HTTPException(status_code=400, detail="Uploaded file must be a compressed ZIP archive.")

    result = ImportService.match_zip_photos(
        db=db,
        organization_id=org_id,
        zip_file=file,
        user_id=current_user.id
    )
    return result

# Departments List Endpoint
@router.get("/departments/list", response_model=List[DepartmentOut])
def get_departments(
    current_user: User = Depends(get_current_org_member),
    db: Session = Depends(get_db)
):
    org_id = get_effective_org_id(current_user, db)
    if not org_id:
        raise HTTPException(status_code=400, detail="User does not belong to any organization.")
    return db.query(Department).filter(Department.organization_id == org_id).all()

from pydantic import BaseModel

class RejectionPayload(BaseModel):
    reason: str

class BulkReviewPayload(BaseModel):
    member_ids: Optional[List[UUID]] = None
    action: str # "APPROVE" or "REQUEST_CHANGES"
    reason: Optional[str] = None
    class_name: Optional[str] = None

@router.post("/{member_uuid}/submit", response_model=MemberOut)
def submit_member(
    member_uuid: UUID,
    current_user: User = Depends(get_current_org_staff),
    db: Session = Depends(get_db)
):
    member = db.query(Member).filter(Member.id == member_uuid, Member.deleted_at == None).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found.")
    verify_tenant_isolation(member.organization_id, current_user)
    
    member.status = "SUBMITTED"
    db.commit()
    db.refresh(member)
    
    AuditService.log(
        db=db,
        action="Member Submitted for Organization Review",
        entity="members",
        entity_id=member.id,
        user_id=current_user.id,
        organization_id=current_user.organization_id
    )
    return member

@router.post("/bulk-submit")
def bulk_submit_members(
    current_user: User = Depends(get_current_org_staff),
    db: Session = Depends(get_db)
):
    """Staff submits all DRAFT or CHANGES_REQUESTED records in their class for review."""
    query = db.query(Member).filter(
        Member.organization_id == current_user.organization_id,
        Member.deleted_at == None,
        Member.status.in_(["DRAFT", "CHANGES_REQUESTED", "REJECTED"])
    )
    user_roles = [r.name for r in current_user.roles]
    is_admin = any(r in ["SUPER_ADMIN", "VENDOR", "ORGANIZATION_ADMIN", "STAFF_ADMIN"] for r in user_roles)
    if not is_admin and current_user.assigned_class:
        query = query.filter(Member.class_name == current_user.assigned_class)

    members = query.all()
    count = len(members)
    for m in members:
        m.status = "SUBMITTED"
    db.commit()

    return {"message": f"Successfully submitted {count} student records for organization review.", "count": count}

@router.post("/{member_uuid}/approve", response_model=MemberOut)
def approve_member(
    member_uuid: UUID,
    current_user: User = Depends(get_current_org_admin),
    db: Session = Depends(get_db)
):
    member = db.query(Member).filter(Member.id == member_uuid, Member.deleted_at == None).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found.")
    verify_tenant_isolation(member.organization_id, current_user)
    
    member.status = "APPROVED"
    member.rejection_reason = None
    db.commit()
    db.refresh(member)
    
    AuditService.log(
        db=db,
        action="Member Approved for Production Batch",
        entity="members",
        entity_id=member.id,
        user_id=current_user.id,
        organization_id=current_user.organization_id
    )
    return member

@router.post("/{member_uuid}/reject", response_model=MemberOut)
def reject_member(
    member_uuid: UUID,
    payload: RejectionPayload,
    current_user: User = Depends(get_current_org_admin),
    db: Session = Depends(get_db)
):
    member = db.query(Member).filter(Member.id == member_uuid, Member.deleted_at == None).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found.")
    verify_tenant_isolation(member.organization_id, current_user)
    
    member.status = "CHANGES_REQUESTED"
    member.rejection_reason = payload.reason
    db.commit()
    db.refresh(member)
    
    AuditService.log(
        db=db,
        action="Member Returned for Changes",
        entity="members",
        entity_id=member.id,
        user_id=current_user.id,
        organization_id=current_user.organization_id,
        new_values={"reason": payload.reason}
    )
    return member

@router.post("/bulk-review")
def bulk_review_members(
    payload: BulkReviewPayload,
    current_user: User = Depends(get_current_org_admin),
    db: Session = Depends(get_db)
):
    """Organization Admin approves or returns multiple students at once."""
    query = db.query(Member).filter(
        Member.organization_id == current_user.organization_id,
        Member.deleted_at == None
    )
    if payload.member_ids:
        query = query.filter(Member.id.in_(payload.member_ids))
    elif payload.class_name:
        query = query.filter(Member.class_name == payload.class_name)

    members = query.all()
    count = 0
    new_status = "APPROVED" if payload.action.upper() == "APPROVE" else "CHANGES_REQUESTED"
    
    for m in members:
        m.status = new_status
        if new_status == "APPROVED":
            m.rejection_reason = None
        else:
            m.rejection_reason = payload.reason or "Information incomplete or photo requires update."
        count += 1

    db.commit()
    return {"message": f"Successfully updated {count} student records to '{new_status}'.", "count": count, "status": new_status}
