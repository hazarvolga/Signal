import express, { type NextFunction, type Request, type Response } from "express";
import supertest from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  contact: {
    count: vi.fn(),
    findMany: vi.fn(),
  },
  campaign: {
    count: vi.fn(),
  },
  recipientDelivery: {
    count: vi.fn(),
  },
  trackingEventReceipt: {
    count: vi.fn(),
    findMany: vi.fn(),
  },
  event: {
    count: vi.fn(),
    findMany: vi.fn(),
  },
  revenue: {
    aggregate: vi.fn(),
  },
}));

vi.mock("../../src/services/prisma", () => ({ prisma: prismaMock }));

import registerFlowRoutes from "../../src/routes/flows";
import type { RouteContext } from "../../src/routes/context";

describe("stats summary", () => {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).isAuthenticated = () => true;
    req.user = {
      id: "admin-1",
      email: "admin@example.com",
      name: "Admin",
      role: "ADMIN",
      status: "ACTIVE",
      organizationId: "org-1",
    };
    next();
  });
  app.use(registerFlowRoutes({ io: { to: () => ({ emit: vi.fn() }) } } as unknown as RouteContext));
  app.use((error: any, _req: Request, res: Response, _next: NextFunction) => {
    res.status(error.statusCode ?? error.status ?? 500).json({ error: error.message });
  });

  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.contact.count.mockResolvedValue(100);
    prismaMock.contact.findMany.mockResolvedValue([]);
    prismaMock.campaign.count.mockResolvedValueOnce(5).mockResolvedValueOnce(1);
    prismaMock.recipientDelivery.count.mockResolvedValueOnce(200).mockResolvedValueOnce(10);
    prismaMock.trackingEventReceipt.count.mockResolvedValue(80);
    prismaMock.trackingEventReceipt.findMany.mockResolvedValue([
      { recipientDeliveryId: "d1" },
      { recipientDeliveryId: "d2" },
    ]);
    prismaMock.event.count.mockResolvedValue(3);
    prismaMock.event.findMany.mockResolvedValue([]);
    prismaMock.revenue.aggregate.mockResolvedValue({ _sum: { amount: 1000 } });
  });

  it("returns tenant aggregate dashboard stats", async () => {
    const response = await supertest(app).get("/api/stats/summary");

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        totalSubscribers: 100,
        totalCampaigns: 5,
        activeCampaigns: 1,
        totalSent: 200,
        avgOpenRate: 40,
        avgClickRate: 1,
        bounceRate: 5,
        unsubscribeRate: 1.5,
        revenueAttributed: 1000,
      })
    );
  });
});
