const target = process.env.LOAD_TEST_URL;
if (!target) {
  console.error("LOAD_TEST_URL is required (for example https://staging.example.com/health)");
  process.exit(2);
}

const concurrency = Number.parseInt(process.env.LOAD_TEST_CONCURRENCY || "10", 10);
const totalRequests = Number.parseInt(process.env.LOAD_TEST_REQUESTS || "200", 10);
const maxP95Ms = Number.parseInt(process.env.LOAD_TEST_MAX_P95_MS || "500", 10);
const maxErrorRate = Number.parseFloat(process.env.LOAD_TEST_MAX_ERROR_RATE || "0.01");
const outputPath = process.env.LOAD_TEST_OUTPUT;
const authEmail = process.env.LOAD_TEST_EMAIL;
const authPassword = process.env.LOAD_TEST_PASSWORD;

if (
  !Number.isInteger(concurrency) ||
  concurrency < 1 ||
  concurrency > 200 ||
  !Number.isInteger(totalRequests) ||
  totalRequests < concurrency ||
  totalRequests > 100_000 ||
  !Number.isFinite(maxP95Ms) ||
  maxP95Ms < 1 ||
  !Number.isFinite(maxErrorRate) ||
  maxErrorRate < 0 ||
  maxErrorRate > 1
) {
  console.error("Invalid load-test limits");
  process.exit(2);
}

const durations = [];
const statusCounts = new Map();
let failures = 0;
let cursor = 0;
let sessionCookie;
let rateLimit;

if (authEmail || authPassword) {
  if (!authEmail || !authPassword) {
    console.error("LOAD_TEST_EMAIL and LOAD_TEST_PASSWORD must be provided together");
    process.exit(2);
  }

  const loginUrl = new URL("/api/auth/login", target);
  const loginResponse = await fetch(loginUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: authEmail, password: authPassword }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!loginResponse.ok) {
    console.error(`Load-test authentication failed with status ${loginResponse.status}`);
    process.exit(1);
  }

  const setCookies = loginResponse.headers.getSetCookie?.() || [];
  const rawCookie = setCookies[0] || loginResponse.headers.get("set-cookie");
  sessionCookie = rawCookie?.split(";", 1)[0];
  if (!sessionCookie) {
    console.error("Load-test authentication did not return a session cookie");
    process.exit(1);
  }
}

async function runner() {
  while (cursor < totalRequests) {
    cursor += 1;
    const startedAt = performance.now();
    try {
      const response = await fetch(target, {
        headers: {
          "user-agent": "signal-staging-load-smoke/1.0",
          ...(sessionCookie ? { cookie: sessionCookie } : {}),
        },
        signal: AbortSignal.timeout(10_000),
      });
      const statusKey = String(response.status);
      statusCounts.set(statusKey, (statusCounts.get(statusKey) || 0) + 1);
      if (response.headers.has("ratelimit-limit")) {
        rateLimit = {
          limit: response.headers.get("ratelimit-limit"),
          remaining: response.headers.get("ratelimit-remaining"),
          reset: response.headers.get("ratelimit-reset"),
        };
      }
      if (!response.ok) failures += 1;
      await response.arrayBuffer();
    } catch {
      failures += 1;
      statusCounts.set("network_error", (statusCounts.get("network_error") || 0) + 1);
    } finally {
      durations.push(performance.now() - startedAt);
    }
  }
}

const wallStartedAt = performance.now();
await Promise.all(Array.from({ length: concurrency }, () => runner()));
const wallMs = performance.now() - wallStartedAt;
durations.sort((a, b) => a - b);

const percentile = (fraction) =>
  durations[Math.min(durations.length - 1, Math.ceil(durations.length * fraction) - 1)] || 0;
const result = {
  target,
  requests: totalRequests,
  concurrency,
  failures,
  errorRate: failures / totalRequests,
  statusCounts: Object.fromEntries([...statusCounts.entries()].sort(([a], [b]) => a.localeCompare(b))),
  ...(rateLimit ? { rateLimit } : {}),
  p50Ms: Math.round(percentile(0.5)),
  p95Ms: Math.round(percentile(0.95)),
  p99Ms: Math.round(percentile(0.99)),
  requestsPerSecond: Math.round((totalRequests / wallMs) * 1_000),
};

console.log(JSON.stringify(result, null, 2));
if (outputPath) {
  const { mkdir, writeFile } = await import("node:fs/promises");
  const { dirname } = await import("node:path");
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, { mode: 0o600 });
}
if (result.errorRate > maxErrorRate || result.p95Ms > maxP95Ms) process.exit(1);
