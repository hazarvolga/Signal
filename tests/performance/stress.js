import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '1m', target: 50 },
    { duration: '2m', target: 100 },
    { duration: '2m', target: 200 },
    { duration: '2m', target: 200 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    errors: ['rate<0.10'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  const endpoints = [
    '/api/health',
    '/api/stats/summary',
    '/api/contacts',
    '/api/campaigns',
    '/api/templates',
    '/api/segments',
    '/api/flows',
    '/api/workflow-templates',
    '/api/events',
    '/api/analytics/deliverability',
    '/api/analytics/funnel',
    '/api/analytics/cohorts',
  ];

  const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
  const res = http.get(`${BASE_URL}${endpoint}`);

  check(res, { [`${endpoint} ok`]: (r) => r.status === 200 });
  errorRate.add(res.status >= 500);

  sleep(0.5);
}
