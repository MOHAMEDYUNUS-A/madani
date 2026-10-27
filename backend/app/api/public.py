from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.order import GeneratedCard
from app.models.member import Member
from app.models.organization import Organization

router = APIRouter(prefix="/api/public", tags=["Public Verification"])

@router.get("/verify/{token}")
def verify_card(token: str, db: Session = Depends(get_db)):
    """
    Public lookup for QR verification.
    Displays only whitelisted data fields to protect PII.
    """
    card = db.query(GeneratedCard).filter(GeneratedCard.verification_token == token).first()
    if not card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Verification failed. Invalid or unrecognized ID card token."
        )

    # Fetch corresponding member details
    member = db.query(Member).filter(Member.id == card.member_id).first()
    if not member or member.deleted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="The student/employee record associated with this card has been removed."
        )

    # Get organization info
    org = db.query(Organization).filter(Organization.id == member.organization_id).first()

    status_display = (member.status or "Active").upper()
    verification_mark = "✓ VERIFIED"
    status_outcome = "VERIFIED"
    if status_display in ["REVOKED", "SUSPENDED"]:
        verification_mark = "❌ CARD REVOKED"
        status_outcome = "REVOKED"
    elif status_display in ["EXPIRED", "INACTIVE"]:
        verification_mark = "⚠️ CARD EXPIRED"
        status_outcome = "EXPIRED"

    return {
        "status": status_outcome,
        "verification_mark": verification_mark,
        "organization_name": org.name if org else "Unknown Organization",
        "student_name": member.name,
        "student_id": member.member_id,
        "academic_year": member.academic_year or "N/A",
        "class_name": member.class_name or "N/A",
        "section": member.section or "N/A",
        "card_status": member.status,
        "verified_at": card.created_at
    }
