# Application Security Architecture & Vulnerability Mitigation

## 1. Security Architecture & Threat Model

The Madani ID Platform implements a defense-in-depth security framework protecting institutional records, student PII, and administrative credentials.

```text
+-------------------------------------------------------------------+
| Perimeter Security: Nginx TLS Termination, CSP, HSTS, X-Frame     |
+-------------------------------------------------------------------+
                                  |
+-------------------------------------------------------------------+
| Transport Security: HTTP-Only, Secure, SameSite=Lax/Strict Cookies|
+-------------------------------------------------------------------+
                                  |
+-------------------------------------------------------------------+
| Authentication & Authorization: JWT (HS256) + Bcrypt + RBAC      |
+-------------------------------------------------------------------+
                                  |
+-------------------------------------------------------------------+
| Data Layer Security: Tenant Scoping + SQL Prepared Statements     |
+-------------------------------------------------------------------+
                                  |
+-------------------------------------------------------------------+
| Infrastructure Security: Non-Root Containers + Internal Bridge Net|
+-------------------------------------------------------------------+
```

---

## 2. Automated Security Scanning Pipeline

The platform runs 4 distinct layers of automated security scanning on every commit and weekly schedule:

| Tool | Focus Area | Execution Target | Policy Gate |
| :--- | :--- | :--- | :--- |
| **GitLeaks** | Secret Scanning | Entire git commit history | Zero unencrypted secrets |
| **Bandit** | Static AST Analysis | `backend/app/` (6,337 lines) | 0 High, 0 Medium severity |
| **Trivy FS & Image** | CVE Vulnerability Scan | Python/Node deps & Docker layers | Zero Critical CVEs |
| **OWASP ZAP** | Dynamic DAST Scan | Live running `/health` & API routes | Zero high-risk findings |

---

## 3. Authentication & Credential Safeguards

### 1. Cryptographic Password Hashing
* User passwords are encrypted using `passlib` with `bcrypt` (12 rounds standard salt).
* Plaintext passwords are never logged, serialized into API responses, or retained in application memory.

### 2. Cookie Security Flags
Session cookies enforce production-grade flags across all authentication routes:
```python
response.set_cookie(
    key="access_token",
    value=token,
    httponly=True,                                  # Prevents XSS script access
    secure=(settings.ENV == "production"),          # Enforces HTTPS transmission
    samesite="lax",                                 # Defends against CSRF attacks
    max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
)
```

### 3. Startup Security Assertion (Pydantic Validator)
In `backend/app/core/config.py`, the backend refuses to start if `ENV=production` while using default development secrets:
```python
@model_validator(mode="after")
def validate_production_security(self) -> "Settings":
    if self.ENV == "production" and self.JWT_SECRET == "supersecretjwtsecretkeychangeinproduction12345!":
        raise ValueError("CRITICAL SECURITY ERROR: Default JWT_SECRET cannot be used in production.")
    return self
```

---

## 4. Network & Container Hardening
* **Non-Root Execution**: Backend container runs as unprivileged user `appuser:10001`.
* **Zero Host Database Exposure**: Host port mapping for PostgreSQL (`5432`) and Redis (`6379`) is omitted in `docker-compose.prod.yml`.
* **Resource Limits**: CPU and memory limits are enforced per container to prevent Denial of Service (DoS) attacks.
