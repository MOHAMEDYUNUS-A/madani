from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import uuid
from uuid import UUID
from typing import List, Dict, Any
from datetime import datetime

from app.core.database import get_db
from app.auth.dependencies import get_current_org_staff, get_current_org_member, get_current_active_admin, verify_tenant_isolation, get_effective_org_id
from app.models.user import User
from app.models.order import Order, OrderStatusHistory, GeneratedBatch, Payment
from app.schemas.order import OrderOut, OrderCreate, OrderUpdateAdmin
from app.services.audit import AuditService

router = APIRouter(prefix="/api/orders", tags=["Order Management & Fulfillment"])

def get_next_order_id(db: Session) -> str:
    count = db.query(Order).count()
    current_year = datetime.utcnow().year
    return f"MAD-ORD-{current_year}-{count + 1:06d}"

@router.get("", response_model=List[OrderOut])
def list_orders(
    current_user: User = Depends(get_current_org_member),
    db: Session = Depends(get_db)
):
    # Check if SuperAdmin - return ALL orders across organizations
    user_roles = [r.name for r in current_user.roles]
    if "SUPER_ADMIN" in user_roles:
        return db.query(Order).order_by(Order.created_at.desc()).all()
        
    org_id = get_effective_org_id(current_user, db)
    if not org_id:
        raise HTTPException(status_code=400, detail="User does not belong to any organization.")

    return db.query(Order).filter(
        Order.organization_id == org_id
    ).order_by(Order.created_at.desc()).all()

@router.post("", response_model=OrderOut, status_code=status.HTTP_201_CREATED)
def create_order(
    payload: OrderCreate,
    current_user: User = Depends(get_current_org_staff),
    db: Session = Depends(get_db)
):
    org_id = get_effective_org_id(current_user, db)
    if not org_id and "SUPER_ADMIN" not in [r.name for r in current_user.roles]:
        raise HTTPException(status_code=400, detail="User does not belong to any organization.")

    user_roles = [r.name for r in current_user.roles]
    if "SUPER_ADMIN" not in user_roles and "VENDOR" not in user_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Organizations cannot submit physical print orders directly. Please approve the batch on the Batch Review page so your assigned Vendor can submit it for physical print fulfillment."
        )

    # 1. Verify Batch belongs to user's organization and is completed
    batch = db.query(GeneratedBatch).filter(
        GeneratedBatch.id == payload.generated_batch_id,
        GeneratedBatch.organization_id == org_id
    ).first()

    if not batch:
        raise HTTPException(status_code=404, detail="Generated batch not found.")
        
    if batch.status != "Completed":
        raise HTTPException(
            status_code=400,
            detail=f"Batch is in '{batch.status}' state. PDF must be fully generated before ordering."
        )

    # 2. Sequential Order ID
    order_id = get_next_order_id(db)

    # 3. Create Price Details draft quotation (superadmin can edit this later)
    # Estimate: e.g. 20 Rs per card, 10 Rs per lamination + standard delivery Rs 150
    card_rate = 25.0
    lamination_rate = 10.0 if payload.lamination != "None" else 0.0
    subtotal = payload.quantity * (card_rate + lamination_rate)
    delivery_fee = 150.0
    tax = subtotal * 0.18 # 18% GST
    total = subtotal + delivery_fee + tax

    price_details = {
        "unit_rate": card_rate,
        "lamination_rate": lamination_rate,
        "subtotal": subtotal,
        "delivery": delivery_fee,
        "tax_gst": tax,
        "total": total
    }

    order = Order(
        order_id=order_id,
        organization_id=org_id,
        generated_batch_id=payload.generated_batch_id,
        status="Submitted",
        quantity=payload.quantity,
        material=payload.material,
        lamination=payload.lamination,
        delivery_recipient=payload.delivery_recipient,
        delivery_phone=payload.delivery_phone,
        delivery_address=payload.delivery_address,
        delivery_city=payload.delivery_city,
        delivery_state=payload.delivery_state,
        delivery_pincode=payload.delivery_pincode,
        price_details=price_details,
        special_instructions=payload.special_instructions
    )
    db.add(order)
    db.commit()
    db.refresh(order)

    # 4. Status History
    status_entry = OrderStatusHistory(
        order_id=order.id,
        status="Submitted",
        changed_by=current_user.id,
        comment="Order submitted to Madani. Pending review and quotation verification."
    )
    db.add(status_entry)

    # 5. Create default pending payment
    payment = Payment(
        order_id=order.id,
        payment_gateway="Razorpay",
        amount=total,
        status="Pending"
    )
    db.add(payment)
    db.commit()
    
    db.refresh(order)

    AuditService.log(
        db=db,
        action="Order Submitted",
        entity="orders",
        entity_id=order.id,
        user_id=current_user.id,
        organization_id=current_user.organization_id,
        new_values={"order_id": order.order_id, "amount": total}
    )

    return order

@router.get("/{order_uuid}", response_model=OrderOut)
def get_order_details(
    order_uuid: UUID,
    current_user: User = Depends(get_current_org_member),
    db: Session = Depends(get_db)
):
    order = db.query(Order).filter(Order.id == order_uuid).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")

    # Check permission (unless SuperAdmin)
    user_roles = [r.name for r in current_user.roles]
    if "SUPER_ADMIN" not in user_roles:
        verify_tenant_isolation(order.organization_id, current_user)

    return order

@router.patch("/{order_uuid}/status", response_model=OrderOut)
def update_order_status_admin(
    order_uuid: UUID,
    payload: OrderUpdateAdmin,
    current_user: User = Depends(get_current_active_admin),
    db: Session = Depends(get_db)
):
    """
    Super Admin endpoint to advance state: Approved, Printing, Dispatched (tracking code), Delivered.
    """
    order = db.query(Order).filter(Order.id == order_uuid).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")

    old_status = order.status
    update_data = payload.model_dump(exclude_unset=True)

    # Extract comment for status history
    comment = update_data.pop("comment", None) or f"Status changed from {old_status} to {payload.status}."

    # Update basic details
    for key, value in update_data.items():
        if value is not None:
            setattr(order, key, value)

    # If status changes, log in timeline
    if payload.status and payload.status != old_status:
        # If payment is marked Paid/Confirmed, resolve the payments relation as well
        if payload.status == "Payment Confirmed" or payload.status == "Approved":
            for payment in order.payments:
                payment.status = "Success"
                payment.transaction_id = payment.transaction_id or f"TXN-{uuid.uuid4().hex[:10].upper()}"

        history_entry = OrderStatusHistory(
            order_id=order.id,
            status=payload.status,
            changed_by=current_user.id,
            comment=comment
        )
        db.add(history_entry)

    db.commit()
    db.refresh(order)

    AuditService.log(
        db=db,
        action=f"Order Status Changed: {order.status}",
        entity="orders",
        entity_id=order.id,
        user_id=current_user.id,
        organization_id=order.organization_id,
        old_values={"status": old_status},
        new_values={"status": order.status}
    )

    return order
