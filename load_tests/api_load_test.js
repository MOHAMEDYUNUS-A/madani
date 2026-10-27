import http from 'k6/http';
import { check, sleep } from 'k6';

// Performance SLA Thresholds
export const options = {
  stages: [
    { duration: '15s', target: 5 },   // Ramp-up to 5 virtual users
    { duration: '30s', target: 15 },  // Peak sustained load
    { duration: '15s', target: 0 },   // Cool-down
  ],
  thresholds: {
    // 95% of requests must complete below 500ms
    http_req_duration: ['p(95)<500'],
    // Error rate must remain below 1%
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.TARGET_URL || 'http://127.0.0.1:8000';

export default function () {
  // 1. Health Probe Load Test
  const healthRes = http.get(`${BASE_URL}/health`);
  check(healthRes, {
    'health status is 200': (r) => r.status === 200,
    'health response has database healthy': (r) => {
      try {
        const json = r.json();
        return json.status === 'ok' && json.database === 'healthy';
      } catch (e) {
        return false;
      }
    },
    'contains x-request-id': (r) => r.headers['X-Request-Id'] !== undefined || r.headers['x-request-id'] !== undefined,
  });

  // 2. API Health Check
  const apiHealthRes = http.get(`${BASE_URL}/api/health`);
  check(apiHealthRes, {
    'api health status is 200': (r) => r.status === 200,
  });

  // 3. Security & Auth Rejection Check (Input validation & rate limiting)
  const badLoginPayload = JSON.stringify({
    username: 'load_test_synthetic_user',
    password: 'InvalidPassword!',
  });
  const badLoginRes = http.post(`${BASE_URL}/api/auth/login`, badLoginPayload, {
    headers: { 'Content-Type': 'application/json' },
  });
  check(badLoginRes, {
    'unauthorized login rejected with 401': (r) => r.status === 401,
  });

  sleep(1);
}
