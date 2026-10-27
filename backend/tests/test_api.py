import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import uuid

from app.main import app
from app.core.database import Base, get_db
from app.core.security import get_password_hash
from app.models.organization import Organization, OrganizationBranding
from app.models.user import User, Role
from app.models.member import Member, Department
from app.models.template import Template, TemplateVersion
from app.models.order import GeneratedBatch, GeneratedCard

# Test Database Connection (SQLite in-memory)
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_api.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

# Override the database dependency in FastAPI
app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(scope="module", autouse=True)
def setup_db():
    # Setup test tables
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    
    # Ensure roles exist
    all_roles = ["SUPER_ADMIN", "VENDOR", "ORGANIZATION_ADMIN", "STAFF_ADMIN", "DATA_ENTRY_STAFF", "STAFF", "DESIGNER", "PRODUCTION_OPERATOR"]
    for role_name in all_roles:
        if not db.query(Role).filter(Role.name == role_name).first():
            db.add(Role(name=role_name, description=f"{role_name} test role"))
    db.commit()

    # Ensure Subscription Plans exist
    from app.models.vendor import SubscriptionPlan
    for slug, name in [("trial", "Free Trial"), ("starter", "Starter"), ("pro", "Pro"), ("enterprise", "Enterprise")]:
        if not db.query(SubscriptionPlan).filter(SubscriptionPlan.slug == slug).first():
            db.add(SubscriptionPlan(slug=slug, name=name, price_monthly=499.0))
    db.commit()

    # Ensure Super Admin exists
    super_role = db.query(Role).filter(Role.name == "SUPER_ADMIN").first()
    if not db.query(User).filter(User.username == "superadmin").first():
        sa = User(
            full_name="Platform Super Admin",
            email="superadmin@madani.com",
            username="superadmin",
            password_hash=get_password_hash("superpass123"),
            is_active=True
        )
        sa.roles.append(super_role)
        db.add(sa)
        db.commit()

    db.close()
    yield
    Base.metadata.drop_all(bind=engine)

def test_organization_registration():
    client = TestClient(app)
    
    # 1. Register Org A
    response_a = client.post("/api/auth/register", json={
        "name": "Test Academy A",
        "org_type": "School",
        "short_name": "TAA",
        "admin_name": "Alice Admin",
        "admin_email": "alice@taa.com",
        "admin_username": "alice_admin",
        "admin_password": "password123"
    })
    assert response_a.status_code == 201
    data_a = response_a.json()
    assert data_a["name"] == "Test Academy A"
    assert data_a["org_id"] == "MAD-ORG-000001"

    # 2. Register Org B
    response_b = client.post("/api/auth/register", json={
        "name": "Test College B",
        "org_type": "College",
        "short_name": "TCB",
        "admin_name": "Bob Admin",
        "admin_email": "bob@tcb.com",
        "admin_username": "bob_admin",
        "admin_password": "password123"
    })
    assert response_b.status_code == 201
    data_b = response_b.json()
    assert data_b["name"] == "Test College B"
    assert data_b["org_id"] == "MAD-ORG-000002"

def test_login_and_tenant_isolation():
    client = TestClient(app)
    
    # Login Org A
    login_a = client.post("/api/auth/login", json={
        "username": "alice_admin",
        "password": "password123"
    })
    assert login_a.status_code == 200
    token_a = login_a.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # Login Org B
    login_b = client.post("/api/auth/login", json={
        "username": "bob_admin",
        "password": "password123"
    })
    assert login_b.status_code == 200
    token_b = login_b.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # Create Student in Org A
    student_payload = {
        "member_id": "STUDENT-101",
        "admission_number": "ADM-101",
        "name": "John Doe",
        "phone": "9999999999",
        "email": "johndoe@email.com",
        "address": "123 Street, City",
        "status": "Active"
    }
    create_res = client.post("/api/members", json=student_payload, headers=headers_a)
    assert create_res.status_code == 201
    student_a = create_res.json()
    student_a_uuid = student_a["id"]

    # Negative Tenant Isolation Test: Try to fetch Org A's student using Org B's token
    negative_get = client.get(f"/api/members/{student_a_uuid}", headers=headers_b)
    # Must fail with 403 Forbidden or 404 Not Found (verify isolation)
    assert negative_get.status_code == 403

    # Duplicate check within Org A (Must fail)
    duplicate_res = client.post("/api/members", json=student_payload, headers=headers_a)
    assert duplicate_res.status_code == 409

def test_template_isolation():
    client = TestClient(app)
    
    # Login Org A
    login_a = client.post("/api/auth/login", json={"username": "alice_admin", "password": "password123"})
    token_a = login_a.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # Login Org B
    login_b = client.post("/api/auth/login", json={"username": "bob_admin", "password": "password123"})
    token_b = login_b.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # Create template in Org A
    template_payload = {
        "name": "Academy Card A",
        "category": "School",
        "card_width": 3.375,
        "card_height": 2.125,
        "unit": "in",
        "orientation": "Landscape",
        "layout_data": {"front": {"background_color": "#1e3a8a", "elements": []}}
    }
    tpl_res = client.post("/api/templates", json=template_payload, headers=headers_a)
    assert tpl_res.status_code == 201
    tpl_uuid = tpl_res.json()["id"]

    # Org B trying to fetch Org A's template details (Must fail with 403)
    tpl_neg = client.get(f"/api/templates/{tpl_uuid}", headers=headers_b)
    assert tpl_neg.status_code == 403

def test_public_qr_verification():
    client = TestClient(app)
    db = TestingSessionLocal()
    
    # Log in Org A
    login_a = client.post("/api/auth/login", json={"username": "alice_admin", "password": "password123"})
    token_a = login_a.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # Get student record and template version
    member = db.query(Member).first()
    org = db.query(Organization).first()
    template_ver = db.query(TemplateVersion).first()

    # Create Mock Batch
    batch = GeneratedBatch(
        organization_id=org.id,
        template_version_id=template_ver.id,
        name="Test Batch",
        status="Completed",
        progress=100.0,
        pdf_url="/storage/test/batch.pdf"
    )
    db.add(batch)
    db.commit()
    db.refresh(batch)

    # Create verification token for this student card
    v_token = "MAD-TESTVERIFYTOKEN"
    card = GeneratedCard(
        batch_id=batch.id,
        member_id=member.id,
        verification_token=v_token,
        rendered_data={"name": member.name, "member_id": member.member_id}
    )
    db.add(card)
    db.commit()
    db.close()

    # Query public verify route
    verify_res = client.get(f"/api/public/verify/{v_token}")
    assert verify_res.status_code == 200
    data = verify_res.json()
    
    # Assert public whitelisting is enforced (Name, ID, Org exist, NO address/phone/email)
    assert data["status"] == "VERIFIED"
    assert data["student_name"] == "John Doe"
    assert data["student_id"] == "STUDENT-101"
    assert "phone" not in data
    assert "address" not in data
    assert "email" not in data

def test_vendor_onboarding_and_isolation():
    client = TestClient(app)
    
    # 1. Login as Super Admin
    sa_login = client.post("/api/auth/login", json={"username": "superadmin", "password": "superpass123"})
    assert sa_login.status_code == 200
    sa_token = sa_login.json()["access_token"]
    sa_headers = {"Authorization": f"Bearer {sa_token}"}

    # 2. Super Admin onboard Vendor A
    res_va = client.post("/api/vendors", json={
        "business_name": "Apex Printing Solutions",
        "contact_name": "Alan Apex",
        "email": "alan@apexprint.com",
        "phone": "9876543210",
        "plan_slug": "pro",
        "admin_password": "vendorpassword123"
    }, headers=sa_headers)
    assert res_va.status_code == 201
    vendor_a_data = res_va.json()
    assert vendor_a_data["business_name"] == "Apex Printing Solutions"
    vendor_a_uuid = vendor_a_data["id"]

    # 3. Super Admin onboard Vendor B
    res_vb = client.post("/api/vendors", json={
        "business_name": "Beacon Cards Express",
        "contact_name": "Bella Beacon",
        "email": "bella@beaconcards.com",
        "phone": "9876543211",
        "plan_slug": "starter",
        "admin_password": "vendorpassword123"
    }, headers=sa_headers)
    assert res_vb.status_code == 201
    vendor_b_data = res_vb.json()
    vendor_b_uuid = vendor_b_data["id"]

    # 4. Login as Vendor A
    login_va = client.post("/api/auth/login", json={"username": vendor_a_data["username"], "password": "vendorpassword123"})
    assert login_va.status_code == 200
    token_va = login_va.json()["access_token"]
    headers_va = {"Authorization": f"Bearer {token_va}"}

    # 5. Login as Vendor B
    login_vb = client.post("/api/auth/login", json={"username": vendor_b_data["username"], "password": "vendorpassword123"})
    assert login_vb.status_code == 200
    token_vb = login_vb.json()["access_token"]
    headers_vb = {"Authorization": f"Bearer {token_vb}"}

    # 6. Verify cross-vendor isolation: Vendor B cannot inspect Vendor A's profile
    neg_vendor = client.get(f"/api/vendors/{vendor_a_uuid}", headers=headers_vb)
    assert neg_vendor.status_code == 403

def test_ai_design_multi_variation_generation():
    client = TestClient(app)
    db = TestingSessionLocal()
    from app.models.vendor import Vendor
    org = db.query(Organization).first()
    vendor = db.query(Vendor).filter(Vendor.email == "alan@apexprint.com").first()
    if vendor and org.vendor_id != vendor.id:
        org.vendor_id = vendor.id
        db.commit()
    org_id = str(org.id)
    db.close()

    # 1. Negative test: Org Admin must NOT access AI Design generator
    login_a = client.post("/api/auth/login", json={"username": "alice_admin", "password": "password123"})
    token_a = login_a.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    brief_payload = {
        "organization_id": org_id,
        "brief": "Modern academic ID card with navy blue header, student photo, blood group and QR code verification.",
        "category": "School",
        "orientation": "Landscape",
        "card_width": 3.375,
        "card_height": 2.125
    }
    neg_ai = client.post("/api/ai/design/generate", json=brief_payload, headers=headers_a)
    assert neg_ai.status_code == 403 # Strictly forbidden for organization

    # 2. Positive test: Vendor user creates the design
    login_v = client.post("/api/auth/login", json={"username": "alan_vnd", "password": "vendorpassword123"})
    assert login_v.status_code == 200
    token_v = login_v.json()["access_token"]
    headers_v = {"Authorization": f"Bearer {token_v}"}

    ai_res = client.post("/api/ai/design/generate", json=brief_payload, headers=headers_v)
    assert ai_res.status_code == 200
    data = ai_res.json()
    assert data["status"] == "success"
    assert data["count"] >= 3
    variations = data["variations"]
    assert len(variations) >= 3

    for var in variations:
        assert "front" in var
        assert "back" in var
        assert len(var["front"]["elements"]) > 0
        assert "quality_score" in var
        assert var["quality_score"] > 80.0

def test_chat_to_canvas_operations():
    client = TestClient(app)
    db = TestingSessionLocal()
    org = db.query(Organization).first()
    db.close()

    current_layout = {
        "elements": [
            {"id": "photo-1", "type": "photo", "x": 20, "y": 60, "width": 80, "height": 100},
            {"id": "name-1", "type": "text", "value": "{{student.name}}", "font_size": 12}
        ]
    }

    # 1. Negative test: Org Admin cannot mutate design canvas
    login_a = client.post("/api/auth/login", json={"username": "alice_admin", "password": "password123"})
    headers_a = {"Authorization": f"Bearer {login_a.json()['access_token']}"}

    neg_refine = client.post("/api/ai/design/chat-refine", json={
        "organization_id": str(org.id),
        "current_layout": current_layout,
        "user_command": "Move photo to the right and increase name font size"
    }, headers=headers_a)
    assert neg_refine.status_code == 403

    # 2. Positive test: Vendor user mutates design canvas
    login_v = client.post("/api/auth/login", json={"username": "alan_vnd", "password": "vendorpassword123"})
    assert login_v.status_code == 200
    headers_v = {"Authorization": f"Bearer {login_v.json()['access_token']}"}

    refine_res = client.post("/api/ai/design/chat-refine", json={
        "organization_id": str(org.id),
        "current_layout": current_layout,
        "user_command": "Move photo to the right and increase name font size"
    }, headers=headers_v)
    assert refine_res.status_code == 200
    refine_data = refine_res.json()
    assert "operations" in refine_data
    assert len(refine_data["operations"]) > 0
    assert "explanation" in refine_data
    assert "updated_layout" in refine_data

def test_design_approval_immutable_template():
    client = TestClient(app)
    db = TestingSessionLocal()
    org = db.query(Organization).first()
    db.close()

    # 1. Negative test: Org Admin cannot create design projects
    login_a = client.post("/api/auth/login", json={"username": "alice_admin", "password": "password123"})
    token_a = login_a.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    project_payload = {
        "organization_id": str(org.id),
        "name": "2026 Academic Badge",
        "brief": "Blue and gold modern campus theme",
        "card_category": "School",
        "initial_variations": [
            {
                "variation_name": "Executive Minimal",
                "style_family": "minimal",
                "front": {"elements": [{"type": "text", "value": "STUDENT CARD"}]},
                "back": {"elements": []}
            }
        ]
    }
    neg_proj = client.post("/api/design/projects", json=project_payload, headers=headers_a)
    assert neg_proj.status_code == 403

    # 2. Positive test: Vendor creates the design project
    login_v = client.post("/api/auth/login", json={"username": "alan_vnd", "password": "vendorpassword123"})
    assert login_v.status_code == 200
    headers_v = {"Authorization": f"Bearer {login_v.json()['access_token']}"}

    proj_res = client.post("/api/design/projects", json=project_payload, headers=headers_v)
    assert proj_res.status_code == 201
    proj_id = proj_res.json()["id"]

    # 3. Vendor submits design to Organization
    sub_res = client.post(f"/api/design/projects/{proj_id}/submit", headers=headers_v)
    assert sub_res.status_code == 200

    # 4. Organization Admin inspects and approves design -> locks into immutable template
    get_proj = client.get(f"/api/design/projects/{proj_id}", headers=headers_a)
    assert get_proj.status_code == 200
    variation_id = get_proj.json()["variations"][0]["id"]

    review_res = client.post(f"/api/design/projects/{proj_id}/review", json={
        "variation_id": variation_id,
        "decision": "Approved",
        "comments": "Layout and typography approved by principal office."
    }, headers=headers_a)
    assert review_res.status_code == 200
    review_data = review_res.json()
    assert review_data["status"] == "Approved"
    assert "template_id" in review_data

def test_batch_snapshot_and_print_job_lifecycle():
    client = TestClient(app)
    db = TestingSessionLocal()
    org = db.query(Organization).first()
    template_ver = db.query(TemplateVersion).first()
    db.close()

    # Super Admin login
    sa_login = client.post("/api/auth/login", json={"username": "superadmin", "password": "superpass123"})
    sa_token = sa_login.json()["access_token"]
    sa_headers = {"Authorization": f"Bearer {sa_token}"}

    # Org Admin login
    login_a = client.post("/api/auth/login", json={"username": "alice_admin", "password": "password123"})
    token_a = login_a.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # Vendor login
    login_v = client.post("/api/auth/login", json={"username": "alan_vnd", "password": "vendorpassword123"})
    assert login_v.status_code == 200
    headers_v = {"Authorization": f"Bearer {login_v.json()['access_token']}"}

    # 1. Org Admin creates Immutable Batch Snapshot
    snap_res = client.post("/api/production/batch-snapshots", json={
        "organization_id": str(org.id),
        "template_version_id": str(template_ver.id),
        "batch_name": "Q1 2026 Batch",
        "print_settings": {"imposition": "duplex", "crop_marks": True}
    }, headers=headers_a)
    assert snap_res.status_code == 201
    snapshot_data = snap_res.json()
    snapshot_id = snapshot_data["id"]
    assert snapshot_data["is_locked"] is True

    # 2. Negative test: Org Admin must NOT submit physical print jobs
    job_payload = {
        "batch_snapshot_id": snapshot_id,
        "card_material": "Standard PVC (30 mil)",
        "lamination_type": "Glossy UV",
        "delivery_recipient": "John Principal",
        "delivery_phone": "9998887776",
        "delivery_address": "123 Campus Road",
        "delivery_city": "Chennai",
        "delivery_state": "Tamil Nadu",
        "delivery_pincode": "600001"
    }
    neg_job = client.post("/api/production/jobs", json=job_payload, headers=headers_a)
    assert neg_job.status_code == 403

    # 3. Positive test: Vendor validates and submits Print Job to Super Admin
    job_res = client.post("/api/production/jobs", json=job_payload, headers=headers_v)
    assert job_res.status_code == 201
    job_data = job_res.json()
    job_uuid = job_data["id"]
    assert job_data["status"] == "Awaiting Review"
    assert job_data["total_amount"] > 0

    # 4. Super Admin advances status machine: Awaiting Review -> Approved for Production
    step1 = client.patch(f"/api/production/jobs/{job_uuid}/status", json={
        "status": "Approved for Production",
        "reason": "Files and payment requirements confirmed."
    }, headers=sa_headers)
    assert step1.status_code == 200

    # 4. Super Admin moves to Printing
    step2 = client.patch(f"/api/production/jobs/{job_uuid}/status", json={
        "status": "Queued"
    }, headers=sa_headers)
    assert step2.status_code == 200

    step3 = client.patch(f"/api/production/jobs/{job_uuid}/status", json={
        "status": "Printing"
    }, headers=sa_headers)
    assert step3.status_code == 200

    # 5. Record Quality Control Check
    qc_res = client.post(f"/api/production/jobs/{job_uuid}/qc", json={
        "check_name": "Color Fidelity & Duplex Alignment",
        "passed": True,
        "notes": "Verified hairline alignment on front and back."
    }, headers=sa_headers)
    assert qc_res.status_code == 200
    assert qc_res.json()["passed"] is True

def test_vendor_invitation_and_activation_lifecycle():
    client = TestClient(app)
    sa_login = client.post("/api/auth/login", json={"username": "superadmin", "password": "superpass123"})
    sa_token = sa_login.json()["access_token"]
    sa_headers = {"Authorization": f"Bearer {sa_token}"}

    # 1. Super Admin invites a new Vendor
    invite_res = client.post("/api/vendors/invite", json={
        "business_name": "Apex ID Solutions",
        "contact_name": "Rohan Verma",
        "email": "rohan@apexidsolutions.com",
        "phone": "9876543210",
        "plan_slug": "pro"
    }, headers=sa_headers)
    assert invite_res.status_code == 201
    inv_data = invite_res.json()
    token = inv_data["invitation_token"]
    assert token is not None

    # 2. Inspect Invitation details
    insp_res = client.get(f"/api/auth/invitations/{token}")
    assert insp_res.status_code == 200
    assert insp_res.json()["email"] == "rohan@apexidsolutions.com"
    assert insp_res.json()["role"] == "VENDOR_ADMIN"

    # 3. Vendor activates account
    act_res = client.post("/api/auth/activate-vendor", json={
        "token": token,
        "full_name": "Rohan Verma",
        "username": "rohan_apex",
        "password": "SecretPassword123!"
    })
    assert act_res.status_code == 200
    vendor_token = act_res.json()["access_token"]
    assert vendor_token is not None

    # 4. Activated vendor calls /me
    me_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {vendor_token}"})
    assert me_res.status_code == 200
    assert "VENDOR" in me_res.json()["roles"]
    assert me_res.json()["vendor_id"] is not None

def test_organization_admin_invitation_and_activation():
    client = TestClient(app)
    # Login as Rohan vendor
    login_vnd = client.post("/api/auth/login", json={"username": "rohan_apex", "password": "SecretPassword123!"})
    vnd_token = login_vnd.json()["access_token"]
    vnd_headers = {"Authorization": f"Bearer {vnd_token}"}

    me_res = client.get("/api/auth/me", headers=vnd_headers)
    vendor_id = me_res.json()["vendor_id"]

    # 1. Vendor invites Organization Admin
    org_invite_res = client.post(f"/api/vendors/{vendor_id}/organizations/invite", json={
        "name": "St. Xavier International School",
        "org_type": "School",
        "admin_name": "Sister Mary",
        "admin_email": "principal@stxaviers.edu",
        "city": "Mumbai",
        "state": "Maharashtra"
    }, headers=vnd_headers)
    assert org_invite_res.status_code == 201
    org_inv_data = org_invite_res.json()
    token = org_inv_data["invitation_token"]
    assert token is not None

    # 2. Org Admin activates account
    org_act_res = client.post("/api/auth/activate-org-admin", json={
        "token": token,
        "full_name": "Sister Mary",
        "username": "mary_principal",
        "password": "PrincipalPassword123!"
    })
    assert org_act_res.status_code == 200
    org_token = org_act_res.json()["access_token"]
    assert org_token is not None

    # 3. Org Admin verifies membership
    org_me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {org_token}"})
    assert org_me.status_code == 200
    assert "ORGANIZATION_ADMIN" in org_me.json()["roles"]
    assert org_me.json()["organization_id"] is not None

def test_celery_worker_tasks():
    from app.workers.tasks import worker_health_check
    res = worker_health_check()
    assert res["status"] == "ok"

def test_class_management_and_staff_scoping():
    client = TestClient(app)
    # 1. Login as Org Admin (alice_admin)
    login_a = client.post("/api/auth/login", json={"username": "alice_admin", "password": "password123"})
    assert login_a.status_code == 200
    token_a = login_a.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # 2. Org Admin creates Class 10-A
    create_cls = client.post("/api/organization/classes", json={
        "name": "Class 10-A",
        "section": "A",
        "description": "Secondary Board Exam Section A"
    }, headers=headers_a)
    assert create_cls.status_code == 201
    cls_data = create_cls.json()
    assert cls_data["name"] == "Class 10-A"

    # 3. Org Admin creates Class Staff assigned to Class 10-A
    create_staff = client.post("/api/staff", json={
        "full_name": "Priya Sharma",
        "email": "priya.class10@example.com",
        "username": "priya_10a",
        "password": "staffpass123",
        "role_name": "STAFF",
        "assigned_class": "Class 10-A"
    }, headers=headers_a)
    assert create_staff.status_code == 201
    staff_data = create_staff.json()
    assert staff_data["assigned_class"] == "Class 10-A"

    # 4. Login as Staff
    login_s = client.post("/api/auth/login", json={"username": "priya_10a", "password": "staffpass123"})
    assert login_s.status_code == 200
    token_s = login_s.json()["access_token"]
    headers_s = {"Authorization": f"Bearer {token_s}"}

    # 5. Staff creates student in Class 10-A
    create_student = client.post("/api/members", json={
        "member_id": "STU-10A-001",
        "name": "Kavita Raman",
        "class_name": "Class 10-A",
        "section": "A"
    }, headers=headers_s)
    assert create_student.status_code == 201
    stu = create_student.json()
    assert stu["status"] == "DRAFT"
    assert stu["class_name"] == "Class 10-A"

    # 6. Staff submits student for Org Admin review
    sub_stu = client.post(f"/api/members/{stu['id']}/submit", headers=headers_s)
    assert sub_stu.status_code == 200
    assert sub_stu.json()["status"] == "SUBMITTED"

    # 7. Org Admin approves student
    app_stu = client.post(f"/api/members/{stu['id']}/approve", headers=headers_a)
    assert app_stu.status_code == 200
    assert app_stu.json()["status"] == "APPROVED"

def test_production_command_center_and_metrics():
    client = TestClient(app)
    # Super Admin login
    sa_login = client.post("/api/auth/login", json={"username": "superadmin", "password": "superpass123"})
    sa_headers = {"Authorization": f"Bearer {sa_login.json()['access_token']}"}

    # Fetch live metrics summary
    metrics_res = client.get("/api/production/metrics/summary", headers=sa_headers)
    assert metrics_res.status_code == 200
    metrics = metrics_res.json()
    assert metrics["role"] == "SUPER_ADMIN"
    assert "active_vendors" in metrics
    assert "total_organizations" in metrics
    assert "jobs_awaiting_review" in metrics

    # Org Admin metrics
    login_a = client.post("/api/auth/login", json={"username": "alice_admin", "password": "password123"})
    org_metrics_res = client.get("/api/production/metrics/summary", headers={"Authorization": f"Bearer {login_a.json()['access_token']}"})
    assert org_metrics_res.status_code == 200
    org_metrics = org_metrics_res.json()
    assert org_metrics["role"] == "ORGANIZATION"
    assert "total_classes" in org_metrics
    assert "total_students" in org_metrics

def test_health_and_observability_endpoints():
    client = TestClient(app)
    # 1. Root health probe
    res_root = client.get("/health")
    assert res_root.status_code == 200
    data_root = res_root.json()
    assert data_root["status"] == "ok"
    assert data_root["database"] == "healthy"
    # SRE header verification
    assert "x-request-id" in res_root.headers
    assert "x-response-time-ms" in res_root.headers

    # 2. API health probe
    res_api = client.get("/api/health")
    assert res_api.status_code == 200
    data_api = res_api.json()
    assert data_api["status"] == "ok"
    assert "timestamp" in data_api

def test_security_auth_validation_and_error_handling():
    client = TestClient(app)
    # 1. Unauthenticated request to protected endpoint
    res_no_auth = client.get("/api/auth/me")
    assert res_no_auth.status_code == 401

    # 2. Invalid credentials login
    res_bad_login = client.post("/api/auth/login", json={
        "username": "non_existent_user_999",
        "password": "WrongPassword999!"
    })
    assert res_bad_login.status_code == 401

    # 3. Input validation: missing required fields on registration (422)
    res_invalid_input = client.post("/api/auth/register", json={
        "name": "Incomplete Payload School"
        # missing admin_username, admin_password, etc.
    })
    assert res_invalid_input.status_code == 422

    # 4. Invalid JWT token rejection
    res_invalid_token = client.get("/api/auth/me", headers={"Authorization": "Bearer invalid.fake.token"})
    assert res_invalid_token.status_code == 401

    # 5. Valid Super Admin authentication
    sa_login = client.post("/api/auth/login", json={"username": "superadmin", "password": "superpass123"})
    assert sa_login.status_code == 200
    sa_token = sa_login.json()["access_token"]
    assert sa_token is not None
    sa_me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {sa_token}"})
    assert sa_me.status_code == 200
    assert "SUPER_ADMIN" in sa_me.json()["roles"]
