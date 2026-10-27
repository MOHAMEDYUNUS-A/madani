# Task Checklist - Madani ID Card Management & Printing Platform

## 1. Project Initialization & Structure
- [x] Initialize project directories: `frontend`, `backend`, `worker`, `docker`
- [x] Add `.env.example` and base environment setup
- [x] Set up Dockerfile and docker-compose orchestration

## 2. Database Models & Migrations
- [x] Create Alembic migration setup in `backend/migrations`
- [x] Design and implement SQLAlchemy DB models matching the ER schema
- [x] Apply indexes on tenant fields and soft-delete setups

## 3. Backend Core & Authentication (RBAC)
- [x] Build tenant-isolated authentication endpoints (JWT cookie-based)
- [x] Implement data-driven RBAC check middleware (verify role, tenant ownership, and permissions)
- [x] Implement global error handling, logging, and rate limiting

## 4. Student Management & Data Pipelines
- [x] Develop student CRUD endpoints (tenant-scoped) with duplicate detection
- [x] Implement photo upload & normalization pipelines (Exif fix, crop, resolution checks)
- [x] Build Excel/CSV upload chunked parsing and ZIP photo auto-matching

## 5. Templates & Drag-and-Drop Designer Backend
- [x] Build endpoints for global read-only templates and tenant copies
- [x] Implement template versioning & dynamic variables resolution services
- [x] Design JSON layout parser to structure cards (front, back, shapes, lines, images, text, QR codes)

## 6. Frontend: Next.js Layout & Pages
- [x] Set up Next.js Tailwind-based theme with custom branding capability
- [x] Build Public Landing Page, Register Wizard, and Onboarding layouts
- [x] Implement Student dashboard (paginated table, manual add/edit drawer, import validation UI)
- [x] Implement Drag-and-Drop Designer Canvas panel with smart guides and text/photo properties

## 7. Background Worker & Print PDF Generation
- [x] Set up Celery/Redis worker queue configurations
- [x] Implement vector/DPI-accurate card compositor (front + back merging)
- [x] Implement page imposition layout (margins, bleed, crop marks, cards per page)
- [x] Build pre-flight validation checklist (low resolution, overflow check, missing fields)

## 8. Printing Order Workflow
- [x] Build Order creation and submission endpoints for Org dashboard
- [x] Build Madani Admin dashboard (order status timeline, quotation update, payment confirmation)
- [x] Add public QR verification route with Whitelisted attributes only

## 9. Testing & Verification
- [x] Write pytest suites testing multi-tenant isolation negative cases
- [x] Validate manual student photo adjustments and canvas layouts
- [x] Verify PDF print metrics and coordinates correctness
- [x] Run full end-to-end user-journey tests
