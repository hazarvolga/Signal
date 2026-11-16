import { Router, type Request } from "express";
import rateLimit from "express-rate-limit";
import crypto from "crypto";
import { prisma } from "../services/prisma";
import { AppError } from "../middleware/errorHandler";
import { requireAuth, requireRole } from "../middleware/auth";
import { validateBody, LoginSchema } from "../lib/schemas";
import { hashPassword, verifyPassword } from "../lib/authHelpers";
import type { RouteContext } from "./context";

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.AUTH_RATE_LIMIT_MAX || 100),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many authentication attempts." },
});

const SSO_STATE_TTL_MS = 10 * 60 * 1000;

type AuthenticatedUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  organizationId: string;
  passwordHash?: string | null;
};

export function isLoginEligible(user: Pick<AuthenticatedUser, "passwordHash" | "status">): boolean {
  return user.status === "ACTIVE" && Boolean(user.passwordHash);
}

export function toSafeUser(user: AuthenticatedUser) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
    organizationId: user.organizationId,
  };
}

function clearSsoState(req: Request): void {
  delete (req.session as any).ssoState;
}

function consumeSsoState(req: Request, state: unknown): string | null {
  const stored = (req.session as any).ssoState as
    { value: string; organizationId: string; expiresAt: number } | undefined;

  clearSsoState(req);

  if (
    !stored ||
    typeof state !== "string" ||
    stored.expiresAt < Date.now() ||
    stored.value.length !== state.length ||
    !crypto.timingSafeEqual(Buffer.from(stored.value), Buffer.from(state))
  ) {
    return null;
  }

  return stored.organizationId;
}

export default function registerAuthRoutes(_ctx: RouteContext): Router {
  const router = Router();

  // GAP-001: email+password login endpoint with scrypt password verification
  router.post("/api/auth/login", authLimiter, validateBody(LoginSchema), async (req, res, next) => {
    try {
      const { email, password } = req.body;

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials", code: "INVALID_CREDENTIALS" });
      }

      if (!isLoginEligible(user) || !verifyPassword(password, user.passwordHash!)) {
        return res.status(401).json({ error: "Invalid credentials", code: "INVALID_CREDENTIALS" });
      }

      req.session.regenerate((err) => {
        if (err) return next(err);
        req.login(user, (loginError) => {
          if (loginError) return next(loginError);
          req.session.save((saveErr) => {
            if (saveErr) return next(saveErr);
            return res.json(toSafeUser(user));
          });
        });
      });
    } catch (err) {
      next(err);
    }
  });

  // GAP-001: Logout endpoint
  router.post("/api/auth/logout", requireAuth, (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      req.session.destroy(() => {
        res.clearCookie("signal.sid", {
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
        });
        res.json({ success: true });
      });
    });
  });

  router.post("/api/auth/change-password", authLimiter, requireAuth, async (req, res, next) => {
    try {
      const { currentPassword, newPassword } = req.body;
      if (
        typeof currentPassword !== "string" ||
        typeof newPassword !== "string" ||
        newPassword.length < 14 ||
        newPassword.length > 128
      ) {
        throw new AppError("New password must be between 14 and 128 characters", 400);
      }
      const user = await prisma.user.findUnique({
        where: { id: (req.user as AuthenticatedUser).id },
        select: { id: true, passwordHash: true },
      });
      if (!user?.passwordHash || !verifyPassword(currentPassword, user.passwordHash)) {
        return res.status(401).json({ error: "Current password is incorrect" });
      }
      if (verifyPassword(newPassword, user.passwordHash)) {
        throw new AppError("New password must differ from the current password", 400);
      }
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: hashPassword(newPassword) },
      });
      req.session.regenerate((error) => {
        if (error) return next(error);
        res.json({ success: true, reauthenticationRequired: true });
      });
    } catch (error) {
      next(error);
    }
  });

  // BUG-001 FIX: Use req.user from passport session instead of findFirst()
  router.get("/api/me", requireAuth, async (req, res, next) => {
    try {
      const userId = (req.user as any).id;
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
          organizationId: true,
          mfaEnabled: true,
          lastLoginAt: true,
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
              logoUrl: true,
              timezone: true,
            },
          },
        },
      });
      if (!user) throw new AppError("User not found", 404);
      res.json(user);
    } catch (err) {
      next(err);
    }
  });

  router.get(
    "/api/auth/sso/config",
    requireAuth,
    requireRole("ADMIN", "OWNER"),
    async (req, res, next) => {
      try {
        const organizationId = (req.user as any).organizationId;
        const org = await prisma.organization.findUnique({ where: { id: organizationId } });
        if (!org) throw new AppError("Organization not found", 404);
        res.json({
          ssoEnabled: org.ssoEnabled,
          ssoDomain: org.ssoDomain,
          ssoClientId: org.ssoClientId,
          ssoIssuer: org.ssoIssuer,
          ssoEntryPoint: org.ssoEntryPoint,
          ssoCert: org.ssoCert,
          clientSecretConfigured: Boolean(org.ssoClientSecret),
        });
      } catch (err) {
        next(err);
      }
    }
  );

  router.post(
    "/api/auth/sso/config",
    requireAuth,
    requireRole("ADMIN", "OWNER"),
    async (req, res, next) => {
      try {
        const organizationId = (req.user as any).organizationId;
        const org = await prisma.organization.findUnique({ where: { id: organizationId } });
        if (!org) throw new AppError("Organization not found", 404);

        const {
          ssoEnabled,
          ssoDomain,
          ssoClientId,
          ssoClientSecret,
          ssoIssuer,
          ssoEntryPoint,
          ssoCert,
        } = req.body;
        if (ssoEnabled) {
          return res.status(501).json({
            error:
              "SSO cannot be enabled until verified OIDC code exchange and token validation are configured",
          });
        }

        const updated = await prisma.organization.update({
          where: { id: org.id },
          data: {
            ssoEnabled,
            ssoDomain,
            ssoClientId,
            ...(typeof ssoClientSecret === "string" && ssoClientSecret.length > 0
              ? { ssoClientSecret }
              : {}),
            ssoIssuer,
            ssoEntryPoint,
            ssoCert,
          },
          select: {
            ssoEnabled: true,
            ssoDomain: true,
            ssoClientId: true,
            ssoIssuer: true,
            ssoEntryPoint: true,
            ssoCert: true,
            ssoClientSecret: true,
          },
        });

        res.json({
          ssoEnabled: updated.ssoEnabled,
          ssoDomain: updated.ssoDomain,
          ssoClientId: updated.ssoClientId,
          ssoIssuer: updated.ssoIssuer,
          ssoEntryPoint: updated.ssoEntryPoint,
          ssoCert: updated.ssoCert,
          clientSecretConfigured: Boolean(updated.ssoClientSecret),
        });
      } catch (err) {
        next(err);
      }
    }
  );

  router.get("/api/auth/sso/url", authLimiter, async (req, res, next) => {
    try {
      const { domain } = req.query;
      if (typeof domain !== "string" || domain.trim().length === 0) {
        return res.status(400).json({ error: "SSO domain is required" });
      }

      const org = await prisma.organization.findFirst({
        where: { ssoDomain: domain.trim().toLowerCase() },
      });

      if (!org || !org.ssoEnabled) {
        return res.status(400).json({ error: "SSO not enabled for this domain" });
      }

      const redirectUri = `${process.env.APP_URL || `http://localhost:3000`}/auth/sso/callback`;

      if (org.ssoIssuer) {
        const state = crypto.randomBytes(32).toString("base64url");
        (req.session as any).ssoState = {
          value: state,
          organizationId: org.id,
          expiresAt: Date.now() + SSO_STATE_TTL_MS,
        };
        const params = new URLSearchParams({
          client_id: org.ssoClientId || "",
          redirect_uri: redirectUri,
          response_type: "code",
          scope: "openid profile email",
          state,
        });
        return res.json({ url: `${org.ssoIssuer}/authorize?${params.toString()}` });
      }

      if (process.env.NODE_ENV === "production") {
        return res.status(404).json({ error: "Not found" });
      }

      const state = crypto.randomBytes(32).toString("base64url");
      (req.session as any).ssoState = {
        value: state,
        organizationId: org.id,
        expiresAt: Date.now() + SSO_STATE_TTL_MS,
      };
      return res.json({
        url: `/auth/sso/mock-login?state=${state}`,
        isMock: true,
      });
    } catch (err) {
      next(err);
    }
  });

  // BUG-002 FIX: Validate state before processing; remove hardcoded user
  // BUG-003 FIX: Eliminate JSON.stringify(user) in script context; restrict postMessage origin
  router.get("/auth/sso/callback", authLimiter, async (req, res, next) => {
    try {
      const { code, state: stateParam } = req.query;

      if (!stateParam || !code) {
        return res.status(400).json({ error: "Invalid SSO callback parameters" });
      }

      const orgId = consumeSsoState(req, stateParam);
      if (!orgId) {
        return res.status(400).json({ error: "Invalid state parameter" });
      }

      const org = await prisma.organization.findUnique({ where: { id: orgId } });
      if (!org) throw new AppError("Organization not found", 404);

      return res.status(501).json({
        error: "OIDC code exchange is not configured",
      });
    } catch (err) {
      next(err);
    }
  });

  // BUG-002/003 FIX: Mock login now uses POST form submission, not GET redirect bypass.
  // BUG-003 FIX: postMessage uses specific APP_URL origin, not wildcard '*'.
  router.post("/auth/sso/callback", authLimiter, async (req, res, next) => {
    try {
      if (process.env.NODE_ENV === "production") {
        return res.status(404).json({ error: "Not found" });
      }

      consumeSsoState(req, req.body?.state);
      return res.status(501).json({
        error: "Mock SSO login is disabled; configure a real OIDC provider",
      });
    } catch (err) {
      next(err);
    }
  });

  // BUG-002 FIX: Mock login now renders a POST form, removing the GET redirect bypass
  router.get("/auth/sso/mock-login", authLimiter, (req, res, next) => {
    try {
      if (process.env.NODE_ENV === "production") {
        return res.status(404).send("Not found");
      }

      const { state } = req.query;
      const storedState = (req.session as any).ssoState?.value;
      if (!state || typeof state !== "string" || state !== storedState) {
        return res.status(400).send("Missing state parameter");
      }

      res.status(501).send("Mock SSO login is disabled; configure a real OIDC provider");
    } catch (err) {
      next(err);
    }
  });

  // BUG-005 FIX: Use requireAuth + req.user instead of findFirst()
  router.post("/api/me/mfa", requireAuth, async (req, res, next) => {
    try {
      res.status(501).json({
        error:
          "MFA enrollment is unavailable until TOTP verification and recovery codes are implemented",
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
