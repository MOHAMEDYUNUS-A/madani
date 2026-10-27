# Madani Enterprises ID Platform — DevOps & Production Operations Runbook

## 1. System Architecture & Topology

```
                         [ Internet / Client Traffic ]
                                      |
                                      v (Ports 80 / 443)
                         +-------------------------+
                         |      Nginx Gateway      |
                         |  (Reverse Proxy / WAF)  |
                         +-------------------------+
                                 |         |
                  /api & /health |         | / & static assets
                                 v         v
               +--------------------+   +--------------------+
               |   FastAPI Backend  |   |  Next.js Frontend  |
               | (Port 8000 internal|   | (Port 3000 internal|
               +--------------------+   +--------------------+
                       |          |
         Task Enqueue  v          v Relational Data
               +-----------+   +-------------------+
               | Redis 7.0 |   | PostgreSQL 15     |
               |  (Broker) |   | (Internal Network)|
               +-----------+   +-------------------+
                     |
                     v
             +---------------+
             | Celery Worker |
             | (Async Print) |
             +---------------+
```

---

## 2. Developer Quick-Start & Testing Commands

### 2.1 Backend Automated Testing
Run the backend test suite with isolated SQLite database and code coverage:
```bash
cd backend
python -m pytest tests -v --cov=app --cov-report=term-missing
```

### 2.2 Playwright Browser End-to-End Tests
Run the automated end-to-end suite across desktop and mobile viewports:
```bash
cd frontend
# Run in headless mode
npx playwright test --project=chromium

# Run with interactive UI inspector
npx playwright test --ui
```

### 2.3 k6 Load & Performance SLA Testing
Execute controlled load testing with performance thresholds (p95 < 500ms, error rate < 1%):
```bash
# Ensure backend is running on port 8000
k6 run --env TARGET_URL=http://127.0.0.1:8000 load_tests/api_load_test.js
```

### 2.4 TypeScript & Lint Verification
```bash
cd frontend
npm run lint
npx tsc --noEmit
npm run build
```

---

## 3. Automated CI/CD Pipeline (`.github/workflows`)

| Workflow File | Trigger | Purpose |
|---|---|---|
| `.github/workflows/ci.yml` | `push`, `pull_request` | Ruff lint, Pytest 16/16 with coverage, TypeScript typecheck, Next.js build, Playwright 9/9 E2E tests, and Docker container verification |
| `.github/workflows/security.yml` | `push`, weekly cron | Trivy dependency scan, Trivy container image scan, GitLeaks secret detection, SARIF GitHub security reporting |
| `.github/workflows/performance.yml` | Manual, weekly cron | Automated k6 load testing against staging with SLA p95 latency verification |
| `.github/workflows/deploy.yml` | `push` on `main` | Staging deployment, smoke tests, manual production approval gate, automated rollback |

---

## 4. Production Deployment Procedures

### 4.1 First-Time Deployment
1. Copy `.env.example` to `.env` on production host:
   ```bash
   cp .env.example .env
   # Edit .env with production credentials and JWT secret
   ```
2. Launch production stack with zero exposed internal database ports:
   ```bash
   docker compose -f docker-compose.prod.yml up -d --build
   ```
3. Verify all services are healthy:
   ```bash
   docker compose -f docker-compose.prod.yml ps
   curl -s http://localhost/health | jq .
   ```

### 4.2 Zero-Downtime Rolling Update
To deploy a new version without taking down the database or Redis:
```bash
# 1. Take safety snapshot
python scripts/backup_db.py --tag "pre-deploy-$(git rev-parse --short HEAD)"

# 2. Pull or build latest images
docker compose -f docker-compose.prod.yml build backend frontend

# 3. Rolling restart of application services
docker compose -f docker-compose.prod.yml up -d --no-deps backend frontend

# 4. Probe health endpoint
curl --fail http://localhost/health
```

---

## 5. Backup, Disaster Recovery & Rollback Strategy

### 5.1 Automated Snapshots
Create a timestamped, gzip-compressed snapshot with SHA256 checksum:
```bash
python scripts/backup_db.py --tag "release-v2.0"
```
Backups are saved in `./backups/` and automatically retain the last 14 days of history.

### 5.2 Rollback & Database Restore
List available snapshots:
```bash
python scripts/restore_db.py --list
```
Restore the most recent verified backup:
```bash
python scripts/restore_db.py --latest
```
Rollback application containers to previous commit tag:
```bash
git checkout HEAD~1
docker compose -f docker-compose.prod.yml up -d --no-deps backend frontend
```

---

## 6. SRE Observability & Monitoring

### 6.1 Health Probes
- **Root Health**: `GET /health` — checks HTTP 200, PostgreSQL `SELECT 1`, and Redis latency.
- **API Health**: `GET /api/health` — JSON timestamped health for upstream probes.

### 6.2 Prometheus Telemetry
- **Prometheus Metrics**: `GET /metrics`
  - `madani_app_info{version="2.0.0", environment="production"}`
  - `madani_uptime_seconds`: Process uptime counter.
  - `madani_database_up`: Database connectivity gauge (1 = healthy, 0 = unhealthy).

### 6.3 End-to-End Tracing
- All requests through Nginx receive a unique `$request_id` passed downstream as `X-Request-ID`.
- Backend emits response headers:
  - `X-Request-ID`: Distributed correlation ID.
  - `X-Response-Time-Ms`: High-resolution request processing time in milliseconds.
