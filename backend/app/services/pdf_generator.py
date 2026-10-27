import os
import qrcode
from PIL import Image
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4, A3, letter, legal
from reportlab.lib.units import inch, mm
from sqlalchemy.orm import Session
import io
import uuid
from typing import Dict, Any, List, Optional
from uuid import UUID

from app.models.member import Member
from app.models.organization import Organization, OrganizationBranding
from app.models.template import TemplateVersion, Template
from app.models.order import GeneratedBatch, GeneratedCard
from app.core.config import settings

class PDFGeneratorService:
    PAGE_SIZES = {
        "A4": A4,
        "A3": A3,
        "LETTER": letter,
        "LEGAL": legal
    }

    @staticmethod
    def get_physical_size(size_str: str) -> tuple:
        return PDFGeneratorService.PAGE_SIZES.get(size_str.upper(), A4)

    @staticmethod
    def resolve_token(token: str, member: Member, org: Organization, branding: OrganizationBranding) -> str:
        """
        Replaces dynamic double curly brace strings with real data.
        """
        if not token:
            return ""
        
        # Format mapping
        mappings = {
            "{{student.name}}": member.name,
            "{{student.id}}": member.member_id,
            "{{student.member_id}}": member.member_id,
            "{{student.admission_number}}": member.admission_number or "",
            "{{student.dob}}": str(member.dob) if member.dob else "",
            "{{student.gender}}": member.gender or "",
            "{{student.blood_group}}": member.blood_group or "",
            "{{student.designation}}": member.designation or "",
            "{{student.class}}": member.class_name or "",
            "{{student.section}}": member.section or "",
            "{{student.year}}": member.academic_year or "",
            "{{student.roll_number}}": member.roll_number or "",
            "{{student.phone}}": member.phone or "",
            "{{student.email}}": member.email or "",
            "{{student.address}}": member.address or "",
            
            "{{organization.name}}": org.name,
            "{{organization.short_name}}": org.short_name or org.name,
            "{{organization.address}}": org.address or "",
            "{{organization.phone}}": org.website or "", # Placeholder/fallback
            "{{organization.email}}": org.website or "",
            "{{organization.website}}": org.website or "",
            "{{organization.city}}": org.city or "",
            "{{organization.state}}": org.state or "",
            "{{organization.pincode}}": org.pincode or ""
        }
        
        val = token
        for k, v in mappings.items():
            val = val.replace(k, str(v))
            
        return val

    @staticmethod
    def generate_qr_image(text: str) -> io.BytesIO:
        qr = qrcode.QRCode(version=1, box_size=10, border=1)
        qr.add_data(text)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        
        img_buffer = io.BytesIO()
        img.save(img_buffer, format="PNG")
        img_buffer.seek(0)
        return img_buffer

    @staticmethod
    def draw_crop_marks(canv: canvas.Canvas, x: float, y: float, w: float, h: float, mark_len: float = 10, bleed: float = 0):
        """
        Draws precise thin crop mark hairlines outside the boundaries of a card.
        """
        canv.saveState()
        canv.setStrokeColorRGB(0.5, 0.5, 0.5) # Gray marks
        canv.setLineWidth(0.3)
        
        # Card bounds (with bleed if present)
        x_min, x_max = x - bleed, x + w + bleed
        y_min, y_max = y - bleed, y + h + bleed
        
        # Offset for the mark to prevent overlap with bleed
        offset = 2
        
        # Bottom-Left
        canv.line(x_min - offset, y_min, x_min - offset - mark_len, y_min)
        canv.line(x_min, y_min - offset, x_min, y_min - offset - mark_len)
        
        # Top-Left
        canv.line(x_min - offset, y_max, x_min - offset - mark_len, y_max)
        canv.line(x_min, y_max + offset, x_min, y_max + offset + mark_len)
        
        # Bottom-Right
        canv.line(x_max + offset, y_min, x_max + offset + mark_len, y_min)
        canv.line(x_max, y_min - offset, x_max, y_min - offset - mark_len)
        
        # Top-Right
        canv.line(x_max + offset, y_max, x_max + offset + mark_len, y_max)
        canv.line(x_max, y_max + offset, x_max, y_max + offset + mark_len)
        
        canv.restoreState()

    @staticmethod
    def get_image_from_data_url(data_url: str):
        if not data_url:
            return None
        if isinstance(data_url, str) and data_url.startswith("data:image"):
            import base64
            from io import BytesIO
            from PIL import Image
            try:
                header, encoded = data_url.split(",", 1)
                data = base64.b64decode(encoded)
                return Image.open(BytesIO(data))
            except Exception:
                return None
        return None

    @staticmethod
    def draw_card_side(
        canv: canvas.Canvas,
        x: float, # Canvas placement origin X
        y: float, # Canvas placement origin Y
        card_w: float, # Card physical width (points)
        card_h: float, # Card physical height (points)
        layout: Dict[str, Any], # JSON configuration for this side
        member: Member,
        org: Organization,
        branding: OrganizationBranding,
        verification_token: str
    ):
        """
        Renders a single side (front or back) of an ID card using ReportLab commands.
        """
        canv.saveState()
        
        # Draw background color
        bg_color = layout.get("background_color", "#ffffff")
        from reportlab.lib.colors import HexColor
        try:
            canv.setFillColor(HexColor(bg_color))
        except ValueError:
            canv.setFillColorRGB(1, 1, 1)
        
        canv.rect(x, y, card_w, card_h, fill=True, stroke=False)
        
        # Draw background image if available
        bg_img_path = layout.get("background_image")
        if bg_img_path:
            if bg_img_path.startswith("data:image"):
                from reportlab.lib.utils import ImageReader
                pil_img = PDFGeneratorService.get_image_from_data_url(bg_img_path)
                if pil_img:
                    canv.drawImage(ImageReader(pil_img), x, y, width=card_w, height=card_h)
            else:
                # Resolve storage path
                local_path = os.path.join(settings.STORAGE_DIR, bg_img_path.replace("/storage/", "", 1))
                if os.path.exists(local_path):
                    canv.drawImage(local_path, x, y, width=card_w, height=card_h)

        # Scale elements from web designer canvas coordinates (e.g. 337.5 x 212.5) to physical PDF points
        design_w = float(layout.get("canvas_width", 337.5))
        design_h = float(layout.get("canvas_height", 212.5))
        
        scale_x = card_w / design_w
        scale_y = card_h / design_h

        elements = layout.get("elements", [])
        for el in elements:
            el_type = el.get("type")
            # Convert web design Y to PDF Y (PDF starts at bottom-left, web starts at top-left)
            el_x = x + (float(el.get("x", 0)) * scale_x)
            el_w = float(el.get("width", 50)) * scale_x
            el_h = float(el.get("height", 20)) * scale_y
            el_y = y + card_h - (float(el.get("y", 0)) * scale_y) - el_h

            if el_type == "text":
                canv.saveState()
                raw_text = el.get("value", "")
                text_val = PDFGeneratorService.resolve_token(raw_text, member, org, branding)
                
                font_size = float(el.get("font_size", 10)) * scale_y
                color_hex = el.get("color", "#000000")
                align = el.get("align", "left") # left, center, right
                
                try:
                    canv.setFillColor(HexColor(color_hex))
                except ValueError:
                    canv.setFillColorRGB(0, 0, 0)
                
                font_name = "Helvetica"
                if el.get("bold"):
                    font_name = "Helvetica-Bold"
                if el.get("italic"):
                    font_name = "Helvetica-Oblique"

                # Multi-line wrap and auto-shrink algorithm
                min_font_size = 4.5
                lines = [text_val]
                
                while font_size >= min_font_size:
                    # Try single line first
                    text_width = canv.stringWidth(text_val, font_name, font_size)
                    if text_width <= el_w:
                        lines = [text_val]
                        break
                        
                    # Try wrapping by spaces & manual newlines
                    wrapped_lines = []
                    paragraphs = text_val.split("\n")
                    for p in paragraphs:
                        words = p.split(" ")
                        current_line = []
                        for word in words:
                            test_line = " ".join(current_line + [word])
                            test_width = canv.stringWidth(test_line, font_name, font_size)
                            if test_width <= el_w:
                                current_line.append(word)
                            else:
                                if current_line:
                                    wrapped_lines.append(" ".join(current_line))
                                    current_line = [word]
                                else:
                                    # Force single word wrap
                                    wrapped_lines.append(word)
                        if current_line:
                            wrapped_lines.append(" ".join(current_line))
                            
                    # Calculate total vertical height
                    line_height = font_size * 1.15
                    total_height = len(wrapped_lines) * line_height
                    
                    if total_height <= el_h or font_size <= min_font_size:
                        lines = wrapped_lines
                        break
                        
                    font_size -= 0.5

                canv.setFont(font_name, font_size)
                
                # Render lines centered vertically
                line_height = font_size * 1.15
                total_text_height = len(lines) * line_height
                start_y = el_y + el_h - ((el_h - total_text_height) / 2) - font_size
                
                for idx_line, line in enumerate(lines):
                    current_y = start_y - (idx_line * line_height)
                    if align == "center":
                        canv.drawCentredString(el_x + (el_w / 2), current_y, line)
                    elif align == "right":
                        canv.drawRightString(el_x + el_w, current_y, line)
                    else:
                        canv.drawString(el_x, current_y, line)
                canv.restoreState()

            elif el_type == "photo":
                # Draw Student photo
                photo_path = member.photo_url
                if photo_path:
                    local_path = os.path.join(settings.STORAGE_DIR, photo_path.replace("/storage/", "", 1))
                    if os.path.exists(local_path):
                        # Draw photo clipped or in boundary
                        canv.drawImage(local_path, el_x, el_y, width=el_w, height=el_h)
                else:
                    # Draw solid gray placeholder
                    canv.setFillColorRGB(0.9, 0.9, 0.9)
                    canv.rect(el_x, el_y, el_w, el_h, fill=True, stroke=True)
                    canv.setFillColorRGB(0.3, 0.3, 0.3)
                    canv.setFont("Helvetica", 6)
                    canv.drawCentredString(el_x + el_w/2, el_y + el_h/2, "No Photo")

            elif el_type == "logo":
                # Draw Org Logo
                logo_path = branding.primary_logo
                if logo_path:
                    local_path = os.path.join(settings.STORAGE_DIR, logo_path.replace("/storage/", "", 1))
                    if os.path.exists(local_path):
                        canv.drawImage(local_path, el_x, el_y, width=el_w, height=el_h)
                else:
                    canv.setStrokeColorRGB(0.8, 0.8, 0.8)
                    canv.rect(el_x, el_y, el_w, el_h, fill=False, stroke=True)

            elif el_type == "qr":
                # Generate dynamic verification URL
                verification_url = f"https://madani.example.com/verify/{verification_token}"
                qr_img = PDFGeneratorService.generate_qr_image(verification_url)
                
                # Render PIL image in memory to reportlab using ImageReader
                from reportlab.lib.utils import ImageReader
                canv.drawImage(ImageReader(qr_img), el_x, el_y, width=el_w, height=el_h)

            elif el_type == "shape":
                shape_type = el.get("shape_type", "rectangle") # rectangle, circle
                canv.saveState()
                
                color_hex = el.get("color", "#000000")
                try:
                    canv.setFillColor(HexColor(color_hex))
                    canv.setStrokeColor(HexColor(color_hex))
                except ValueError:
                    canv.setFillColorRGB(0, 0, 0)
                
                fill_mode = el.get("fill", True)
                
                if shape_type == "circle":
                    radius = min(el_w, el_h) / 2
                    canv.circle(el_x + radius, el_y + radius, radius, fill=fill_mode, stroke=not fill_mode)
                else:
                    canv.rect(el_x, el_y, el_w, el_h, fill=fill_mode, stroke=not fill_mode)
                canv.restoreState()

            elif el_type == "line":
                canv.saveState()
                color_hex = el.get("color", "#000000")
                try:
                    canv.setStrokeColor(HexColor(color_hex))
                except ValueError:
                    canv.setStrokeColorRGB(0, 0, 0)
                
                thickness = float(el.get("thickness", 1)) * scale_y
                canv.setLineWidth(thickness)
                canv.line(el_x, el_y + el_h, el_x + el_w, el_y)
                canv.restoreState()

            elif el_type == "signature":
                sig_val = el.get("value")
                if sig_val:
                    if sig_val.startswith("data:image"):
                        from reportlab.lib.utils import ImageReader
                        pil_img = PDFGeneratorService.get_image_from_data_url(sig_val)
                        if pil_img:
                            canv.drawImage(ImageReader(pil_img), el_x, el_y, width=el_w, height=el_h)
                    else:
                        local_path = os.path.join(settings.STORAGE_DIR, sig_val.replace("/storage/", "", 1))
                        if os.path.exists(local_path):
                            canv.drawImage(local_path, el_x, el_y, width=el_w, height=el_h)

        canv.restoreState()

    @staticmethod
    def generate_pdf_batch(db: Session, batch_id: UUID) -> str:
        """
        Executes page imposition logic to generate a high quality vector-accurate PDF print file.
        Updates batch processing status and percentage counters on the fly.
        """
        batch = db.query(GeneratedBatch).filter(GeneratedBatch.id == batch_id).first()
        if not batch:
            raise ValueError("Batch record not found.")

        # Update batch status
        batch.status = "Processing"
        batch.progress = 10.0
        db.commit()

        try:
            # 1. Fetch relations
            template_ver = db.query(TemplateVersion).filter(TemplateVersion.id == batch.template_version_id).first()
            template = db.query(Template).filter(Template.id == template_ver.template_id).first()
            org = db.query(Organization).filter(Organization.id == batch.organization_id).first()
            branding = db.query(OrganizationBranding).filter(OrganizationBranding.organization_id == org.id).first()

            if not template_ver or not org:
                raise ValueError("Template Version or Organization references missing.")

            # Load layouts
            layout_data = template_ver.layout_data
            front_layout = layout_data.get("front")
            back_layout = layout_data.get("back") # May be null if front-only card
            
            # Determine card size in PDF points
            # CR80 is 3.375 x 2.125 inches. 1 inch = 72 points
            unit = template.unit.lower()
            if unit == "in":
                card_w = float(template.card_width) * 72
                card_h = float(template.card_height) * 72
            elif unit == "mm":
                card_w = (float(template.card_width) / 25.4) * 72
                card_h = (float(template.card_height) / 25.4) * 72
            else: # cm
                card_w = (float(template.card_width) / 2.54) * 72
                card_h = (float(template.card_height) / 2.54) * 72

            # Determine list of members to print
            config = batch.generation_config or {}
            member_ids = config.get("member_ids")
            group_class = config.get("group_class")
            group_department = config.get("group_department")
            
            query = db.query(Member).filter(
                Member.organization_id == org.id,
                Member.deleted_at == None,
                Member.status == "APPROVED"
            )
            
            if member_ids:
                query = query.filter(Member.id.in_([UUID(m_id) for m_id in member_ids]))
            if group_class:
                query = query.filter(Member.class_name == group_class)
            if group_department:
                query = query.filter(Member.department_id == UUID(group_department))
                
            members = query.all()

            if not members:
                raise ValueError("No matching students found for PDF generation.")

            batch.card_count = len(members)
            batch.progress = 20.0
            db.commit()

            # Imposition Paper details
            paper_size_str = config.get("paper_size", "A4")
            paper_w, paper_h = PDFGeneratorService.get_physical_size(paper_size_str)
            
            # Load grid params
            margin = float(config.get("margin", 20)) # default 20 points margins
            gap_h = float(config.get("gap_horizontal", 10))
            gap_v = float(config.get("gap_vertical", 10))
            bleed = float(config.get("bleed", 0)) # default no bleed
            crop_marks_enabled = config.get("crop_marks", True)

            # File output destination
            dest_dir = os.path.join(settings.STORAGE_DIR, org.org_id, "batches")
            os.makedirs(dest_dir, exist_ok=True)
            pdf_filename = f"{batch_id}.pdf"
            pdf_filepath = os.path.join(dest_dir, pdf_filename)

            # Set up ReportLab canvas
            canv = canvas.Canvas(pdf_filepath, pagesize=(paper_w, paper_h))
            
            # Grid calculation
            # Available printable width/height
            avail_w = paper_w - (2 * margin)
            avail_h = paper_h - (2 * margin)

            # Compute cards per row and column
            cols = int((avail_w + gap_h) // (card_w + gap_h))
            rows = int((avail_h + gap_v) // (card_h + gap_v))
            
            if cols <= 0 or rows <= 0:
                raise ValueError("Card size is too large for the selected paper sheet boundaries.")

            cards_per_page = cols * rows
            
            # Render each member card
            for i, member in enumerate(members):
                # Generate unique verification token
                verification_token = f"MAD-{uuid.uuid4().hex[:12].upper()}"
                
                # Log generated card metadata record
                rendered_snapshot = {
                    "name": member.name,
                    "member_id": member.member_id,
                    "class": member.class_name,
                    "department": member.department.name if member.department else ""
                }
                card_record = GeneratedCard(
                    batch_id=batch.id,
                    member_id=member.id,
                    verification_token=verification_token,
                    rendered_data=rendered_snapshot
                )
                db.add(card_record)

                # Imposition Placement coordinates
                card_idx = i % cards_per_page
                
                # Check page creation boundary
                if card_idx == 0 and i > 0:
                    # Save page and start new one
                    canv.showPage()

                col_idx = card_idx % cols
                row_idx = card_idx // cols
                
                # X and Y positions
                x_pos = margin + col_idx * (card_w + gap_h)
                # PDF Y coordinates grow upwards, so we subtract from the top
                y_pos = paper_h - margin - (row_idx + 1) * card_h - row_idx * gap_v

                # Render Card Front
                PDFGeneratorService.draw_card_side(
                    canv=canv,
                    x=x_pos,
                    y=y_pos,
                    card_w=card_w,
                    card_h=card_h,
                    layout=front_layout,
                    member=member,
                    org=org,
                    branding=branding,
                    verification_token=verification_token
                )
                
                # Draw crop marks if requested
                if crop_marks_enabled:
                    PDFGeneratorService.draw_crop_marks(canv, x_pos, y_pos, card_w, card_h, mark_len=8, bleed=bleed)

                # Report Progress incrementally
                if i % 10 == 0:
                    progress_val = 20.0 + (float(i) / len(members)) * 70.0
                    batch.progress = round(progress_val, 2)
                    db.commit()

            # Save the final page and write document
            canv.save()

            # If there is a back layout and the user wants double-sided sheets,
            # we would output a separate back sheet or alternate front/back.
            # E.g., for simple double-sided print workflows, we append back pages.
            # To keep it production-safe and easy to handle by professional printers,
            # print layout can generate a multi-page PDF where Page 1 has fronts, Page 2 has corresponding backs, or fronts are on odd pages and backs are on even pages.
            # Let's check if back layout is present:
            # Let's check if back layout is present:
            if back_layout and len(back_layout.get("elements", [])) > 0:
                layout_format = config.get("layout_format", "duplex")
                
                if layout_format == "side_by_side":
                    # Side-by-Side Imposition Layout (places Front & Back next to each other on same page)
                    total_slots = cols * rows
                    pairs_per_page = total_slots // 2
                    
                    if pairs_per_page > 0:
                        canv_side = canvas.Canvas(pdf_filepath, pagesize=(paper_w, paper_h))
                        
                        for idx_member, member in enumerate(members):
                            page_pair_idx = idx_member % pairs_per_page
                            if page_pair_idx == 0 and idx_member > 0:
                                canv_side.showPage()
                                
                            # Left slot is Front, Right slot is Back (aligned side-by-side)
                            front_slot = page_pair_idx * 2
                            back_slot = front_slot + 1
                            
                            # Front slot row/col
                            front_col = front_slot % cols
                            front_row = front_slot // cols
                            front_x = margin + front_col * (card_w + gap_h)
                            front_y = paper_h - margin - (front_row + 1) * card_h - front_row * gap_v
                            
                            # Back slot row/col
                            back_col = back_slot % cols
                            back_row = back_slot // cols
                            back_x = margin + back_col * (card_w + gap_h)
                            back_y = paper_h - margin - (back_row + 1) * card_h - back_row * gap_v
                            
                            # Token creation
                            verification_token = f"MAD-{uuid.uuid4().hex[:12].upper()}"
                            card_record = GeneratedCard(
                                batch_id=batch.id,
                                member_id=member.id,
                                verification_token=verification_token,
                                rendered_data={
                                    "name": member.name,
                                    "member_id": member.member_id,
                                    "class": member.class_name,
                                    "department": member.department.name if member.department else ""
                                }
                            )
                            db.add(card_record)
                            
                            # Render Front
                            PDFGeneratorService.draw_card_side(
                                canv=canv_side,
                                x=front_x, y=front_y,
                                card_w=card_w, card_h=card_h,
                                layout=front_layout,
                                member=member, org=org, branding=branding,
                                verification_token=verification_token
                            )
                            if crop_marks_enabled:
                                PDFGeneratorService.draw_crop_marks(canv_side, front_x, front_y, card_w, card_h, mark_len=8, bleed=bleed)
                                
                            # Render Back right next to it!
                            PDFGeneratorService.draw_card_side(
                                canv=canv_side,
                                x=back_x, y=back_y,
                                card_w=card_w, card_h=card_h,
                                layout=back_layout,
                                member=member, org=org, branding=branding,
                                verification_token=verification_token
                            )
                            if crop_marks_enabled:
                                PDFGeneratorService.draw_crop_marks(canv_side, back_x, back_y, card_w, card_h, mark_len=8, bleed=bleed)
                                
                        canv_side.save()
                    else:
                        layout_format = "duplex"
                        
                if layout_format == "duplex":
                    # Duplex alternating page alignment output (re-save with mirrors)
                    back_pdf_filepath = pdf_filepath.replace(".pdf", "_back.pdf")
                    canv_back = canvas.Canvas(back_pdf_filepath, pagesize=(paper_w, paper_h))
                    
                    for i, member in enumerate(members):
                        card_idx = i % cards_per_page
                        if card_idx == 0 and i > 0:
                            canv_back.showPage()
                            
                        col_idx = card_idx % cols
                        back_col_idx = cols - 1 - col_idx
                        row_idx = card_idx // cols
                        
                        x_pos = margin + back_col_idx * (card_w + gap_h)
                        y_pos = paper_h - margin - (row_idx + 1) * card_h - row_idx * gap_v
                        
                        card_record = db.query(GeneratedCard).filter(
                            GeneratedCard.batch_id == batch.id,
                            GeneratedCard.member_id == member.id
                        ).first()
                        v_token = card_record.verification_token if card_record else "DUMMY"
                        
                        PDFGeneratorService.draw_card_side(
                            canv=canv_back,
                            x=x_pos, y=y_pos,
                            card_w=card_w, card_h=card_h,
                            layout=back_layout,
                            member=member, org=org, branding=branding,
                            verification_token=v_token
                        )
                        if crop_marks_enabled:
                            PDFGeneratorService.draw_crop_marks(canv_back, x_pos, y_pos, card_w, card_h, mark_len=8, bleed=bleed)
                            
                    canv_back.save()
                    
                    if os.path.exists(back_pdf_filepath):
                        os.remove(back_pdf_filepath)
                        
                    canv_combined = canvas.Canvas(pdf_filepath, pagesize=(paper_w, paper_h))
                    pages = (len(members) + cards_per_page - 1) // cards_per_page
                    
                    for p in range(pages):
                        members_on_page = members[p*cards_per_page : (p+1)*cards_per_page]
                        for idx, member in enumerate(members_on_page):
                            col_idx = idx % cols
                            row_idx = idx // cols
                            x_pos = margin + col_idx * (card_w + gap_h)
                            y_pos = paper_h - margin - (row_idx + 1) * card_h - row_idx * gap_v
                            
                            card_record = db.query(GeneratedCard).filter(
                                GeneratedCard.batch_id == batch.id,
                                GeneratedCard.member_id == member.id
                            ).first()
                            v_token = card_record.verification_token if card_record else "DUMMY"
                            
                            PDFGeneratorService.draw_card_side(
                                canv=canv_combined,
                                x=x_pos, y=y_pos,
                                card_w=card_w, card_h=card_h,
                                layout=front_layout,
                                member=member, org=org, branding=branding,
                                verification_token=v_token
                            )
                            if crop_marks_enabled:
                                PDFGeneratorService.draw_crop_marks(canv_combined, x_pos, y_pos, card_w, card_h, mark_len=8, bleed=bleed)
                        canv_combined.showPage()
                        
                        for idx, member in enumerate(members_on_page):
                            col_idx = idx % cols
                            back_col_idx = cols - 1 - col_idx
                            row_idx = idx // cols
                            x_pos = margin + back_col_idx * (card_w + gap_h)
                            y_pos = paper_h - margin - (row_idx + 1) * card_h - row_idx * gap_v
                            
                            card_record = db.query(GeneratedCard).filter(
                                GeneratedCard.batch_id == batch.id,
                                GeneratedCard.member_id == member.id
                            ).first()
                            v_token = card_record.verification_token if card_record else "DUMMY"
                            
                            PDFGeneratorService.draw_card_side(
                                canv=canv_combined,
                                x=x_pos, y=y_pos,
                                card_w=card_w, card_h=card_h,
                                layout=back_layout,
                                member=member, org=org, branding=branding,
                                verification_token=v_token
                            )
                            if crop_marks_enabled:
                                PDFGeneratorService.draw_crop_marks(canv_combined, x_pos, y_pos, card_w, card_h, mark_len=8, bleed=bleed)
                        canv_combined.showPage()
                        
                    canv_combined.save()

            # Done!
            batch.status = "Completed"
            batch.progress = 100.0
            batch.pdf_url = f"/storage/{org.org_id}/batches/{pdf_filename}"
            db.commit()

            return batch.pdf_url

        except Exception as e:
            db.rollback()
            batch.status = "Failed"
            batch.error_message = str(e)
            db.commit()
            raise e
