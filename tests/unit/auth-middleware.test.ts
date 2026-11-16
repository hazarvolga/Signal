import { describe, it, expect, vi, beforeEach } from "vitest";
import { requireAuth, requireRole } from "../../src/middleware/auth";
import type { Request, Response, NextFunction } from "express";

// ─── Helpers ──────────────────────────────────────────────────────────────

function makeReq(
  overrides: Partial<Omit<Request, "isAuthenticated">> & {
    isAuthenticated?: () => boolean;
  } = {}
): Request {
  return {
    isAuthenticated: () => false,
    user: undefined,
    logout: vi.fn((callback: (error?: unknown) => void) => callback()),
    ...overrides,
  } as unknown as Request;
}

function makeRes(): {
  res: Response;
  json: ReturnType<typeof vi.fn>;
  status: ReturnType<typeof vi.fn>;
} {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  const res = { status, json } as unknown as Response;
  return { res, json, status };
}

const next: NextFunction = vi.fn();

// ─── requireAuth ─────────────────────────────────────────────────────────

describe("requireAuth middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls next() when user is authenticated", () => {
    const req = makeReq({
      isAuthenticated: () => true,
      user: {
        id: "user-1",
        email: "test@example.com",
        role: "ADMIN",
        status: "ACTIVE",
      } as any,
    });
    const { res } = makeRes();

    requireAuth(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect((res as any).status).not.toHaveBeenCalled();
  });

  it("returns 401 when isAuthenticated() is false", () => {
    const req = makeReq({ isAuthenticated: () => false });
    const { res, status, json } = makeRes();

    requireAuth(req, res, next);

    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ error: "Authentication required", code: "UNAUTHORIZED" })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when req.user is undefined even if isAuthenticated is true", () => {
    const req = makeReq({ isAuthenticated: () => true, user: undefined });
    const { res, status } = makeRes();

    requireAuth(req, res, next);

    expect(status).toHaveBeenCalledWith(401);
  });

  it("returns 401 and logs out an inactive user", () => {
    const logout = vi.fn((callback: (error?: unknown) => void) => callback());
    const req = makeReq({
      isAuthenticated: () => true,
      user: { id: "user-1", status: "PENDING" } as any,
      logout: logout as any,
    });
    const { res, status, json } = makeRes();

    requireAuth(req, res, next);

    expect(logout).toHaveBeenCalledOnce();
    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ code: "ACCOUNT_INACTIVE" }));
    expect(next).not.toHaveBeenCalled();
  });
});

// ─── requireRole ─────────────────────────────────────────────────────────

describe("requireRole middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls next() when user has an allowed role", () => {
    const req = makeReq({
      isAuthenticated: () => true,
      user: { id: "user-1", role: "ADMIN" } as any,
    });
    const { res } = makeRes();

    const middleware = requireRole("ADMIN", "OWNER");
    middleware(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });

  it("returns 403 when user role is not in allowed list", () => {
    const req = makeReq({
      isAuthenticated: () => true,
      user: { id: "user-1", role: "VIEWER" } as any,
    });
    const { res, status, json } = makeRes();

    const middleware = requireRole("ADMIN", "OWNER");
    middleware(req, res, next);

    expect(status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ error: "Insufficient permissions", code: "FORBIDDEN" })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 403 when req.user is missing", () => {
    const req = makeReq({ user: undefined });
    const { res, status } = makeRes();

    const middleware = requireRole("ADMIN");
    middleware(req, res, next);

    expect(status).toHaveBeenCalledWith(403);
  });
});
