import sys
from pathlib import Path

# Automatically add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent / "backend"
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import uuid
from datetime import date

from app.core.database import SessionLocal
from app.models.user import User
from app.models.organization import Organization, OrganizationClass
from app.models.member import Member
from app.models.design import DesignProject

db = SessionLocal()

u = db.query(User).filter(User.username == "alice_admin").first()
if not u or not u.organization_id:
    print("alice_admin or organization not found")
    exit(1)

org_id = u.organization_id
org = db.query(Organization).filter(Organization.id == org_id).first()
print(f"Target Org: {org.name} ({org_id})")

# Ensure classes exist
c1 = db.query(OrganizationClass).filter(OrganizationClass.organization_id == org_id, OrganizationClass.name == "Grade 10").first()
if not c1:
    c1 = OrganizationClass(
        organization_id=org_id,
        name="Grade 10",
        section="A"
    )
    db.add(c1)

c2 = db.query(OrganizationClass).filter(OrganizationClass.organization_id == org_id, OrganizationClass.name == "Grade 12").first()
if not c2:
    c2 = OrganizationClass(
        organization_id=org_id,
        name="Grade 12",
        section="Science"
    )
    db.add(c2)

db.commit()

# Ensure design project exists
design = db.query(DesignProject).filter(DesignProject.organization_id == org_id).first()
if not design:
    design = DesignProject(
        organization_id=org_id,
        vendor_id=org.vendor_id,
        name="Academic Premium Showcase Template",
        status="Approved"
    )
    db.add(design)
    db.commit()

# Student data
sample_students = [
    {
        "member_id": "MAD-2026-1001",
        "name": "Zayd Mohamed",
        "admission_number": "ADM/2026/089",
        "class_name": "Grade 10",
        "section": "A",
        "blood_group": "O+",
        "dob": date(2008, 5, 14),
        "phone": "+91 98765 43210",
        "address": "12 Crescent Avenue, Chennai, TN",
        "photo_url": "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=400",
        "status": "APPROVED"
    },
    {
        "member_id": "MAD-2026-1002",
        "name": "Amina Fatima",
        "admission_number": "ADM/2026/092",
        "class_name": "Grade 10",
        "section": "A",
        "blood_group": "B+",
        "dob": date(2008, 9, 22),
        "phone": "+91 98765 43211",
        "address": "45 Greenways Road, Chennai, TN",
        "photo_url": "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=400",
        "status": "APPROVED"
    },
    {
        "member_id": "MAD-2026-1003",
        "name": "Rohan Sharma",
        "admission_number": "ADM/2026/105",
        "class_name": "Grade 12",
        "section": "Science",
        "blood_group": "A+",
        "dob": date(2006, 3, 11),
        "phone": "+91 98765 43212",
        "address": "78 Mount Road, Chennai, TN",
        "photo_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400",
        "status": "APPROVED"
    },
    {
        "member_id": "MAD-2026-1004",
        "name": "Kavya Sundaram",
        "admission_number": "ADM/2026/114",
        "class_name": "Grade 12",
        "section": "Science",
        "blood_group": "AB+",
        "dob": date(2006, 11, 4),
        "phone": "+91 98765 43213",
        "address": "22 Anna Nagar, Chennai, TN",
        "photo_url": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=400",
        "status": "APPROVED"
    }
]

created_count = 0
for s in sample_students:
    existing = db.query(Member).filter(Member.organization_id == org_id, Member.member_id == s["member_id"]).first()
    if not existing:
        m = Member(
            organization_id=org_id,
            **s
        )
        db.add(m)
        created_count += 1

db.commit()
print(f"Successfully added {created_count} students to {org.name}.")
db.close()
