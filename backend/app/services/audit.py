from sqlalchemy.orm import Session
from typing import Any, Dict, Optional
from uuid import UUID
from app.models.order import AuditLog

class AuditService:
    @staticmethod
    def log(
        db: Session,
        action: str,
        entity: str,
        entity_id: Optional[UUID] = None,
        user_id: Optional[UUID] = None,
        organization_id: Optional[UUID] = None,
        old_values: Optional[Dict[str, Any]] = None,
        new_values: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None
    ) -> AuditLog:
        log_entry = AuditLog(
            user_id=user_id,
            organization_id=organization_id,
            action=action,
            entity=entity,
            entity_id=entity_id,
            old_values=old_values,
            new_values=new_values,
            ip_address=ip_address
        )
        db.add(log_entry)
        db.commit()
        db.refresh(log_entry)
        return log_entry
