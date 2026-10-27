from fastapi import FastAPI, Request, Response, status, Depends
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime, timezone
import time
import uuid
import os
import redis

from app.core.config import settings
from app.core.database import engine, Base, get_db
from app.api import (
    auth, 
    organization, 
    staff, 
    members, 
    templates, 
    generation, 
    orders, 
    public,
    vendors,
    ai_design,
    design_projects,
    production
)

# Proactively bind database tables (fallback when alembic migrations aren't run manually yet)
Base.metadata.create_all(bind=engine)

def init_default_admin():
    from app.models.user import User, Role
    from app.models.vendor import SubscriptionPlan
    from app.core.security import get_password_hash
    db = SessionLocal()
    try:
        # Ensure default roles exist
        all_roles = ["SUPER_ADMIN", "VENDOR", "ORGANIZATION_ADMIN", "STAFF_ADMIN", "DATA_ENTRY_STAFF", "STAFF", "DESIGNER", "PRODUCTION_OPERATOR"]
        for role_name in all_roles:
            if not db.query(Role).filter(Role.name == role_name).first():
                db.add(Role(name=role_name, description=f"{role_name} system role"))
        db.commit()

        # Ensure subscription plans exist
        for slug, name in [("trial", "Free Trial"), ("starter", "Starter"), ("pro", "Pro"), ("enterprise", "Enterprise")]:
            if not db.query(SubscriptionPlan).filter(SubscriptionPlan.slug == slug).first():
                db.add(SubscriptionPlan(slug=slug, name=name, price_monthly=499.0))
        db.commit()

        # Ensure superadmin user exists with superpass123
        super_role = db.query(Role).filter(Role.name == "SUPER_ADMIN").first()
        sa = db.query(User).filter(User.username == "superadmin").first()
        if not sa:
            sa = User(
                full_name="Platform Super Admin",
                email="superadmin@madani.com",
                username="superadmin",
                password_hash=get_password_hash("superpass123"),
                is_active=True
            )
            if super_role:
                sa.roles.append(super_role)
            db.add(sa)
            db.commit()
            print("[BOOTSTRAP] Initial superadmin created: superadmin / superpass123")
        else:
            sa.password_hash = get_password_hash("superpass123")
            if super_role and super_role not in sa.roles:
                sa.roles.append(super_role)
            db.commit()
    except Exception as exc:
        db.rollback()
        print(f"[BOOTSTRAP] Seeding notice: {exc}")
    finally:
        db.close()

try:
    init_default_admin()
except Exception as exc:
    print(f"[BOOTSTRAP] Startup initialization notice: {exc}")

app = FastAPI(
    title="Madani ID Platform API",
    description="Backend API for Madani Enterprises AI-Powered ID Card SaaS Platform",
    version="2.0.0"
)

# Dynamic CORS configuration
allowed_origins = [origin.strip() for origin in settings.CORS_ORIGINS.split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# SRE Observability: Request ID and Performance Timing Middleware
@app.middleware("http")
async def add_process_time_and_request_id(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
    start_time = time.time()
    
    response: Response = await call_next(request)
    
    process_time = (time.time() - start_time) * 1000
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Response-Time-Ms"] = f"{process_time:.2f}"
    return response

# Exception handling to avoid leaking raw tracebacks to clients (Section 0.7)
@app.exception_handler(Exception)
def global_exception_handler(request: Request, exc: Exception):
    # Log internal error here
    print(f"CRITICAL ERROR on {request.url.path}: {str(exc)}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred. Please contact system support."}
    )

# Include API Routers
app.include_router(auth.router)
app.include_router(vendors.router)
app.include_router(organization.router)
app.include_router(staff.router)
app.include_router(members.router)
app.include_router(templates.router)
app.include_router(ai_design.router)
app.include_router(design_projects.router)
app.include_router(generation.router)
app.include_router(orders.router)
app.include_router(production.router)
app.include_router(public.router)

# Mount local storage folder as static files
if settings.STORAGE_MODE == "local" and os.path.exists(settings.STORAGE_DIR):
    app.mount("/storage", StaticFiles(directory=settings.STORAGE_DIR), name="storage")

@app.get("/")
def read_root():
    return {"message": "Welcome to Madani ID Platform API", "version": app.version}

_last_redis_check_time = 0.0
_cached_redis_status = "unreachable"

def check_redis_status(redis_url: str) -> str:
    global _last_redis_check_time, _cached_redis_status
    now = time.time()
    if now - _last_redis_check_time < 3.0:
        return _cached_redis_status
    _last_redis_check_time = now
    if not redis_url:
        _cached_redis_status = "disabled"
        return _cached_redis_status
    try:
        r = redis.from_url(redis_url, socket_timeout=0.2, socket_connect_timeout=0.2)
        r.ping()
        _cached_redis_status = "healthy"
    except Exception:
        _cached_redis_status = "unreachable"
    return _cached_redis_status

@app.get("/health")
@app.get("/api/health")
def health_check(db: Session = Depends(get_db)):
    """
    Production Liveness & Readiness Probe
    Verifies database and redis cache connectivity.
    """
    db_status = "healthy"
    try:
        db.execute(text("SELECT 1"))
    except Exception as exc:
        db_status = f"unhealthy: {str(exc)}"

    redis_status = check_redis_status(settings.REDIS_URL)

    is_healthy = db_status == "healthy"
    status_code = status.HTTP_200_OK if is_healthy else status.HTTP_503_SERVICE_UNAVAILABLE

    return JSONResponse(
        status_code=status_code,
        content={
            "status": "ok" if is_healthy else "degraded",
            "version": app.version,
            "database": db_status,
            "redis": redis_status,
            "environment": settings.ENV,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    )

APP_START_TIME = time.time()

@app.get("/metrics")
def prometheus_metrics(db: Session = Depends(get_db)):
    """
    SRE Prometheus Infrastructure Metrics Endpoint
    Exposes process uptime, DB connectivity gauge, and application version.
    """
    uptime = time.time() - APP_START_TIME
    db_up = 1
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        db_up = 0

    metrics_text = (
        f"# HELP madani_app_info Application build and version information\n"
        f"# TYPE madani_app_info gauge\n"
        f'madani_app_info{{version="{app.version}",environment="{settings.ENV}"}} 1\n\n'
        f"# HELP madani_uptime_seconds Process uptime in seconds\n"
        f"# TYPE madani_uptime_seconds counter\n"
        f"madani_uptime_seconds {uptime:.2f}\n\n"
        f"# HELP madani_database_up Database connection health status (1 = healthy, 0 = down)\n"
        f"# TYPE madani_database_up gauge\n"
        f"madani_database_up {db_up}\n"
    )
    return Response(content=metrics_text, media_type="text/plain; version=0.0.4; charset=utf-8")
