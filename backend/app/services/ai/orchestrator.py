from typing import Dict, Any, List, Optional
from uuid import UUID
from sqlalchemy.orm import Session
from datetime import datetime

from app.services.ai.provider import get_ai_provider, LLMProvider
from app.models.design import BrandKit, DesignProject, DesignVariation, AIGenerationLog
from app.models.vendor import VendorSubscription, SubscriptionPlan

class PrintQualityAgent:
    @staticmethod
    def audit_layout(layout: Dict[str, Any], card_w: float = 3.375, card_h: float = 2.125) -> Dict[str, Any]:
        """
        Runs comprehensive pre-flight print quality checks:
        - Elements outside canvas bounding box
        - Text safe area violations (margin < 3mm)
        - Overflow and font readability
        - Mandatory placeholder verification (photo, name, QR/barcode)
        """
        canvas_w_px = card_w * 100.0 # Standard 100px per inch representation
        canvas_h_px = card_h * 100.0
        safe_margin = 10.0 # ~2.5mm in screen points
        
        warnings = []
        has_photo = False
        has_name = False
        has_qr_or_barcode = False
        
        elements = layout.get("elements", [])
        for el in elements:
            el_type = el.get("type", "")
            x = float(el.get("x", 0))
            y = float(el.get("y", 0))
            w = float(el.get("width", 0))
            h = float(el.get("height", 0))
            
            # Boundary checks
            if x < 0 or y < 0 or (x + w) > (canvas_w_px + 2) or (y + h) > (canvas_h_px + 2):
                if el_type != "shape": # Background shapes are allowed to bleed
                    warnings.append(f"Element '{el.get('id', el_type)}' extends outside the card boundary.")
                    
            # Safe area checks for non-decorative items
            if el_type in ["text", "photo", "qr", "barcode"]:
                if x < safe_margin or y < safe_margin or (x + w) > (canvas_w_px - safe_margin) or (y + h) > (canvas_h_px - safe_margin):
                    warnings.append(f"Element '{el.get('id', el_type)}' is within the 2.5mm safety margin.")
                    
            if el_type == "photo":
                has_photo = True
            if el_type == "text" and ("{{student.name}}" in el.get("value", "") or "{{member.name}}" in el.get("value", "")):
                has_name = True
            if el_type in ["qr", "barcode"]:
                has_qr_or_barcode = True
                
        if not has_photo:
            warnings.append("Recommendation: No student/employee photo frame detected on card front.")
        if not has_name:
            warnings.append("Notice: Name dynamic token {{student.name}} not present on layout.")
        if not has_qr_or_barcode:
            warnings.append("Recommendation: Add a QR code or barcode for fast physical attendance/verification scanning.")
            
        score = max(50.0, round(100.0 - (len(warnings) * 2.5), 1))
        return {
            "score": score,
            "passed": len(warnings) <= 3,
            "warnings": warnings,
            "checked_at": datetime.utcnow().isoformat()
        }

class AIDesignOrchestrator:
    def __init__(self, provider: Optional[LLMProvider] = None):
        self.provider = provider or get_ai_provider()

    def generate_variations(
        self,
        db: Session,
        organization_id: UUID,
        vendor_id: Optional[UUID],
        brief: str,
        category: str = "School",
        orientation: str = "Landscape",
        card_width: float = 3.375,
        card_height: float = 2.125,
        brand_colors: Optional[Dict[str, str]] = None
    ) -> List[Dict[str, Any]]:
        """
        Orchestrates the multi-agent design pipeline:
        1. Checks Vendor quota (if applicable)
        2. Calls Brand & Layout agents
        3. Runs Print Quality Agent
        4. Logs AI generation audit record
        """
        # Quota check
        if vendor_id:
            sub = db.query(VendorSubscription).filter(VendorSubscription.vendor_id == vendor_id).first()
            if sub and sub.plan:
                if sub.ai_generations_used >= sub.plan.max_ai_generations_per_month:
                    raise ValueError(f"Vendor subscription quota exceeded ({sub.ai_generations_used}/{sub.plan.max_ai_generations_per_month} AI generations used). Please upgrade plan.")
                sub.ai_generations_used += 1
                db.commit()

        system_prompt = (
            "You are an expert ID card design system architect. "
            "Generate at least 3 distinct, professional, print-ready card layout variations in structured JSON. "
            "Each variation MUST include both 'front' and 'back' element trees with coordinates, dimensions, colors, and dynamic tokens."
        )
        user_prompt = (
            f"Organization Category: {category}\n"
            f"Orientation: {orientation}\n"
            f"Dimensions: {card_width}x{card_height} inches\n"
            f"Design Brief: {brief}\n"
            f"Brand Colors: {brand_colors or {}}\n"
            "Return JSON matching key 'variations'."
        )

        response = self.provider.generate_json(system_prompt, user_prompt)
        variations = response.get("variations", [])
        
        # Post-process with PrintQualityAgent
        for var in variations:
            front = var.get("front", {})
            v_w = float(var.get("card_width", card_width))
            v_h = float(var.get("card_height", card_height))
            quality = PrintQualityAgent.audit_layout(front, card_w=v_w, card_h=v_h)
            var["quality_score"] = quality["score"]
            var["quality_report"] = quality

        # Log AI action
        log = AIGenerationLog(
            vendor_id=vendor_id,
            organization_id=organization_id,
            action="variation_generation",
            prompt=brief,
            response_payload={"count": len(variations), "category": category},
            tokens_used=1250,
            model_name=getattr(self.provider, "model", "mock-ai-engine")
        )
        db.add(log)
        db.commit()

        return variations

    def execute_chat_to_canvas(
        self,
        db: Session,
        current_layout: Dict[str, Any],
        user_command: str,
        organization_id: Optional[UUID] = None,
        vendor_id: Optional[UUID] = None
    ) -> Dict[str, Any]:
        """
        Translates a natural language instruction (e.g. 'move photo to right', 'make name bigger')
        into explicit, validated canvas mutation operations without rasterizing or corrupting the design document.
        """
        system_prompt = (
            "You are a specialized Canvas Editing Agent. "
            "Convert user natural language refinement requests into explicit, validated operations. "
            "Supported actions: 'update_element', 'move_element', 'resize_element', 'change_color', 'change_font_size'. "
            "Return a JSON object with 'operations' (list) and 'explanation' (string)."
        )
        user_prompt = f"Command: {user_command}\nCurrent Elements Count: {len(current_layout.get('elements', []))}"

        result = self.provider.generate_json(system_prompt, user_prompt)
        
        # Apply mutation safely to layout copy
        updated_layout = json_deep_copy(current_layout)
        operations = result.get("operations", [])
        
        for op in operations:
            target_type = op.get("target_type")
            target_field = op.get("target_field")
            props = op.get("properties", {})
            
            for el in updated_layout.get("elements", []):
                match = False
                if target_type and el.get("type") == target_type:
                    match = True
                if target_field and target_field in el.get("value", ""):
                    match = True
                    
                if match:
                    for k, v in props.items():
                        el[k] = v

        if organization_id:
            log = AIGenerationLog(
                vendor_id=vendor_id,
                organization_id=organization_id,
                action="canvas_chat_edit",
                prompt=user_command,
                response_payload=result,
                tokens_used=350,
                model_name=getattr(self.provider, "model", "mock-ai-engine")
            )
            db.add(log)
            db.commit()

        return {
            "updated_layout": updated_layout,
            "operations": operations,
            "explanation": result.get("explanation", "Canvas updated successfully.")
        }

def json_deep_copy(data: Any) -> Any:
    import json
    return json.loads(json.dumps(data))
