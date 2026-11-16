import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 1,
  iterations: 3,
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  // Health check
  const health = http.get(`${BASE_URL}/health`);
  check(health, { 'health status 200': (r) => r.status === 200 });

  // API health
  const apiHealth = http.get(`${BASE_URL}/api/health`);
  check(apiHealth, { 'api health 200': (r) => r.status === 200 });

  // Stats
  const stats = http.get(`${BASE_URL}/api/stats/summary`);
  check(stats, { 'stats 200': (r) => r.status === 200 });

  // Contacts
  const contacts = http.get(`${BASE_URL}/api/contacts`);
  check(contacts, { 'contacts 200': (r) => r.status === 200 });

  // Campaigns
  const campaigns = http.get(`${BASE_URL}/api/campaigns`);
  check(campaigns, { 'campaigns 200': (r) => r.status === 200 });

  sleep(1);
}
