# DevOps Architecture & Automation Pipeline

## 1. System Topology & Pipeline Flow

```mermaid
flowchart TD
    subgraph Source Control & Trigger
        Dev[Developer Commit / PR] -->|Push to main or PR| GH[GitHub Repository]
    end

    subgraph CI Quality Automation Pipeline
        GH --> CI_Lint[Frontend & Backend Linting]
        GH --> CI_Test[Vitest + Pytest Unit & Integration Tests]
        GH --> CI_E2E[Playwright End-to-End Suite]
        CI_Lint & CI_Test & CI_E2E --> CI_Gate{CI Quality Gate Passed?}
    end

    subgraph Security & Vulnerability Scanning
        CI_Gate -->|Yes| Sec_Secret[GitLeaks Secret Scan]
        CI_Gate -->|Yes| Sec_Trivy[Trivy Filesystem & Container Scan]
        CI_Gate -->|Yes| Sec_Bandit[Bandit AST Security Scan]
        CI_Gate -->|Yes| Sec_ZAP[OWASP ZAP DAST Baseline Scan]
        Sec_Secret & Sec_Trivy & Sec_Bandit & Sec_ZAP --> Sec_Gate{Zero Critical Vulnerabilities?}
    end

    subgraph Staging Deployment
        Sec_Gate -->|Yes| Stg_Build[Build Multi-Stage Docker Images]
        Stg_Build --> Stg_Deploy[Deploy Staging Containers]
        Stg_Deploy --> Stg_Smoke[Run scripts/smoke_test.py]
    end

    subgraph Production Deployment Gate
        Stg_Smoke -->|Passed| Prod_Backup[Trigger Pre-Deploy DB Snapshot]
        Prod_Backup --> Prod_Rollout[Zero-Downtime Rolling Update]
        Prod_Rollout --> Prod_Probe[Production Synthetic Health Check]
        Prod_Probe -->|Success| Prod_Live[Production Live & Monitored]
        Prod_Probe -->|Failure| Prod_Rollback[Automated Rollback & DB Restore]
    end
```

---

## 2. Environments Matrix

| Environment | Purpose | Ingress URL | Database | Scaling / Isolation |
| :--- | :--- | :--- | :--- | :--- |
| **Development** | Local iteration & testing | `http://localhost:3000`<br>`http://127.0.0.1:8000` | Local PostgreSQL 15 | Standalone processes / Docker Compose |
| **Staging** | Automated QA & smoke tests | `https://staging.madani-id.internal` | Dedicated staging DB | Isolated bridge network `madani_prod_net` |
| **Production** | Live tenant operations | `https://app.madani-id.com` | Production HA cluster | Zero exposed DB ports, multi-replica ASGI |

---

## 3. GitHub Actions CI/CD Workflows

### 1. `ci.yml` (Continuous Integration)
* **Triggers**: Push to `main`, `master`, and Pull Requests.
* **Jobs**:
  * `backend-qa`: Python 3.12, strict Flake8 linting, Pytest (17 integration tests), transaction rollback verification.
  * `frontend-qa`: Node.js 20, strict ESLint flat config, TypeScript compile check (`tsc --noEmit`), Vitest suite (7 unit tests).
  * `e2e-qa`: Chromium headless browser, Playwright end-to-end user journeys (9 UI tests).

### 2. `security.yml` (Security & Vulnerability Scanning)
* **Triggers**: Push to `main`, PRs, and weekly scheduled scan (Mondays at 04:00 UTC).
* **Jobs**:
  * `secret-scan`: GitLeaks scan detecting hardcoded API keys or high-entropy credentials.
  * `dependency-scan`: Trivy scanning dependencies for CRITICAL/HIGH CVEs with SARIF upload.
  * `container-security-scan`: Trivy scanning built Docker container layers.
  * `bandit-sast`: Python AST vulnerability inspection.
  * `owasp-zap-scan`: Automated DAST baseline scanning against `/health` and API routes.

### 3. `performance.yml` (Performance & Load SLA)
* **Triggers**: Manual dispatch and weekly schedule (Sundays at 00:00 UTC).
* **Jobs**:
  * `k6-load-test`: Automated traffic simulation verifying `p95 < 500ms` and `error_rate < 1%`.

### 4. `deploy.yml` (Staging & Production Release)
* **Triggers**: Push to `main` and manual dispatch.
* **Jobs**:
  * `deploy-staging`: Image build, deployment, and automated smoke testing (`scripts/smoke_test.py`).
  * `deploy-production`: Requires staging success, automated pre-deploy PostgreSQL snapshot, zero-downtime rolling update, and synthetic verification with automated rollback.

---

## 4. Branching Strategy & Release Lifecycle
* **`main`**: Protected branch representing deployment-ready code. Direct commits require passing CI checks.
* **Feature Branches (`feat/...`, `fix/...`)**: Developers create isolated feature branches and open Pull Requests.
* **Release Tags (`vX.Y.Z`)**: Semantic versioning tags generate automated container releases and changelog manifests.
