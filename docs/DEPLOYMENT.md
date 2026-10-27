# Production Deployment & Container Orchestration Guide

## 1. Zero-Downtime Deployment Strategy

Madani ID Platform employs containerized rolling updates orchestrated via Docker Compose or Kubernetes ingress controllers.

### Rolling Update Sequence
```text
1. Automated Pre-Deploy Backup:
   -> python scripts/backup_db.py --tag "pre-deploy-<commit_sha>"
2. Pull Versioned Multi-Stage Container Images:
   -> docker compose -f docker-compose.prod.yml pull
3. Database Migration Execution (if schema changed):
   -> docker compose -f docker-compose.prod.yml run --rm backend alembic upgrade head
4. Rolling Service Update (Zero-Downtime):
   -> docker compose -f docker-compose.prod.yml up -d --no-deps --scale backend=2 --no-recreate backend
5. Health Probe Verification:
   -> curl -sSf http://127.0.0.1:8000/health | grep '"status":"ok"'
6. Decommission Stale Replicas & Switch Traffic
7. Execute Automated Smoke Test Suite:
   -> python scripts/smoke_test.py --backend-url https://app.madani-id.com
```

---

## 2. Multi-Stage Docker Architecture

### Backend Container (`backend/Dockerfile`)
* **Build Stage**: Python 3.12-slim with build tools (`gcc`, `libpq-dev`), compiles wheels into `/root/.cache`.
* **Runtime Stage**: Clean Python 3.12-slim base with only runtime dependencies (`libpq5`).
* **Non-Root Security Context**: Service executes strictly as non-privileged system user `appuser` (`UID 10001`, `GID 10001`).
* **Container Healthcheck**: Native Docker `HEALTHCHECK` probing `http://127.0.0.1:8000/health` every 30s with 5s timeout and 3 retries.

### Frontend Container (`frontend/Dockerfile`)
* **Build Stage**: Node.js 20-alpine executing `npm run build` with Next.js standalone output.
* **Runner Stage**: Minimal Node.js alpine image copying only `.next/standalone`, public assets, and static output.
* **Container Healthcheck**: Native Docker `HEALTHCHECK` probing `http://127.0.0.1:3000/` every 30s.

---

## 3. Production Compose Configuration (`docker-compose.prod.yml`)

### Network Security & Port Isolation
* Internal bridge network: `madani_prod_net`.
* **Database & Cache**: Neither PostgreSQL (`db`) nor Redis (`redis`) expose host ports. They are reachable solely within `madani_prod_net`.
* **Public Ingress**: Only Nginx (`nginx`) exposes ports `80` (HTTP) and `443` (HTTPS) to the public host.

### Production Environment Variables Checklist
Before launching in production, verify these variables in `/opt/madani/.env`:
```ini
ENVIRONMENT=production
JWT_SECRET=<64-char-random-hex-string-from-openssl-rand-hex-32>
POSTGRES_PASSWORD=<strong-random-database-password>
DATABASE_URL=postgresql://madani_admin:<password>@db:5432/madani_production
REDIS_URL=redis://redis:6379/0
CORS_ORIGINS=https://app.madani-id.com
STORAGE_MODE=local
STORAGE_DIR=/app/storage
```

---

## 4. Rollback Runbook (Automated & Manual)

### When to Trigger Rollback
* Deployment smoke test fails (`scripts/smoke_test.py` exits with non-zero).
* `/health` probe returns `HTTP 503` or `degraded`.
* Error rate spikes above 1% within 5 minutes of release.

### Manual Rollback Procedure
```bash
# 1. Immediately revert containers to prior stable git tag or image SHA
docker compose -f docker-compose.prod.yml up -d --no-deps backend:v2.0.0 frontend:v2.0.0

# 2. If database schema was corrupted or incompatible, restore pre-deploy snapshot
python scripts/restore_db.py --latest-snapshot

# 3. Verify health recovery
python scripts/smoke_test.py --backend-url http://127.0.0.1:8000
```
