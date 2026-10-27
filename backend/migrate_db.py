import uuid
from sqlalchemy import text, inspect
from app.core.database import SessionLocal, engine, Base
from app.models.user import User, Role
from app.models.vendor import Vendor, VendorSubscription, SubscriptionPlan
from app.models.organization import Organization
from app.core.security import get_password_hash

def migrate_and_seed():
    db = SessionLocal()
    try:
        print("Checking missing columns in PostgreSQL...")
        
        # 1. Ensure users table has vendor_id column
        db.execute(text("""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name='users' AND column_name='vendor_id'
                ) THEN
                    ALTER TABLE users ADD COLUMN vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE;
                    RAISE NOTICE 'Added vendor_id to users';
                END IF;
            END $$;
        """))
        db.commit()
        print("users.vendor_id checked/added.")

        # Ensure users table has assigned_class column
        db.execute(text("""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name='users' AND column_name='assigned_class'
                ) THEN
                    ALTER TABLE users ADD COLUMN assigned_class VARCHAR(255);
                    RAISE NOTICE 'Added assigned_class to users';
                END IF;
            END $$;
        """))
        db.commit()
        print("users.assigned_class checked/added.")

        # Ensure members table has rejection_reason column
        db.execute(text("""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name='members' AND column_name='rejection_reason'
                ) THEN
                    ALTER TABLE members ADD COLUMN rejection_reason TEXT;
                    RAISE NOTICE 'Added rejection_reason to members';
                END IF;
            END $$;
        """))
        db.commit()
        print("members.rejection_reason checked/added.")

        # Ensure organizations table has vendor_id column
        db.execute(text("""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name='organizations' AND column_name='vendor_id'
                ) THEN
                    ALTER TABLE organizations ADD COLUMN vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL;
                    RAISE NOTICE 'Added vendor_id to organizations';
                END IF;
            END $$;
        """))
        db.commit()
        print("organizations.vendor_id checked/added.")

        # 2. Ensure all other tables from Base.metadata exist
        Base.metadata.create_all(bind=engine)
        print("All metadata tables verified.")

        # 3. Ensure essential roles exist
        roles_to_create = [
            ("SUPER_ADMIN", "Madani overall platform admin"),
            ("VENDOR", "ID card print and design vendor"),
            ("ORGANIZATION_ADMIN", "Administrator of organization workspace"),
            ("STAFF", "Operator staff"),
            ("DESIGNER", "ID card template designer")
        ]
        
        roles_map = {}
        for role_name, desc in roles_to_create:
            role = db.query(Role).filter(Role.name == role_name).first()
            if not role:
                role = Role(name=role_name, description=desc)
                db.add(role)
                db.commit()
                db.refresh(role)
                print(f"Created role: {role_name}")
            roles_map[role_name] = role

        # 4. Seed superadmin user
        superadmin = db.query(User).filter(User.username == "superadmin").first()
        if not superadmin:
            superadmin = User(
                username="superadmin",
                email="superadmin@madani.com",
                full_name="Platform Super Administrator",
                password_hash=get_password_hash("superpass123"),
                is_active=True
            )
            superadmin.roles.append(roles_map["SUPER_ADMIN"])
            db.add(superadmin)
            db.commit()
            print("Seeded superadmin / superpass123")
        else:
            # Ensure superadmin has SUPER_ADMIN role
            if roles_map["SUPER_ADMIN"] not in superadmin.roles:
                superadmin.roles.append(roles_map["SUPER_ADMIN"])
                db.commit()
            # Reset password to match quick-fill if needed
            superadmin.password_hash = get_password_hash("superpass123")
            superadmin.is_active = True
            db.commit()
            print("Updated superadmin credentials to match quick-fill.")

        # 5. Seed Vendor (Apex Cards) and rohan_apex user
        vendor = db.query(Vendor).filter(Vendor.vendor_id == "MAD-VND-000001").first()
        if not vendor:
            vendor = Vendor(
                vendor_id="MAD-VND-000001",
                business_name="Apex Card Craft Studios",
                contact_name="Rohan Varma",
                email="rohan@apexcardcraft.com",
                phone="+91 98765 43210",
                address="Industrial Estate, Phase 2, Bangalore, India",
                city="Bangalore",
                state="Karnataka",
                country="India",
                status="Active",
                is_active=True
            )
            db.add(vendor)
            db.commit()
            db.refresh(vendor)
            print("Seeded vendor Apex Card Craft Studios.")

        rohan = db.query(User).filter(User.username == "rohan_apex").first()
        if not rohan:
            rohan = User(
                username="rohan_apex",
                email="rohan@apexcardcraft.com",
                full_name="Rohan Varma",
                password_hash=get_password_hash("SecretPassword123!"),
                is_active=True,
                vendor_id=vendor.id
            )
            rohan.roles.append(roles_map["VENDOR"])
            db.add(rohan)
            db.commit()
            print("Seeded rohan_apex / SecretPassword123!")
        else:
            rohan.vendor_id = vendor.id
            rohan.password_hash = get_password_hash("SecretPassword123!")
            if roles_map["VENDOR"] not in rohan.roles:
                rohan.roles.append(roles_map["VENDOR"])
            rohan.is_active = True
            db.commit()
            print("Updated rohan_apex credentials to match quick-fill.")

        # 6. Seed / ensure alice_admin user for organization
        org = db.query(Organization).first()
        if org:
            alice = db.query(User).filter(User.username == "alice_admin").first()
            if not alice:
                alice = User(
                    username="alice_admin",
                    email="alice@example.com",
                    full_name="Alice Admin",
                    password_hash=get_password_hash("password123"),
                    is_active=True,
                    organization_id=org.id
                )
                alice.roles.append(roles_map["ORGANIZATION_ADMIN"])
                db.add(alice)
                db.commit()
                print("Seeded alice_admin / password123")
            else:
                alice.password_hash = get_password_hash("password123")
                alice.organization_id = org.id
                if roles_map["ORGANIZATION_ADMIN"] not in alice.roles:
                    alice.roles.append(roles_map["ORGANIZATION_ADMIN"])
                alice.is_active = True
                db.commit()
                print("Updated alice_admin credentials to match quick-fill.")

            # 7. Seed / ensure priya_staff user for class staff data entry
            priya = db.query(User).filter(User.username == "priya_staff").first()
            if not priya:
                priya = User(
                    username="priya_staff",
                    email="priya@example.com",
                    full_name="Priya Sharma (Class Staff)",
                    password_hash=get_password_hash("staffpass123"),
                    is_active=True,
                    organization_id=org.id,
                    assigned_class="Grade 1-A"
                )
                priya.roles.append(roles_map["STAFF"])
                db.add(priya)
                db.commit()
                print("Seeded priya_staff / staffpass123")
            else:
                priya.password_hash = get_password_hash("staffpass123")
                priya.organization_id = org.id
                priya.assigned_class = "Grade 1-A"
                if roles_map["STAFF"] not in priya.roles:
                    priya.roles.append(roles_map["STAFF"])
                priya.is_active = True
                db.commit()
                print("Updated priya_staff credentials to match quick-fill.")

        print("\nDatabase migration and seed complete successfully!")
    finally:
        db.close()

if __name__ == "__main__":
    migrate_and_seed()
