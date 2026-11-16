import express, { type NextFunction, type Request, type Response } from "express";
import supertest from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  flow: {
    create: vi.fn(),
    findMany: vi.fn(),
  },
  workflowTemplate: {
    findFirst: vi.fn(),
  },
}));

vi.mock("../../src/services/prisma", () => ({ prisma: prismaMock }));

import registerFlowRoutes from "../../src/routes/flows";
import type { RouteContext } from "../../src/routes/context";

const trigger = {
  id: "trigger",
  data: {
    type: "Trigger",
    label: "Custom Event",
    config: { eventName: "CART_ABANDONED" },
  },
};
const email = {
  id: "email",
  data: {
    type: "Action",
    label: "Send Email",
    config: { campaignId: "campaign-blueprint" },
  },
};
const edges = [{ source: "trigger", target: "email" }];

describe("flow routes", () => {
  const app = express();
  let currentRole = "ADMIN";
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).isAuthenticated = () => true;
    req.user = {
      id: "admin-1",
      role: currentRole,
      status: "ACTIVE",
      organizationId: "org-1",
    };
    next();
  });
  app.use(
    registerFlowRoutes({
      io: { to: () => ({ emit: vi.fn() }) },
    } as unknown as RouteContext)
  );
  app.use((error: any, _req: Request, res: Response, _next: NextFunction) => {
    res.status(error.statusCode ?? error.status ?? 500).json({ error: error.message });
  });

  beforeEach(() => {
    vi.clearAllMocks();
    currentRole = "ADMIN";
    prismaMock.flow.create.mockImplementation(async ({ data }) => ({
      id: "flow-1",
      ...data,
    }));
  });

  it("allows an incomplete graph to be saved only as DRAFT", async () => {
    const incompleteNodes = [
      { ...trigger, data: { ...trigger.data, config: {} } },
      { ...email, data: { ...email.data, config: { templateId: "template-1" } } },
    ];
    const response = await supertest(app).post("/api/flows").send({
      name: "Draft flow",
      status: "DRAFT",
      nodes: incompleteNodes,
      edges,
    });

    expect(response.status).toBe(200);
    expect(prismaMock.flow.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org-1",
          status: "DRAFT",
        }),
      })
    );
  });

  it("rejects activation when Send Email cannot use the durable campaign queue", async () => {
    const response = await supertest(app)
      .post("/api/flows")
      .send({
        name: "Unsafe active flow",
        status: "ACTIVE",
        nodes: [
          trigger,
          { ...email, data: { ...email.data, config: { templateId: "template-1" } } },
        ],
        edges,
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/campaignId/);
    expect(prismaMock.flow.create).not.toHaveBeenCalled();
  });

  it("accepts a fully validated ACTIVE graph in the authenticated tenant", async () => {
    const response = await supertest(app)
      .post("/api/flows")
      .send({
        name: "Cart recovery",
        status: "ACTIVE",
        nodes: [trigger, email],
        edges,
      });

    expect(response.status).toBe(200);
    expect(prismaMock.flow.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org-1",
          status: "ACTIVE",
        }),
      })
    );
  });

  it("scopes flow listing to the authenticated organization", async () => {
    prismaMock.flow.findMany.mockResolvedValue([]);

    const response = await supertest(app).get("/api/flows");

    expect(response.status).toBe(200);
    expect(prismaMock.flow.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { organizationId: "org-1" } })
    );
  });

  it("creates a draft flow from a legacy workflow template", async () => {
    prismaMock.workflowTemplate.findFirst.mockResolvedValue({
      id: "template-1",
      name: "AI Subject Line Optimization",
      nodes: JSON.stringify([
        { id: "1", type: "trigger", data: { label: "Campaign Started" } },
      ]),
      edges: "[]",
      organizationId: null,
    });

    const response = await supertest(app)
      .post("/api/flows/from-template")
      .send({ templateId: "template-1" });

    expect(response.status).toBe(200);
    expect(response.body.name).toBe("AI Subject Line Optimization (Copy)");

    const persistedNodes = JSON.parse(response.body.nodes);
    expect(persistedNodes).toEqual([
      expect.objectContaining({
        id: "1",
        type: "custom",
        position: { x: 100, y: 100 },
        data: expect.objectContaining({
          type: "Trigger",
          label: "Custom Event",
          config: {
            eventName: "CAMPAIGN_STARTED",
            templateLabel: "Campaign Started",
          },
        }),
      }),
    ]);
  });

  it.each(["VIEWER", "ANALYST"])("blocks %s from activating a workflow", async (role) => {
    currentRole = role;
    const response = await supertest(app)
      .post("/api/flows")
      .send({
        name: "Privilege bypass",
        status: "ACTIVE",
        nodes: [trigger, email],
        edges,
      });

    expect(response.status).toBe(403);
    expect(prismaMock.flow.create).not.toHaveBeenCalled();
  });

  it.each(["VIEWER", "ANALYST"])("blocks %s from injecting behavioral events", async (role) => {
    currentRole = role;
    const response = await supertest(app).post("/api/events/behavioral").send({
      email: "target@example.com",
      name: "CART_ABANDONED",
    });

    expect(response.status).toBe(403);
  });
});
