from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.core.config import settings
from app.core.database import engine, Base
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

app = FastAPI(
    title="Madani ID Platform API",
    description="Backend API for Madani Enterprises AI-Powered ID Card SaaS Platform",
    version="2.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:3002",
        "http://127.0.0.1:3002",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
    return {"message": "Welcome to Madani ID Platform API"}
