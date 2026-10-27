from sqlalchemy.orm import Session
from app.core.database import SessionLocal, Base, engine
from app.core.security import get_password_hash
from app.models.organization import Organization, OrganizationBranding
from app.models.user import User, Role
from app.models.member import Member, Department
from app.models.template import Template, TemplateVersion
import uuid

def seed_database():
    db = SessionLocal()
    try:
        # Drop the old user_roles table if it exists, to fix implicit primary key not-null constraints in PostgreSQL
        try:
            from sqlalchemy import text
            db.execute(text("DROP TABLE IF EXISTS user_roles CASCADE"))
            db.commit()
        except Exception:
            db.rollback()

        # Create all tables if they don't exist
        Base.metadata.create_all(bind=engine)

        # Dynamic schema updates for SQLite / PostgreSQL development databases
        for col_stmt in [
            "ALTER TABLE members ADD COLUMN rejection_reason VARCHAR",
            "ALTER TABLE users ADD COLUMN vendor_id VARCHAR",
            "ALTER TABLE organizations ADD COLUMN vendor_id VARCHAR",
            "ALTER TABLE user_roles ADD COLUMN vendor_id VARCHAR",
        ]:
            try:
                from sqlalchemy import text
                db.execute(text(col_stmt))
                db.commit()
            except Exception:
                db.rollback()

        print("Seeding roles and permissions...")
        # 1. Ensure Roles
        roles = {}
        all_role_names = [
            "SUPER_ADMIN", 
            "VENDOR", 
            "ORGANIZATION_ADMIN", 
            "STAFF_ADMIN", 
            "DATA_ENTRY_STAFF", 
            "DESIGNER", 
            "VIEWER",
            "PRODUCTION_OPERATOR"
        ]
        for role_name in all_role_names:
            role = db.query(Role).filter(Role.name == role_name).first()
            if not role:
                role = Role(name=role_name, description=f"{role_name} system role")
                db.add(role)
                db.commit()
                db.refresh(role)
            roles[role_name] = role

        # Seed Default Subscription Plans
        from app.models.vendor import SubscriptionPlan
        default_plans = [
            {
                "name": "Free Trial",
                "slug": "trial",
                "price_monthly": 0.0,
                "max_organizations": 2,
                "max_ai_generations_per_month": 25,
                "max_pdf_generations_per_month": 50,
                "max_storage_mb": 500,
                "features": ["AI Design Studio (Trial)", "Up to 2 Organizations", "Basic Print Proofs"]
            },
            {
                "name": "Starter Plan",
                "slug": "starter",
                "price_monthly": 499.0,
                "max_organizations": 5,
                "max_ai_generations_per_month": 100,
                "max_pdf_generations_per_month": 500,
                "max_storage_mb": 2048,
                "features": ["AI Design Studio", "Up to 5 Organizations", "Duplex Imposition", "Live Previews"]
            },
            {
                "name": "Professional Plan",
                "slug": "pro",
                "price_monthly": 999.0,
                "max_organizations": 25,
                "max_ai_generations_per_month": 500,
                "max_pdf_generations_per_month": 2500,
                "max_storage_mb": 10240,
                "features": ["Unlimited AI Refinements", "Up to 25 Organizations", "Batch Snapshots", "Priority Dispatch"]
            },
            {
                "name": "Enterprise Plan",
                "slug": "enterprise",
                "price_monthly": 2499.0,
                "max_organizations": 100,
                "max_ai_generations_per_month": 2000,
                "max_pdf_generations_per_month": 10000,
                "max_storage_mb": 51200,
                "features": ["Dedicated Print Queue", "100+ Organizations", "Custom Brand Kits", "White-label Reports"]
            }
        ]
        for p_data in default_plans:
            existing_plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.slug == p_data["slug"]).first()
            if not existing_plan:
                plan = SubscriptionPlan(**p_data)
                db.add(plan)
        db.commit()

        # 2. Check if global template exists, if not create one
        global_template = db.query(Template).filter(Template.organization_id == None).first()
        if not global_template:
            print("Creating beautiful global base ID templates...")
            
            # Create school template metadata
            global_template = Template(
                organization_id=None,
                name="Madani Academic Classic Blue",
                category="School",
                card_width=3.375,
                card_height=2.125,
                unit="in",
                orientation="Landscape",
                is_published=True,
                is_locked=True
            )
            db.add(global_template)
            db.commit()
            db.refresh(global_template)

            # Core canvas design (Front & Back configurations)
            sample_layout = {
                "front": {
                    "background_color": "#ffffff",
                    "canvas_width": 337.5,
                    "canvas_height": 212.5,
                    "elements": [
                        # Header Banner
                        {"type": "shape", "shape_type": "rectangle", "x": 0, "y": 0, "width": 337.5, "height": 55, "color": "#1e3a8a", "fill": True},
                        # Title
                        {"type": "text", "value": "{{organization.name}}", "x": 10, "y": 10, "width": 317.5, "height": 20, "color": "#ffffff", "font_size": 12, "bold": True, "align": "center"},
                        # Sub-header
                        {"type": "text", "value": "STUDENT IDENTIFICATION CARD", "x": 10, "y": 32, "width": 317.5, "height": 15, "color": "#f59e0b", "font_size": 7, "bold": True, "align": "center"},
                        
                        # Student Photo Frame
                        {"type": "photo", "x": 20, "y": 65, "width": 80, "height": 100},
                        
                        # Name text block
                        {"type": "text", "value": "{{student.name}}", "x": 115, "y": 70, "width": 200, "height": 22, "color": "#1e3a8a", "font_size": 13, "bold": True},
                        # ID label & token
                        {"type": "text", "value": "ID: {{student.id}}", "x": 115, "y": 95, "width": 200, "height": 16, "color": "#1f2937", "font_size": 9, "bold": True},
                        # Class & Dept
                        {"type": "text", "value": "Class: {{student.class}}", "x": 115, "y": 112, "width": 200, "height": 14, "color": "#4b5563", "font_size": 8},
                        {"type": "text", "value": "Blood Group: {{student.blood_group}}", "x": 115, "y": 127, "width": 200, "height": 14, "color": "#4b5563", "font_size": 8},
                        
                        # Bottom Accent line
                        {"type": "shape", "shape_type": "rectangle", "x": 0, "y": 202, "width": 337.5, "height": 10, "color": "#f59e0b", "fill": True}
                    ]
                },
                "back": {
                    "background_color": "#f3f4f6",
                    "canvas_width": 337.5,
                    "canvas_height": 212.5,
                    "elements": [
                        # Header
                        {"type": "shape", "shape_type": "rectangle", "x": 0, "y": 0, "width": 337.5, "height": 15, "color": "#1e3a8a", "fill": True},
                        # Terms Header
                        {"type": "text", "value": "TERMS AND CONDITIONS", "x": 15, "y": 25, "width": 307.5, "height": 15, "color": "#1e3a8a", "font_size": 8, "bold": True},
                        {"type": "text", "value": "1. This card is non-transferable and remains organization property.", "x": 15, "y": 42, "width": 307.5, "height": 12, "color": "#4b5563", "font_size": 6.5},
                        {"type": "text", "value": "2. If found, please return to the office address listed below.", "x": 15, "y": 55, "width": 307.5, "height": 12, "color": "#4b5563", "font_size": 6.5},
                        
                        # Address token block
                        {"type": "text", "value": "Address: {{organization.address}}", "x": 15, "y": 75, "width": 307.5, "height": 25, "color": "#1f2937", "font_size": 7},
                        
                        # QR Code for verification
                        {"type": "qr", "x": 230, "y": 110, "width": 75, "height": 75},
                        
                        # Signature Box
                        {"type": "shape", "shape_type": "rectangle", "x": 25, "y": 145, "width": 120, "height": 30, "color": "#9ca3af", "fill": False},
                        {"type": "text", "value": "AUTHORIZED SIGNATORY", "x": 25, "y": 180, "width": 120, "height": 12, "color": "#4b5563", "font_size": 6, "bold": True, "align": "center"}
                    ]
                }
            }

            version = TemplateVersion(
                template_id=global_template.id,
                version_number=1,
                layout_data=sample_layout
            )
            db.add(version)
            
            # Seeding Template 2: Corporate Elite Portrait
            print("Creating Corporate Elite Portrait template...")
            corp_template = Template(
                organization_id=None,
                name="Corporate Elite Portrait",
                category="Corporate",
                card_width=2.125,
                card_height=3.375,
                unit="in",
                orientation="Portrait",
                is_published=True,
                is_locked=True
            )
            db.add(corp_template)
            db.commit()
            db.refresh(corp_template)
            
            corp_layout = {
                "front": {
                    "background_color": "#ffffff",
                    "canvas_width": 212.5,
                    "canvas_height": 337.5,
                    "elements": [
                        # Top Accent bar
                        {"type": "shape", "shape_type": "rectangle", "x": 0, "y": 0, "width": 212.5, "height": 12, "color": "#f59e0b", "fill": True},
                        # School Logo
                        {"type": "logo", "x": 76, "y": 25, "width": 60, "height": 45},
                        # School Name
                        {"type": "text", "value": "{{organization.name}}", "x": 10, "y": 75, "width": 192.5, "height": 18, "color": "#1f2937", "font_size": 8, "bold": True, "align": "center"},
                        
                        # Student Photo Frame
                        {"type": "photo", "x": 56, "y": 100, "width": 100, "height": 110},
                        
                        # Name text block
                        {"type": "text", "value": "{{student.name}}", "x": 10, "y": 220, "width": 192.5, "height": 22, "color": "#1e3a8a", "font_size": 11, "bold": True, "align": "center"},
                        # ID label & token
                        {"type": "text", "value": "ID: {{student.id}}", "x": 10, "y": 242, "width": 192.5, "height": 16, "color": "#f59e0b", "font_size": 8.5, "bold": True, "align": "center"},
                        # Class & Dept
                        {"type": "text", "value": "Class: {{student.class}}", "x": 10, "y": 260, "width": 192.5, "height": 14, "color": "#4b5563", "font_size": 7.5, "align": "center"},
                        
                        # Bottom QR verification
                        {"type": "qr", "x": 86, "y": 282, "width": 40, "height": 40}
                    ]
                },
                "back": {
                    "background_color": "#1f2937",
                    "canvas_width": 212.5,
                    "canvas_height": 337.5,
                    "elements": [
                        # Header
                        {"type": "text", "value": "RETURN DESTINATION", "x": 10, "y": 20, "width": 192.5, "height": 15, "color": "#f59e0b", "font_size": 9, "bold": True, "align": "center"},
                        {"type": "text", "value": "Address: {{organization.address}}", "x": 15, "y": 45, "width": 182.5, "height": 45, "color": "#ffffff", "font_size": 7.5, "align": "center"},
                        
                        # Terms
                        {"type": "text", "value": "Rules:", "x": 15, "y": 100, "width": 182.5, "height": 12, "color": "#f59e0b", "font_size": 8, "bold": True},
                        {"type": "text", "value": "1. Keep this card visible on premises.", "x": 15, "y": 118, "width": 182.5, "height": 12, "color": "#e5e7eb", "font_size": 7},
                        {"type": "text", "value": "2. Report loss to admin office instantly.", "x": 15, "y": 133, "width": 182.5, "height": 12, "color": "#e5e7eb", "font_size": 7},
                        
                        # Signature Box
                        {"type": "shape", "shape_type": "rectangle", "x": 46, "y": 180, "width": 120, "height": 30, "color": "#9ca3af", "fill": False},
                        {"type": "text", "value": "ISSUING AUTHORITY", "x": 46, "y": 215, "width": 120, "height": 12, "color": "#9ca3af", "font_size": 6.5, "bold": True, "align": "center"},
                        
                        # Barcode
                        {"type": "barcode", "x": 16, "y": 280, "width": 180, "height": 28}
                    ]
                }
            }
            corp_version = TemplateVersion(
                template_id=corp_template.id,
                version_number=1,
                layout_data=corp_layout
            )
            db.add(corp_version)
            
            # Seeding Template 3: Green Eco Nature Landscape
            print("Creating Green Eco Nature Landscape template...")
            eco_template = Template(
                organization_id=None,
                name="Green Eco Nature Landscape",
                category="School",
                card_width=3.375,
                card_height=2.125,
                unit="in",
                orientation="Landscape",
                is_published=True,
                is_locked=True
            )
            db.add(eco_template)
            db.commit()
            db.refresh(eco_template)
            
            eco_layout = {
                "front": {
                    "background_color": "#ffffff",
                    "canvas_width": 337.5,
                    "canvas_height": 212.5,
                    "elements": [
                        # Left Green Sidebar accent
                        {"type": "shape", "shape_type": "rectangle", "x": 0, "y": 0, "width": 90, "height": 212.5, "color": "#047857", "fill": True},
                        # School Logo in left sidebar
                        {"type": "logo", "x": 15, "y": 15, "width": 60, "height": 50},
                        # Student Photo in left sidebar
                        {"type": "photo", "x": 10, "y": 80, "width": 70, "height": 85},
                        
                        # School Name
                        {"type": "text", "value": "{{organization.name}}", "x": 105, "y": 15, "width": 220, "height": 25, "color": "#047857", "font_size": 11, "bold": True},
                        
                        # Name text block
                        {"type": "text", "value": "{{student.name}}", "x": 105, "y": 55, "width": 220, "height": 24, "color": "#111827", "font_size": 13, "bold": True},
                        # ID label & token
                        {"type": "text", "value": "ID NO: {{student.id}}", "x": 105, "y": 85, "width": 220, "height": 16, "color": "#374151", "font_size": 8.5, "bold": True},
                        # Class & Dept
                        {"type": "text", "value": "Grade: {{student.class}}", "x": 105, "y": 105, "width": 220, "height": 14, "color": "#4b5563", "font_size": 8},
                        {"type": "text", "value": "Blood Type: {{student.blood_group}}", "x": 105, "y": 122, "width": 220, "height": 14, "color": "#4b5563", "font_size": 8},
                        
                        # Barcode
                        {"type": "barcode", "x": 105, "y": 155, "width": 160, "height": 30}
                    ]
                },
                "back": {
                    "background_color": "#ecfdf5",
                    "canvas_width": 337.5,
                    "canvas_height": 212.5,
                    "elements": [
                        # Header Green banner
                        {"type": "shape", "shape_type": "rectangle", "x": 0, "y": 0, "width": 337.5, "height": 15, "color": "#047857", "fill": True},
                        
                        # Terms
                        {"type": "text", "value": "INSTRUCTIONS", "x": 20, "y": 30, "width": 297.5, "height": 15, "color": "#047857", "font_size": 9, "bold": True},
                        {"type": "text", "value": "1. This card must be presented for library book issues.", "x": 20, "y": 50, "width": 297.5, "height": 12, "color": "#374151", "font_size": 7},
                        {"type": "text", "value": "2. In case of theft, replace card at registrar desk.", "x": 20, "y": 64, "width": 297.5, "height": 12, "color": "#374151", "font_size": 7},
                        
                        # Address token block
                        {"type": "text", "value": "School: {{organization.address}}", "x": 20, "y": 85, "width": 297.5, "height": 30, "color": "#4b5563", "font_size": 7.5},
                        
                        # Authorized signature and QR
                        {"type": "qr", "x": 240, "y": 120, "width": 70, "height": 70},
                        
                        # Signature slot
                        {"type": "signature", "x": 30, "y": 135, "width": 120, "height": 30},
                        {"type": "text", "value": "Authorized Seal / Sign", "x": 30, "y": 172, "width": 120, "height": 12, "color": "#047857", "font_size": 6.5, "bold": True, "align": "center"}
                    ]
                }
            }
            eco_version = TemplateVersion(
                template_id=eco_template.id,
                version_number=1,
                layout_data=eco_layout
            )
            db.add(eco_version)
            
            db.commit()

        # 3. Create Super Admin account if it does not exist
        admin_user = db.query(User).filter(User.username == "admin").first()
        if not admin_user:
            print("Creating super admin account...")
            admin_user = User(
                organization_id=None,
                full_name="Madani Platform Admin",
                email="admin@madani.com",
                phone="0000000000",
                username="admin",
                password_hash=get_password_hash("admin123"),
                is_active=True
            )
            admin_user.roles.append(roles["SUPER_ADMIN"])
            db.add(admin_user)
            db.commit()
        else:
            # Ensure existing super admin has SUPER_ADMIN role associated
            if roles["SUPER_ADMIN"] not in admin_user.roles:
                print("Associating SUPER_ADMIN role to existing admin user...")
                admin_user.roles.append(roles["SUPER_ADMIN"])
                db.commit()

        # 4. Recover roles for existing users who have no roles assigned
        all_users = db.query(User).all()
        for user in all_users:
            if not user.roles:
                if user.username == "admin":
                    user.roles.append(roles["SUPER_ADMIN"])
                elif user.organization_id:
                    user.roles.append(roles["ORGANIZATION_ADMIN"])
                print(f"Recovered role for user: {user.username}")
        db.commit()

        print("Database seed completed successfully.")

    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
