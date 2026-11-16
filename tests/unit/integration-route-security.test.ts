import express, { type NextFunction, type Request, type Response } from "express";
import crypto from "node:crypto";
import supertest from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  integration: {
    findFirst: vi.fn(),
    update: vi.fn(),
    findMany: vi.fn(),
  },
  product: {
    upsert: vi.fn(),
  },
  $transaction: vi.fn(),
}));

vi.mock("../../src/services/prisma", () => ({ prisma: prismaMock }));
vi.mock("../../src/services/email/snsWebhook", () => ({
  InvalidSnsMessageError: class InvalidSnsMessageError extends Error {},
  processSesSnsMessage: vi.fn(),
}));

import registerIntegrationRoutes from "../../src/routes/integrations";
import type { RouteContext } from "../../src/routes/context";

describe("integration route security", () => {
  const app = express();
  let currentRole = "ADMIN";

  app.use(
    express.json({
      verify(req, _res, buffer) {
        (req as Request & { rawBody?: Buffer }).rawBody = Buffer.from(buffer);
      },
    })
  );
  app.use((req, _res, next) => {
    (req as any).isAuthenticated = () => true;
    req.user = {
      id: "actor-1",
      role: currentRole,
      status: "ACTIVE",
      organizationId: "org-1",
    };
    next();
  });
  app.use(
    registerIntegrationRoutes({
      createEventAndBroadcast: vi.fn(),
    } as unknown as RouteContext)
  );
  app.use((error: any, _req: Request, res: Response, _next: NextFunction) => {
    res.status(error.statusCode ?? error.status ?? 500).json({ error: error.message });
  });

  beforeEach(() => {
    vi.clearAllMocks();
    currentRole = "ADMIN";
  });

  it.each(["VIEWER", "ANALYST", "EDITOR"])(
    "prevents %s from changing integration configuration",
    async (role) => {
      currentRole = role;

      const response = await supertest(app)
        .patch("/api/integrations/integration-1")
        .send({ status: "CONNECTED", config: { shopDomain: "shop.example" } });

      expect(response.status).toBe(403);
      expect(prismaMock.integration.update).not.toHaveBeenCalled();
    }
  );

  it("returns 404 for an ADMIN attempting a cross-tenant integration ID", async () => {
    prismaMock.integration.findFirst.mockResolvedValue(null);

    const response = await supertest(app)
      .patch("/api/integrations/tenant-b-integration")
      .send({ status: "CONNECTED", config: { shopDomain: "shop.example" } });

    expect(response.status).toBe(404);
    expect(prismaMock.integration.findFirst).toHaveBeenCalledWith({
      where: { id: "tenant-b-integration", organizationId: "org-1" },
      select: { id: true, type: true, organizationId: true },
    });
    expect(prismaMock.integration.update).not.toHaveBeenCalled();
  });

  it("rejects a Shopify domain already claimed by another tenant", async () => {
    prismaMock.integration.findFirst.mockResolvedValue({
      id: "integration-1",
      type: "SHOPIFY",
      organizationId: "org-1",
    });
    prismaMock.$transaction.mockImplementation(async (callback) =>
      callback({
        $executeRaw: vi.fn().mockResolvedValue(1),
        integration: {
          findMany: vi.fn().mockResolvedValue([
            {
              organizationId: "org-2",
              config: JSON.stringify({ shopDomain: "claimed.myshopify.com" }),
            },
          ]),
          update: vi.fn(),
        },
      })
    );

    const response = await supertest(app)
      .patch("/api/integrations/integration-1")
      .send({
        status: "CONNECTED",
        config: { shopDomain: "claimed.myshopify.com" },
      });

    expect(response.status).toBe(409);
    expect(prismaMock.integration.update).not.toHaveBeenCalled();
  });

  it.each(["VIEWER", "ANALYST"])(
    "prevents %s from using the Shopify simulation write endpoint",
    async (role) => {
      currentRole = role;

      const response = await supertest(app)
        .post("/api/webhooks/shopify/simulate")
        .send({ type: "order" });

      expect(response.status).toBe(403);
    }
  );

  it("rejects an unsigned Shopify webhook before tenant lookup", async () => {
    const response = await supertest(app)
      .post("/api/webhooks/shopify")
      .set("x-shopify-topic", "orders/create")
      .set("x-shopify-shop-domain", "shop.example")
      .set("x-shopify-webhook-id", "webhook-1")
      .send({ id: 1 });

    expect(response.status).toBe(401);
    expect(prismaMock.integration.findMany).not.toHaveBeenCalled();
  });

  it("fails closed when a signed Shopify shop maps to multiple tenants", async () => {
    const previousSecret = process.env.SHOPIFY_WEBHOOK_SECRET;
    process.env.SHOPIFY_WEBHOOK_SECRET = "test-shopify-secret";
    const payload = JSON.stringify({ id: 1 });
    const signature = crypto
      .createHmac("sha256", process.env.SHOPIFY_WEBHOOK_SECRET)
      .update(payload)
      .digest("base64");
    prismaMock.integration.findMany.mockResolvedValue([
      {
        organizationId: "org-1",
        config: JSON.stringify({ shopDomain: "shop.myshopify.com" }),
      },
      {
        organizationId: "org-2",
        config: JSON.stringify({ shopDomain: "shop.myshopify.com" }),
      },
    ]);

    try {
      const response = await supertest(app)
        .post("/api/webhooks/shopify")
        .set("content-type", "application/json")
        .set("x-shopify-topic", "orders/create")
        .set("x-shopify-shop-domain", "shop.myshopify.com")
        .set("x-shopify-webhook-id", "webhook-ambiguous")
        .set("x-shopify-hmac-sha256", signature)
        .send(payload);

      expect(response.status).toBe(401);
      expect(response.body.error).toMatch(/ambiguous/);
    } finally {
      if (previousSecret === undefined) {
        delete process.env.SHOPIFY_WEBHOOK_SECRET;
      } else {
        process.env.SHOPIFY_WEBHOOK_SECRET = previousSecret;
      }
    }
  });
});
