#!/usr/bin/env python3
"""
Madani Production & Staging Automated Smoke Test Suite
Executes end-to-end post-deployment verification across backend API,
liveness/readiness probes, security handlers, Prometheus metrics,
and frontend rendering.

Exit Code:
  0 - All smoke tests passed successfully.
  1 - One or more smoke tests failed.
"""

import argparse
import json
import sys
import time
import urllib.error
import urllib.request
from typing import Callable, List, Tuple


def probe_endpoint(
    name: str,
    url: str,
    method: str = "GET",
    data: dict = None,
    expected_status: int = 200,
    validator: Callable[[bytes], bool] = None,
    max_retries: int = 5,
    delay_seconds: float = 2.0,
) -> bool:
    """Attempts to probe an endpoint with retry backoff for deployment warm-up."""
    headers = {"User-Agent": "Madani-SmokeTest/2.0"}
    encoded_data = None
    if data:
        encoded_data = json.dumps(data).encode("utf-8")
        headers["Content-Type"] = "application/json"

    print(f"[*] Checking: {name:<45} -> {method} {url}")
    for attempt in range(1, max_retries + 1):
        try:
            req = urllib.request.Request(url, data=encoded_data, headers=headers, method=method)
            with urllib.request.urlopen(req, timeout=10.0) as resp:
                status = resp.status
                body = resp.read()
                if status == expected_status:
                    if validator and not validator(body):
                        print(f"    [RETRY {attempt}/{max_retries}] Response validation failed.")
                        time.sleep(delay_seconds)
                        continue
                    print(f"    [PASS] Status {status} | Validation Passed")
                    return True
                else:
                    print(f"    [RETRY {attempt}/{max_retries}] Got status {status}, expected {expected_status}")
        except urllib.error.HTTPError as err:
            if err.code == expected_status:
                body = err.read()
                if validator and not validator(body):
                    print(f"    [RETRY {attempt}/{max_retries}] Body validation failed on HTTP {err.code}.")
                    time.sleep(delay_seconds)
                    continue
                print(f"    [PASS] Expected HTTP {err.code} received correctly.")
                return True
            print(f"    [RETRY {attempt}/{max_retries}] HTTP error: {err.code}")
        except Exception as exc:
            print(f"    [RETRY {attempt}/{max_retries}] Connection error: {exc}")

        if attempt < max_retries:
            time.sleep(delay_seconds)

    print(f"    [FAIL] Endpoint {name} failed after {max_retries} attempts.")
    return False


def run_smoke_tests(backend_url: str, frontend_url: str, max_retries: int = 5, delay: float = 2.0) -> bool:
    """Runs full suite of synthetic smoke checks."""
    b_base = backend_url.rstrip("/")
    f_base = frontend_url.rstrip("/") if frontend_url else None

    print("=" * 70)
    print("MADANI DEPLOYMENT SMOKE TEST RUNNER")
    print(f"Target Backend:  {b_base}")
    print(f"Target Frontend: {f_base or 'N/A'}")
    print("=" * 70)

    checks: List[Tuple[str, str, str, dict, int, Callable[[bytes], bool]]] = [
        # 1. Root Probe
        (
            "Backend Root Info Endpoint",
            f"{b_base}/",
            "GET",
            None,
            200,
            lambda b: b"Welcome to Madani ID Platform API" in b,
        ),
        # 2. Production Health & Liveness Probe
        (
            "Liveness Probe (/health)",
            f"{b_base}/health",
            "GET",
            None,
            200,
            lambda b: b'"status":"ok"' in b and b'"database":"healthy"' in b,
        ),
        # 3. API Health Route
        (
            "API Readiness Probe (/api/health)",
            f"{b_base}/api/health",
            "GET",
            None,
            200,
            lambda b: b'"status":"ok"' in b,
        ),
        # 4. SRE Prometheus Metrics
        (
            "SRE Prometheus Metrics (/metrics)",
            f"{b_base}/metrics",
            "GET",
            None,
            200,
            lambda b: b"madani_uptime_seconds" in b and b"madani_app_info" in b,
        ),
        # 5. Auth Security Handler (Rejection of invalid credentials)
        (
            "Auth Security Boundary (/api/auth/login)",
            f"{b_base}/api/auth/login",
            "POST",
            {"username": "smoke_test_synthetic", "password": "InvalidPassword#123!"},
            401,
            lambda b: True,
        ),
        # 6. Public QR Router (404 on nonexistent record without 500 panic)
        (
            "Public QR Router Resilience (/api/public/verify/test)",
            f"{b_base}/api/public/verify/nonexistent-token-check",
            "GET",
            None,
            404,
            lambda b: True,
        ),
    ]

    # Optional Frontend Checks
    if f_base:
        checks.append((
            "Frontend Authentication Page (/login)",
            f"{f_base}/login",
            "GET",
            None,
            200,
            lambda b: b"<!DOCTYPE html>" in b or b"<html" in b,
        ))

    passed_count = 0
    failed_count = 0

    for name, url, method, data, expected, validator in checks:
        success = probe_endpoint(
            name=name,
            url=url,
            method=method,
            data=data,
            expected_status=expected,
            validator=validator,
            max_retries=max_retries,
            delay_seconds=delay,
        )
        if success:
            passed_count += 1
        else:
            failed_count += 1

    print("=" * 70)
    print(f"SMOKE TEST SUMMARY: {passed_count} PASSED, {failed_count} FAILED")
    print("=" * 70)

    return failed_count == 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Madani Deployment Smoke Test Suite")
    parser.add_argument("--backend-url", default="http://127.0.0.1:8000", help="Base URL of backend service")
    parser.add_argument("--frontend-url", default="http://localhost:3000", help="Base URL of frontend service")
    parser.add_argument("--retries", type=int, default=5, help="Maximum probe retries")
    parser.add_argument("--delay", type=float, default=2.0, help="Delay between retries in seconds")
    args = parser.parse_args()

    success = run_smoke_tests(
        backend_url=args.backend_url,
        frontend_url=args.frontend_url,
        max_retries=args.retries,
        delay=args.delay,
    )
    sys.exit(0 if success else 1)
