import express, { type NextFunction, type Request, type Response } from "express";
import supertest from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  form: {
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
  formMetric: {
    upsert: vi.fn(),
  },
  formSubmission: {
    create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
      id: "submission-1",
      ...data,
    })),
  },
  contact: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  consentLog: {
    create: vi.fn(),
  },
  $transaction: vi.fn(),
}));

vi.mock("../../src/services/prisma", () => ({ prisma: prismaMock }));

vi.mock("../../src/services/redisService", () => ({
  redisService: {
    rateLimit: vi.fn(async () => ({ allowed: true, remaining: 9, reset: 0 })),
  },
}));

import registerFormRoutes from "../../src/routes/forms";
import type { RouteContext } from "../../src/routes/context";

describe("form routes", () => {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).isAuthenticated = () => true;
    req.user = {
      id: "owner-1",
      role: "OWNER",
      status: "ACTIVE",
      organizationId: "org-1",
    };
    next();
  });
  app.use(registerFormRoutes({} as RouteContext));
  app.use((error: any, _req: Request, res: Response, _next: NextFunction) => {
    res.status(error.statusCode ?? error.status ?? 500).json({ error: error.message });
  });

  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.form.create.mockImplementation(async ({ data }) => ({
      id: "form-1",
      ...data,
      createdAt: new Date("2026-08-20T10:00:00.000Z"),
    }));
  });

  it("publishes a validated form with its builder elements", async () => {
    const elements = [
      { id: "headline", type: "text", content: "Join our newsletter" },
      { id: "email", type: "input", placeholder: "Email address" },
      { id: "submit", type: "button", content: "Subscribe" },
    ];

    const response = await supertest(app).post("/api/forms").send({
      name: "Newsletter Signup",
      type: "landing_page",
      elements,
    });

    expect(response.status).toBe(201);
    expect(response.body).toEqual(
      expect.objectContaining({
        id: "form-1",
        name: "Newsletter Signup",
        type: "landing_page",
        status: "active",
        elements,
      })
    );
    expect(prismaMock.form.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: "Newsletter Signup",
        organizationId: "org-1",
        config: expect.stringContaining('"elements"'),
      }),
    });
  });

  it("rejects malformed builder content before database access", async () => {
    const response = await supertest(app).post("/api/forms").send({
      name: "",
      type: "landing_page",
      elements: [],
    });

    expect(response.status).toBe(400);
    expect(prismaMock.form.create).not.toHaveBeenCalled();
  });

  describe("public form submissions", () => {
    const publicForm = {
      id: "form-public-1",
      organizationId: "org-1",
      name: "Newsletter Signup",
      config: JSON.stringify({
        type: "popup",
        status: "active",
        elements: [
          { id: "email", type: "input", placeholder: "Email address" },
          { id: "submit", type: "button", content: "Subscribe" },
        ],
      }),
      createdAt: new Date("2026-08-20T10:00:00.000Z"),
    };

    beforeEach(() => {
      prismaMock.form.findUnique.mockResolvedValue(publicForm);
      prismaMock.$transaction.mockImplementation(async (ops: Array<Promise<unknown>>) =>
        Promise.all(ops)
      );
      prismaMock.contact.findFirst.mockResolvedValue(null);
      prismaMock.contact.create.mockResolvedValue({ id: "contact-1" });
      prismaMock.consentLog.create.mockResolvedValue({ id: "consent-1" });
    });

    it("records a consent log with the owning organization for new contacts", async () => {
      const response = await supertest(app)
        .post("/api/public/forms/form-public-1/submissions")
        .send({ values: { email: "user@example.com" } });

      expect(response.status).toBe(201);
      expect(prismaMock.consentLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          contactId: "contact-1",
          organizationId: "org-1",
          action: "SUBSCRIBE",
          source: "PUBLIC_FORM",
        }),
      });
    });
  });
});
