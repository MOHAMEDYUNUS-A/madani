#!/usr/bin/env python3
"""
Madani Production Performance & Load Testing Benchmark Runner
Simulates multi-threaded concurrent user traffic against API endpoints,
measuring latency percentiles (p50, p90, p95, p99), throughput (RPS),
and error rates against production SLA thresholds.

SLA Criteria:
- Error rate < 1.0%
- p95 latency < 500ms
"""

import argparse
import concurrent.futures
import json
import statistics
import sys
import time
import urllib.error
import urllib.request
from typing import Dict, List, Tuple


def send_request(url: str, method: str = "GET", data: dict = None, expected_status: int = 200) -> Tuple[bool, float, int]:
    """Sends a single HTTP request and measures latency in milliseconds."""
    start_time = time.perf_counter()
    headers = {"User-Agent": "Madani-Benchmark/1.0"}
    encoded_data = None

    if data:
        encoded_data = json.dumps(data).encode("utf-8")
        headers["Content-Type"] = "application/json"

    req = urllib.request.Request(url, data=encoded_data, headers=headers, method=method)
    status_code = 0
    success = False

    try:
        with urllib.request.urlopen(req, timeout=10.0) as resp:
            status_code = resp.status
            resp.read()  # Consume body
            success = (status_code == expected_status)
    except urllib.error.HTTPError as err:
        status_code = err.code
        success = (status_code == expected_status)
    except Exception as exc:
        status_code = 0
        success = False

    duration_ms = (time.perf_counter() - start_time) * 1000.0
    return success, duration_ms, status_code


def run_load_scenario(base_url: str, total_requests: int = 100, concurrency: int = 10) -> Dict:
    """Executes distributed requests simulating user traffic across health and auth endpoints."""
    endpoints = [
        {"path": "/health", "method": "GET", "data": None, "expected": 200, "weight": 4},
        {"path": "/api/health", "method": "GET", "data": None, "expected": 200, "weight": 3},
        {"path": "/api/auth/login", "method": "POST", "data": {"username": "synthetic_bench", "password": "BadPassword!#123"}, "expected": 401, "weight": 3},
    ]

    # Expand workload queue according to weights
    workload = []
    while len(workload) < total_requests:
        for ep in endpoints:
            for _ in range(ep["weight"]):
                if len(workload) < total_requests:
                    workload.append(ep)

    print(f"\n[+] Starting Benchmark against: {base_url}")
    print(f"    Total Requests: {total_requests} | Concurrency: {concurrency} threads")
    print("=" * 60)

    latencies: List[float] = []
    status_codes: Dict[int, int] = {}
    success_count = 0
    failure_count = 0

    overall_start = time.perf_counter()

    with concurrent.futures.ThreadPoolExecutor(max_workers=concurrency) as executor:
        futures = []
        for ep in workload:
            target_url = f"{base_url.rstrip('/')}{ep['path']}"
            futures.append(executor.submit(send_request, target_url, ep["method"], ep["data"], ep["expected"]))

        for future in concurrent.futures.as_completed(futures):
            success, duration_ms, status = future.result()
            latencies.append(duration_ms)
            status_codes[status] = status_codes.get(status, 0) + 1
            if success:
                success_count += 1
            else:
                failure_count += 1

    overall_duration = time.perf_counter() - overall_start
    rps = total_requests / overall_duration if overall_duration > 0 else 0

    # Calculate statistics
    latencies.sort()
    avg_latency = statistics.mean(latencies)
    median_p50 = statistics.median(latencies)
    p90 = latencies[int(len(latencies) * 0.90)]
    p95 = latencies[int(len(latencies) * 0.95)]
    p99 = latencies[int(len(latencies) * 0.99)]
    min_latency = latencies[0]
    max_latency = latencies[-1]
    error_rate = (failure_count / total_requests) * 100.0

    print(f"[+] Total Time Elapsed: {overall_duration:.2f}s")
    print(f"[+] Throughput:         {rps:.2f} req/s")
    print(f"[+] Requests Success:   {success_count}/{total_requests} ({100 - error_rate:.1f}%)")
    print(f"[+] Error Rate:         {error_rate:.2f}%")
    print(f"[+] Status Codes:       {status_codes}")
    print("-" * 60)
    print("Latency Distribution (ms):")
    print(f"  Min: {min_latency:8.2f} ms")
    print(f"  p50: {median_p50:8.2f} ms")
    print(f"  p90: {p90:8.2f} ms")
    print(f"  p95: {p95:8.2f} ms")
    print(f"  p99: {p99:8.2f} ms")
    print(f"  Max: {max_latency:8.2f} ms")
    print(f"  Avg: {avg_latency:8.2f} ms")
    print("=" * 60)

    # SLA Verification
    sla_passed = True
    sla_violations = []

    if error_rate > 1.0:
        sla_passed = False
        sla_violations.append(f"Error rate {error_rate:.2f}% exceeds 1.0% limit")

    if p95 > 500.0:
        sla_passed = False
        sla_violations.append(f"p95 latency {p95:.2f}ms exceeds 500.0ms limit")

    if sla_passed:
        print("[SUCCESS] Production SLA Targets Satisfied! (p95 < 500ms, Error Rate < 1.0%)")
    else:
        print(f"[VIOLATION] Production SLA Check Failed: {', '.join(sla_violations)}")

    return {
        "success": sla_passed,
        "total_requests": total_requests,
        "duration_seconds": overall_duration,
        "rps": rps,
        "error_rate_pct": error_rate,
        "latency_min_ms": min_latency,
        "latency_p50_ms": median_p50,
        "latency_p90_ms": p90,
        "latency_p95_ms": p95,
        "latency_p99_ms": p99,
        "latency_max_ms": max_latency,
        "latency_avg_ms": avg_latency,
        "status_distribution": status_codes,
        "sla_passed": sla_passed,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Madani Load Test Benchmark Runner")
    parser.add_argument("--url", default="http://127.0.0.1:8000", help="Base API URL")
    parser.add_argument("--requests", type=int, default=100, help="Total number of requests")
    parser.add_argument("--concurrency", type=int, default=10, help="Concurrent workers")
    args = parser.parse_args()

    results = run_load_scenario(args.url, args.requests, args.concurrency)
    sys.exit(0 if results["sla_passed"] else 1)
