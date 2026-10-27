from app.core.database import SessionLocal, engine
from sqlalchemy import text, inspect

def inspect_db():
    db = SessionLocal()
    try:
        print("=" * 60)
        print(f"  MADANI DATABASE ({engine.url})")
        print("=" * 60)
        
        inspector = inspect(engine)
        tables = inspector.get_table_names()

        if not tables:
            print("No tables found in database.")
            return

        print(f"\nFound {len(tables)} tables:\n")
        for table_name in tables:
            try:
                count = db.execute(text(f'SELECT COUNT(*) FROM "{table_name}"')).scalar()
                print(f"  • {table_name:<25} ({count} rows)")
            except Exception:
                print(f"  • {table_name:<25}")

        print("\n" + "-" * 60)
        print("Sample Registered Users:")
        print("-" * 60)
        try:
            users = db.execute(text('SELECT username, full_name, email, is_active FROM users LIMIT 5')).fetchall()
            for u in users:
                print(f"  User: {u[0]} | Name: {u[1]} | Email: {u[2]} | Active: {u[3]}")
        except Exception as e:
            print(f"  Could not read users: {e}")

        print("\n" + "-" * 60)
        print("Sample Organizations:")
        print("-" * 60)
        try:
            orgs = db.execute(text('SELECT org_id, name, org_type FROM organizations LIMIT 5')).fetchall()
            for o in orgs:
                print(f"  Org ID: {o[0]} | Name: {o[1]} | Type: {o[2]}")
        except Exception as e:
            print(f"  Could not read organizations: {e}")

        print("\n" + "=" * 60)
    finally:
        db.close()

if __name__ == "__main__":
    inspect_db()
