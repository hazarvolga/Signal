import express, { type NextFunction, type Request, type Response } from "express";
import supertest from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  user: {
    create: vi.fn(),
    findFirst: vi.fn(),
    updateMany: vi.fn(),
    count: vi.fn(),
  },
  approvalRequest: {
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  apiKey: {
    create: vi.fn(),
  },
}));

vi.mock("../../src/services/prisma", () => ({ prisma: prismaMock }));

import registerAdminRoutes from "../../src/routes/admin";
import type { RouteContext } from "../../src/routes/context";

describe("administrative route authorization", () => {
  const app = express();
  let currentRole = "ADMIN";

  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).isAuthenticated = () => true;
    req.user = {
      id: "actor-1",
      email: "actor@example.com",
      name: "Actor",
      role: currentRole,
      status: "ACTIVE",
      organizationId: "org-1",
    };
    next();
  });
  app.use(registerAdminRoutes({} as RouteContext));
  app.use((error: any, _req: Request, res: Response, _next: NextFunction) => {
    res.status(error.statusCode ?? error.status ?? 500).json({ error: error.message });
  });

  beforeEach(() => {
    vi.clearAllMocks();
    currentRole = "ADMIN";
  });

  it("prevents an ADMIN from inviting a new OWNER", async () => {
    const response = await supertest(app).post("/api/team/invite").send({
      email: "new-owner@example.com",
      name: "New Owner",
      role: "OWNER",
    });

    expect(response.status).toBe(403);
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it("prevents an ADMIN from promoting a user to OWNER", async () => {
    prismaMock.user.findFirst.mockResolvedValue({
      id: "target-1",
      role: "ADMIN",
    });

    const response = await supertest(app).patch("/api/team/target-1").send({ role: "OWNER" });

    expect(response.status).toBe(403);
    expect(prismaMock.user.updateMany).not.toHaveBeenCalled();
  });

  it.each(["VIEWER", "ANALYST", "EDITOR"])("prevents %s from deciding approvals", async (role) => {
    currentRole = role;

    const response = await supertest(app)
      .patch("/api/approvals/approval-1")
      .send({ status: "APPROVED" });

    expect(response.status).toBe(403);
    expect(prismaMock.approvalRequest.update).not.toHaveBeenCalled();
  });

  it("returns 404 instead of mutating a cross-tenant approval ID", async () => {
    prismaMock.approvalRequest.findFirst.mockResolvedValue(null);

    const response = await supertest(app)
      .patch("/api/approvals/tenant-b-approval")
      .send({ status: "APPROVED" });

    expect(response.status).toBe(404);
    expect(prismaMock.approvalRequest.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "tenant-b-approval",
          OR: expect.any(Array),
        }),
      })
    );
    expect(prismaMock.approvalRequest.update).not.toHaveBeenCalled();
  });

  it("prevents VIEWER access to API key creation", async () => {
    currentRole = "VIEWER";

    const response = await supertest(app)
      .post("/api/keys")
      .send({
        name: "escalation",
        scopes: ["contacts:write"],
      });

    expect(response.status).toBe(403);
    expect(prismaMock.apiKey.create).not.toHaveBeenCalled();
  });
});
