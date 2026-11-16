import type { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { prisma } from "../services/prisma";

/**
 * requireAuth middleware — verifies the user is authenticated via passport session or valid API key.
 * Supports:
 * - Session cookie (Passport)
 * - Header: x-api-key: sig_...
 * - Header: Authorization: Bearer sig_...
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  // 1. Session auth (Passport)
  if (req.isAuthenticated && req.isAuthenticated() && req.user) {
    const user = req.user as { status?: string };
    if (user.status !== "ACTIVE") {
      req.logout(() => {});
      res.status(401).json({ error: "Account is not active", code: "ACCOUNT_INACTIVE" });
      return;
    }
    next();
    return;
  }

  // 2. API Key auth
  const authHeader = req.headers?.["authorization"];
  const apiKeyHeader =
    (req.headers?.["x-api-key"] as string) ||
    (typeof authHeader === "string" && authHeader.startsWith("Bearer sig_")
      ? authHeader.slice(7)
      : undefined);

  if (apiKeyHeader && apiKeyHeader.startsWith("sig_")) {
    const keyHash = crypto.createHash("sha256").update(apiKeyHeader).digest("hex");
    void prisma.apiKey
      .findUnique({
        where: { key: keyHash },
        include: { organization: true },
      })
      .then((keyRecord) => {
        if (keyRecord && keyRecord.organization) {
          void prisma.apiKey
            .update({
              where: { id: keyRecord.id },
              data: { lastUsedAt: new Date() },
            })
            .catch(() => {});

          req.user = {
            id: keyRecord.id,
            name: keyRecord.name,
            email: `apikey-${keyRecord.id.slice(-6)}@${keyRecord.organization.slug}`,
            role: "ADMIN",
            status: "ACTIVE",
            organizationId: keyRecord.organizationId,
            isApiKey: true,
            scopes: keyRecord.scopes,
          } as any;

          next();
        } else {
          res.status(401).json({ error: "Invalid API key", code: "UNAUTHORIZED" });
        }
      })
      .catch(() => {
        res.status(401).json({ error: "Invalid API key", code: "UNAUTHORIZED" });
      });
    return;
  }

  res.status(401).json({ error: "Authentication required", code: "UNAUTHORIZED" });
}

/**
 * requireRole middleware — verifies the authenticated user has one of the allowed roles.
 * Must be used AFTER requireAuth.
 */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user as any;
    if (!user || !roles.includes(user.role)) {
      res.status(403).json({ error: "Insufficient permissions", code: "FORBIDDEN" });
      return;
    }
    next();
  };
}
