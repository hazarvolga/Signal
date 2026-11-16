import { describe, expect, it, vi, beforeEach } from "vitest";
import crypto from "crypto";
import express, { type Request, type Response } from "express";
import supertest from "supertest";

const prismaMock = vi.hoisted(() => ({
  apiKey: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  webhook: {
    findMany: vi.fn(),
  },
  webhookLog: {
    create: vi.fn(),
  },
}));

vi.mock("../../src/services/prisma", () => ({ prisma: prismaMock }));

import { requireAuth } from "../../src/middleware/auth";
import { dispatchOutboundWebhooks } from "../../src/services/webhookDispatcher";

describe("API Key Authentication & Webhook Dispatcher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("requireAuth with API Key", () => {
    const app = express();
    app.use(express.json());
    app.get("/api/test-protected", requireAuth, (req: Request, res: Response) => {
      res.json({ success: true, user: req.user });
    });

    it("rejects request without session or api key", async () => {
      const res = await supertest(app).get("/api/test-protected");
      expect(res.status).toBe(401);
      expect(res.body.code).toBe("UNAUTHORIZED");
    });

    it("accepts request with valid x-api-key header", async () => {
      const plainKey = "sig_test_1234567890abcdef";
      const keyHash = crypto.createHash("sha256").update(plainKey).digest("hex");

      prismaMock.apiKey.findUnique.mockResolvedValue({
        id: "key-1",
        name: "Test Developer Key",
        key: keyHash,
        scopes: '["contacts:read"]',
        organizationId: "org-1",
        organization: { slug: "test-org" },
      });
      prismaMock.apiKey.update.mockResolvedValue({});

      const res = await supertest(app).get("/api/test-protected").set("x-api-key", plainKey);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.organizationId).toBe("org-1");
      expect(prismaMock.apiKey.update).toHaveBeenCalled();
    });

    it("accepts request with valid Authorization: Bearer sig_... header", async () => {
      const plainKey = "sig_test_bearer_token_999";
      const keyHash = crypto.createHash("sha256").update(plainKey).digest("hex");

      prismaMock.apiKey.findUnique.mockResolvedValue({
        id: "key-2",
        name: "Bearer Key",
        key: keyHash,
        scopes: '["all"]',
        organizationId: "org-2",
        organization: { slug: "second-org" },
      });
      prismaMock.apiKey.update.mockResolvedValue({});

      const res = await supertest(app)
        .get("/api/test-protected")
        .set("Authorization", `Bearer ${plainKey}`);

      expect(res.status).toBe(200);
      expect(res.body.user.organizationId).toBe("org-2");
    });

    it("rejects invalid or unknown api key", async () => {
      prismaMock.apiKey.findUnique.mockResolvedValue(null);

      const res = await supertest(app)
        .get("/api/test-protected")
        .set("x-api-key", "sig_unknown_key_value");

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Invalid API key");
    });
  });

  describe("dispatchOutboundWebhooks", () => {
    it("returns 0 if no active webhooks exist", async () => {
      prismaMock.webhook.findMany.mockResolvedValue([]);
      const count = await dispatchOutboundWebhooks({
        topic: "contact.created",
        organizationId: "org-1",
        data: { email: "alice@example.com" },
      });
      expect(count).toBe(0);
    });

    it("dispatches only to webhooks subscribed to the topic", async () => {
      prismaMock.webhook.findMany.mockResolvedValue([
        {
          id: "wh-1",
          url: "https://example.com/webhook",
          events: JSON.stringify(["contact.created", "order.placed"]),
          isActive: true,
          secret: "whsec_123",
          organizationId: "org-1",
        },
        {
          id: "wh-2",
          url: "https://other.com/webhook",
          events: JSON.stringify(["order.placed"]),
          isActive: true,
          secret: "whsec_456",
          organizationId: "org-1",
        },
      ]);
      prismaMock.webhookLog.create.mockResolvedValue({ id: "log-1" });

      const originalFetch = global.fetch;
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
      });
      global.fetch = fetchMock;

      try {
        const count = await dispatchOutboundWebhooks({
          topic: "contact.created",
          organizationId: "org-1",
          data: { email: "bob@example.com" },
        });

        expect(count).toBe(1);
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][0]).toBe("https://example.com/webhook");
        expect(fetchMock.mock.calls[0][1].headers["X-Signal-Event"]).toBe("contact.created");
        expect(fetchMock.mock.calls[0][1].headers["X-Signal-Signature-256"]).toBeDefined();
        expect(prismaMock.webhookLog.create).toHaveBeenCalled();
      } finally {
        global.fetch = originalFetch;
      }
    });
  });
});
