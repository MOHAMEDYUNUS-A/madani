from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime

class GeneratedBatchCreate(BaseModel):
    template_version_id: UUID
    name: str
    member_ids: Optional[List[UUID]] = None # None means all students matching filter
    generation_config: Dict[str, Any] = {
        "paper_size": "A4",
        "cards_per_page": 8,
        "orientation": "Portrait",
        "margin": 10,
        "bleed": 2,
        "crop_marks": True,
        "text_overflow": "shrink" # shrink, wrap, warn
    }

class GeneratedCardOut(BaseModel):
    id: UUID
    batch_id: UUID
    member_id: UUID
    verification_token: str
    rendered_data: Dict[str, Any]
    created_at: datetime

    class Config:
        from_attributes = True

class GeneratedBatchOut(BaseModel):
    id: UUID
    organization_id: UUID
    template_version_id: Optional[UUID] = None
    name: str
    status: str
    progress: float
    pdf_url: Optional[str] = None
    card_count: int
    generation_config: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class OrderCreate(BaseModel):
    generated_batch_id: UUID
    quantity: int
    material: Optional[str] = "Standard PVC"
    lamination: Optional[str] = "Glossy"
    delivery_recipient: str
    delivery_phone: str
    delivery_address: str
    delivery_city: str
    delivery_state: str
    delivery_pincode: str
    special_instructions: Optional[str] = None

class OrderStatusHistoryOut(BaseModel):
    id: UUID
    status: str
    changed_by: Optional[UUID] = None
    comment: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class PaymentOut(BaseModel):
    id: UUID
    payment_gateway: Optional[str] = None
    transaction_id: Optional[str] = None
    amount: float
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class OrderOut(BaseModel):
    id: UUID
    order_id: str
    organization_id: UUID
    generated_batch_id: UUID
    status: str
    quantity: int
    material: Optional[str] = None
    lamination: Optional[str] = None
    delivery_recipient: str
    delivery_phone: str
    delivery_address: str
    delivery_city: str
    delivery_state: str
    delivery_pincode: str
    courier_name: Optional[str] = None
    tracking_number: Optional[str] = None
    dispatch_date: Optional[datetime] = None
    expected_delivery_date: Optional[datetime] = None
    price_details: Optional[Dict[str, Any]] = None
    special_instructions: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    status_history: List[OrderStatusHistoryOut] = []
    payments: List[PaymentOut] = []

    class Config:
        from_attributes = True

class OrderUpdateAdmin(BaseModel):
    status: Optional[str] = None
    price_details: Optional[Dict[str, Any]] = None
    courier_name: Optional[str] = None
    tracking_number: Optional[str] = None
    dispatch_date: Optional[datetime] = None
    expected_delivery_date: Optional[datetime] = None
    comment: Optional[str] = None # For status history logging
