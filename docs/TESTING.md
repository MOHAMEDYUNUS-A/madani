# Quality Assurance & Automated Testing Guide

## 1. Automated Testing Strategy & Architecture

The Madani ID Platform enforces a multi-layered quality assurance matrix ensuring zero regression across multi-tenant isolation, data integrity, frontend UI/UX aesthetics, and high-load performance.

```text
       /\
      /  \        End-to-End Smoke & Playwright Tests (16 tests)
     /----\       UI flows, responsive layouts, auth boundary
    /      \
   /--------\     Backend API & Integration Tests (17 tests)
  /          \    Tenant isolation, DB transactions, Celery, RBAC
 /------------\
/   Unit & AST \  Frontend Vitest (7 tests) + Bandit Security Analysis
----------------  Pydantic validators, React components, API utilities
```

---

## 2. Test Suites Summary

| Test Layer | Framework | Location | Count | Execution Time | Coverage Scope |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Backend Integration** | Pytest | `backend/tests/test_api.py` | 17 | ~26s | Tenant isolation, auth, rollback, templates, PDF |
| **Frontend Unit** | Vitest | `frontend/__tests__/` | 7 | ~4s | Client API resolution, Button states, emerald theme |
| **Frontend E2E** | Playwright | `frontend/e2e/` | 9 | ~18s | Login flow, navigation, responsive design |
| **Performance SLA** | Custom Runner | `load_tests/benchmark_runner.py` | 100 reqs | ~1.1s | p50, p90, p95 latencies, error rate, RPS |
| **Deployment Smoke** | Synthetic Probe | `scripts/smoke_test.py` | 7 checks | ~2s | `/health`, `/metrics`, security boundary, `/login` |

---

## 3. Running Backend Tests (Pytest)

### Prerequisites
Ensure PostgreSQL or SQLite test database is accessible:
```bash
cd backend
python -m pytest tests -v
```

### Specific Integration Scenarios Covered
1. `test_organization_registration`: Self-service tenant signup and schema initialization.
2. `test_login_and_tenant_isolation`: Verifies that Organization A cannot query or read Organization B members.
3. `test_template_isolation`: Immutable template design isolation across tenants.
4. `test_public_qr_verification`: Non-authenticated verification of published student IDs via cryptographic token.
5. `test_vendor_onboarding_and_isolation`: Print vendor scoping and job dispatching.
6. `test_ai_design_multi_variation_generation`: Multi-variation prompt generation.
7. `test_chat_to_canvas_operations`: Real-time chat command parsing to canvas state.
8. `test_database_transaction_rollback_on_failure`: Verifies database transaction atomicity and automatic rollback on unhandled exceptions.
9. `test_security_auth_validation_and_error_handling`: Boundary testing against malformed payloads and invalid credentials.

---

## 4. Running Frontend Tests (Vitest & Playwright)

### Vitest Unit Tests
Executes unit tests in jsdom environment with React Testing Library:
```bash
cd frontend
npm test
```

### Playwright End-to-End Tests
Executes headless browser journeys:
```bash
cd frontend
npx playwright test
```

---

## 5. Performance & SLA Load Testing

Simulate concurrent traffic against any target endpoint:
```bash
python load_tests/benchmark_runner.py --url http://127.0.0.1:8000 --requests 100 --concurrency 5
```

### Production SLA Criteria
* `p95 Latency`: Must remain strictly `< 500ms`.
* `Error Rate`: Must remain strictly `< 1.0%`.

---

## 6. Post-Deployment Smoke Testing

Execute automated validation across backend and frontend services:
```bash
python scripts/smoke_test.py --backend-url http://127.0.0.1:8000 --frontend-url http://localhost:3000
```
Checks:
* `/` -> HTTP 200 with platform version.
* `/health` -> HTTP 200 with `database: healthy`.
* `/api/health` -> HTTP 200.
* `/metrics` -> HTTP 200 with Prometheus uptime gauge.
* `/api/auth/login` -> HTTP 401 with synthetic bad credentials.
* `/api/public/verify/...` -> HTTP 404 resilience.
* `/login` -> HTTP 200 with HTML document structure.
