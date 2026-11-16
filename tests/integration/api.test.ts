import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from "vitest";
import supertest from "supertest";
import { createApp, httpServer } from "../../server";
import { hashPassword } from "../../src/lib/authHelpers";
import { prisma } from "../../src/services/prisma";

vi.mock("../../src/services/geminiService", () => ({
  geminiService: {
    generateSubjectLines: vi
      .fn()
      .mockResolvedValue(["Integration subject A", "Integration subject B"]),
  },
}));

const testPassword = "SignalIntegration1!";
let request: ReturnType<typeof supertest.agent>;
let csrfToken: string;
let dbAvailable = false;

beforeAll(async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbAvailable = true;
  } catch {
    console.warn("Live database unreachable; skipping integration API test suite.");
    return;
  }

  const { app } = await createApp();
  request = supertest.agent(app);

  const organization = await prisma.organization.findFirst();
  expect(organization).not.toBeNull();

  await prisma.user.upsert({
    where: { email: "admin@signal.local" },
    create: {
      email: "admin@signal.local",
      name: "Signal Integration Admin",
      role: "ADMIN",
      status: "ACTIVE",
      organizationId: organization!.id,
      passwordHash: hashPassword(testPassword),
    },
    update: {
      passwordHash: hashPassword(testPassword),
      status: "ACTIVE",
    },
  });

  const loginResponse = await request
    .post("/api/auth/login")
    .send({ email: "admin@signal.local", password: testPassword });
  expect(loginResponse.status).toBe(200);

  const csrfResponse = await request.get("/api/csrf-token");
  expect(csrfResponse.status).toBe(200);
  expect(csrfResponse.body.csrfToken).toEqual(expect.any(String));
  csrfToken = csrfResponse.body.csrfToken;
}, 30000);

afterAll(() => {
  httpServer?.close();
});

beforeEach((ctx) => {
  if (!dbAvailable) {
    ctx.skip();
  }
});

describe("Health endpoints", () => {
  // BUG-009 FIX: Health handler returns {status, checks, uptime, timestamp} — not a simple string
  it("GET /health → 200 with status healthy", async () => {
    const res = await request.get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("status");
    expect(["healthy", "degraded"]).toContain(res.body.status);
    expect(res.body).toHaveProperty("checks");
    expect(res.body).toHaveProperty("uptime");
    expect(res.body).toHaveProperty("timestamp");
  });

  it("GET /api/health → 200 with status healthy", async () => {
    const res = await request.get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("status");
    expect(["healthy", "degraded"]).toContain(res.body.status);
  });
});

describe("Contacts API", () => {
  it("GET /api/contacts → 200 with bounded cursor envelope", async () => {
    const res = await request.get("/api/contacts?limit=100");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toMatchObject({ limit: 100 });
  });

  it("POST /api/contacts → 200 with contact object", async () => {
    const uniqueEmail = `test-${Date.now()}@example.com`;
    const res = await request
      .post("/api/contacts")
      .set("x-csrf-token", csrfToken)
      .send({ email: uniqueEmail, firstName: "Test", lastName: "User" });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("id");
    expect(res.body.email).toBe(uniqueEmail);
  });
});

describe("Campaigns API", () => {
  it("GET /api/campaigns → 200 with bounded cursor envelope", async () => {
    const res = await request.get("/api/campaigns?limit=100");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toMatchObject({ limit: 100 });
  });

  it("POST /api/campaigns → 200 with campaign object", async () => {
    const res = await request.post("/api/campaigns").set("x-csrf-token", csrfToken).send({
      name: "Test Campaign",
      subject: "Test Subject",
      fromName: "SIGNAL",
      fromEmail: "test@signal.app",
      content: "<p>Integration campaign content</p>",
    });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("id");
    expect(res.body.name).toBe("Test Campaign");
  });
});

describe("Templates API", () => {
  it("GET /api/templates → 200 with array", async () => {
    const res = await request.get("/api/templates");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe("Segments API", () => {
  it("GET /api/segments → 200 with array", async () => {
    const res = await request.get("/api/segments");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe("Stats API", () => {
  it("GET /api/stats/summary → 200 with stats object", async () => {
    const res = await request.get("/api/stats/summary");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("totalSubscribers");
    expect(res.body).toHaveProperty("totalCampaigns");
    expect(res.body).toHaveProperty("totalSent");
    expect(res.body).toHaveProperty("totalOpens");
  });
});

describe("Validation API", () => {
  it("POST /api/validate → 200 with validation result", async () => {
    const res = await request
      .post("/api/validate")
      .set("x-csrf-token", csrfToken)
      .send({ email: "test@example.com" });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("status");
    expect(res.body).toHaveProperty("score");
  });
});

describe("AI API", () => {
  it("POST /api/ai/subject-lines → handles request", async () => {
    const res = await request
      .post("/api/ai/subject-lines")
      .set("x-csrf-token", csrfToken)
      .send({ topic: "Summer sale announcement" });
    expect(res.status).toBe(200);
    expect(res.body).toEqual(["Integration subject A", "Integration subject B"]);
  });
});

describe("Keys API", () => {
  it("GET /api/keys → 200 with array", async () => {
    const res = await request.get("/api/keys");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe("Auth API", () => {
  it("GET /api/me → 200 with user object", async () => {
    const res = await request.get("/api/me");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("id");
  });
});

describe("Public API V1", () => {
  it("GET /api/v1/contacts → 401 without API key", async () => {
    const res = await request.get("/api/v1/contacts");
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("error");
  });
});

describe("Error handling", () => {
  it("POST /api/nonexistent → 404", async () => {
    const res = await request
      .post("/api/nonexistent")
      .set("x-csrf-token", csrfToken)
      .send({ foo: "bar" });
    expect(res.status).toBe(404);
  });
});
