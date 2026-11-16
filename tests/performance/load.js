import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend, Rate } from 'k6/metrics';

const readDuration = new Trend('read_duration');
const writeDuration = new Trend('write_duration');
const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '30s', target: 20 },
    { duration: '2m', target: 20 },
    { duration: '30s', target: 50 },
    { duration: '2m', target: 50 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    errors: ['rate<0.05'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const EMAIL = __ENV.LOAD_TEST_EMAIL;
const PASSWORD = __ENV.LOAD_TEST_PASSWORD;

export function setup() {
  if (!EMAIL || !PASSWORD) {
    throw new Error('LOAD_TEST_EMAIL and LOAD_TEST_PASSWORD are required');
  }

  const response = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ email: EMAIL, password: PASSWORD }),
    { headers: { 'Content-Type': 'application/json' } },
  );
  const authenticated = check(response, { 'load user authenticated': (result) => result.status === 200 });
  if (!authenticated) throw new Error(`Load-test authentication failed with status ${response.status}`);

  const session = response.cookies['signal.sid']?.[0]?.value;
  if (!session) throw new Error('Load-test authentication did not return signal.sid');
  return { session };
}

export default function (data) {
  const authenticatedRequest = { cookies: { 'signal.sid': data.session } };
  group('read endpoints', () => {
    const r1 = http.get(`${BASE_URL}/api/health`);
    check(r1, { 'ok': (r) => r.status === 200 });
    errorRate.add(r1.status !== 200);
    readDuration.add(r1.timings.duration);

    const r2 = http.get(`${BASE_URL}/api/stats/summary`, authenticatedRequest);
    check(r2, { 'ok': (r) => r.status === 200 });
    errorRate.add(r2.status !== 200);
    readDuration.add(r2.timings.duration);

    const r3 = http.get(`${BASE_URL}/api/campaigns`, authenticatedRequest);
    check(r3, { 'ok': (r) => r.status === 200 });
    errorRate.add(r3.status !== 200);
    readDuration.add(r3.timings.duration);

    const r4 = http.get(`${BASE_URL}/api/segments`, authenticatedRequest);
    check(r4, { 'ok': (r) => r.status === 200 });
    errorRate.add(r4.status !== 200);
    readDuration.add(r4.timings.duration);
  });

  sleep(2);
}
