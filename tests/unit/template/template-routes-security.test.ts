import express, { type NextFunction, type Request, type Response } from "express";
import supertest from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import registerTemplateRoutes from "../../../src/routes/templates";
import type { FilterFunction } from "../../../src/services/template/types";
import type { RouteContext } from "../../../src/routes/context";

describe("POST /api/templates/filters", () => {
  const registerFilter = vi.fn();
  const app = express();
  let currentRole = "ADMIN";

  app.use(express.json());
  app.use((req, _res, next) => {
    req.isAuthenticated = (() => true) as Request["isAuthenticated"];
    req.user = {
      id: "admin-1",
      organizationId: "org-1",
      role: currentRole,
      status: "ACTIVE",
    };
    next();
  });
  app.use(
    registerTemplateRoutes({
      templateEngine: { registerFilter },
    } as unknown as RouteContext)
  );
  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    res.status(500).json({
      error: error instanceof Error ? error.message : String(error),
    });
  });

  beforeEach(() => {
    registerFilter.mockReset();
    currentRole = "ADMIN";
  });

  it("rejects the legacy executable code field", async () => {
    const response = await supertest(app).post("/api/templates/filters").send({
      name: "unsafe_filter",
      code: '(value) => require("node:fs").readFileSync(value)',
      operation: "uppercase",
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/Executable JavaScript filters are not supported/);
    expect(registerFilter).not.toHaveBeenCalled();
  });

  it("rejects operations outside the declarative allowlist", async () => {
    const response = await supertest(app)
      .post("/api/templates/filters")
      .send({
        name: "unknown_filter",
        operation: "execute",
        args: ["whoami"],
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/Unsupported filter operation/);
    expect(registerFilter).not.toHaveBeenCalled();
  });

  it("registers an allowlisted operation for the authenticated organization", async () => {
    const response = await supertest(app)
      .post("/api/templates/filters")
      .send({
        name: "organization_prefix",
        operation: "prefix",
        args: ["org-"],
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(registerFilter).toHaveBeenCalledOnce();

    const [name, filter, organizationId] = registerFilter.mock.calls[0] as [
      string,
      FilterFunction,
      string,
    ];
    expect(name).toBe("organization_prefix");
    expect(organizationId).toBe("org-1");
    expect(filter("customer")).toBe("org-customer");
  });

  it.each(["VIEWER", "ANALYST"])("blocks %s from creating templates", async (role) => {
    currentRole = role;

    const response = await supertest(app).post("/api/templates").send({
      name: "Unauthorized",
      content: "<p>test</p>",
      category: "TEST",
    });

    expect(response.status).toBe(403);
  });
});
