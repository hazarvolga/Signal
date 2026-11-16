import express, { type Request } from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { hashPassword } from "../../src/lib/authHelpers";

const prismaMock = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  organization: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("../../src/services/prisma", () => ({ prisma: prismaMock }));

import registerAuthRoutes, { isLoginEligible, toSafeUser } from "../../src/routes/auth";

function createAuthApp(
  options: {
    authenticatedUser?: Record<string, unknown>;
    onLogin?: (user: unknown) => void;
    onRegenerate?: () => void;
  } = {}
) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    const regenerate = options.onRegenerate ?? vi.fn();
    (req as Request).session = {
      regenerate: (callback: (error?: unknown) => void) => {
        regenerate();
        callback();
      },
      save: (callback: (error?: unknown) => void) => callback(),
      destroy: (callback: (error?: unknown) => void) => callback(),
    } as any;
    (req as any).isAuthenticated = () => Boolean(options.authenticatedUser);
    (req as any).user = options.authenticatedUser;
    (req as any).login = (user: unknown, callback: (error?: unknown) => void) => {
      options.onLogin?.(user);
      callback();
    };
    (req as any).logout = (callback: (error?: unknown) => void) => callback();
    next();
  });
  app.use(registerAuthRoutes({} as any));
  return app;
}

describe("auth route security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects users whose password was never provisioned", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "owner@example.com",
      name: "Owner",
      role: "OWNER",
      status: "ACTIVE",
      organizationId: "org-1",
      passwordHash: null,
    });
    const onLogin = vi.fn();

    const response = await request(createAuthApp({ onLogin }))
      .post("/api/auth/login")
      .send({ email: "owner@example.com", password: "untrusted-password" });

    expect(response.status).toBe(401);
    expect(onLogin).not.toHaveBeenCalled();
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it("rejects PENDING users even when their password is valid", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "pending@example.com",
      name: "Pending",
      role: "VIEWER",
      status: "PENDING",
      organizationId: "org-1",
      passwordHash: hashPassword("correct-password"),
    });
    const onLogin = vi.fn();

    const response = await request(createAuthApp({ onLogin }))
      .post("/api/auth/login")
      .send({ email: "pending@example.com", password: "correct-password" });

    expect(response.status).toBe(401);
    expect(onLogin).not.toHaveBeenCalled();
  });

  it("regenerates the session before establishing a valid login", async () => {
    const user = {
      id: "user-1",
      email: "active@example.com",
      name: "Active",
      role: "ADMIN",
      status: "ACTIVE",
      organizationId: "org-1",
      passwordHash: hashPassword("correct-password"),
    };
    prismaMock.user.findUnique.mockResolvedValue(user);
    const onLogin = vi.fn();
    const onRegenerate = vi.fn();

    const response = await request(createAuthApp({ onLogin, onRegenerate }))
      .post("/api/auth/login")
      .send({ email: user.email, password: "correct-password" });

    expect(response.status).toBe(200);
    expect(onRegenerate).toHaveBeenCalledOnce();
    expect(onLogin).toHaveBeenCalledWith(user);
    expect(response.body).not.toHaveProperty("passwordHash");
  });

  it("does not allow the mock SSO callback to create or log in a user", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const onLogin = vi.fn();

    const response = await request(createAuthApp({ onLogin }))
      .post("/auth/sso/callback")
      .send({
        state: Buffer.from(JSON.stringify({ orgId: "org-1" })).toString("base64url"),
        email: "attacker@example.com",
      });

    expect(response.status).toBe(501);
    expect(prismaMock.user.create).not.toHaveBeenCalled();
    expect(onLogin).not.toHaveBeenCalled();
  });

  it("hides mock SSO endpoints in production", async () => {
    vi.stubEnv("NODE_ENV", "production");

    const response = await request(createAuthApp())
      .get("/auth/sso/mock-login")
      .query({ state: "forged" });

    expect(response.status).toBe(404);
  });

  it("returns only the safe user DTO fields", () => {
    const user = {
      id: "user-1",
      email: "active@example.com",
      name: "Active",
      role: "OWNER",
      status: "ACTIVE",
      organizationId: "org-1",
      passwordHash: "salt:hash",
    };

    expect(isLoginEligible(user)).toBe(true);
    expect(toSafeUser(user)).toEqual({
      id: "user-1",
      email: "active@example.com",
      name: "Active",
      role: "OWNER",
      status: "ACTIVE",
      organizationId: "org-1",
    });
  });

  it("scopes SSO configuration to the authenticated admin tenant and redacts its secret", async () => {
    prismaMock.organization.findUnique.mockResolvedValue({
      id: "org-2",
      ssoEnabled: true,
      ssoDomain: "tenant.example",
      ssoClientId: "client-id",
      ssoClientSecret: "must-not-leak",
      ssoIssuer: "https://issuer.example",
      ssoEntryPoint: null,
      ssoCert: null,
    });

    const response = await request(
      createAuthApp({
        authenticatedUser: {
          id: "admin-1",
          role: "ADMIN",
          status: "ACTIVE",
          organizationId: "org-2",
        },
      })
    ).get("/api/auth/sso/config");

    expect(response.status).toBe(200);
    expect(prismaMock.organization.findUnique).toHaveBeenCalledWith({
      where: { id: "org-2" },
    });
    expect(response.body).not.toHaveProperty("ssoClientSecret");
    expect(response.body.clientSecretConfigured).toBe(true);
  });

  it("does not spend the authentication-attempt budget on authorized SSO config reads", async () => {
    prismaMock.organization.findUnique.mockResolvedValue({
      id: "org-2",
      ssoEnabled: false,
      ssoDomain: null,
      ssoClientId: null,
      ssoClientSecret: null,
      ssoIssuer: null,
      ssoEntryPoint: null,
      ssoCert: null,
    });
    const app = createAuthApp({
      authenticatedUser: {
        id: "admin-1",
        role: "ADMIN",
        status: "ACTIVE",
        organizationId: "org-2",
      },
    });

    const responses = await Promise.all(
      Array.from({ length: 25 }, () => request(app).get("/api/auth/sso/config"))
    );

    expect(responses.every(({ status }) => status === 200)).toBe(true);
  });
});
