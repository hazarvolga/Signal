import { doubleCsrf } from "csrf-csrf";
import type { Request, Response, NextFunction } from "express";

const { generateCsrfToken: generateToken, doubleCsrfProtection } = doubleCsrf({
  getSecret: () => process.env.SESSION_SECRET || "csrf-dev-secret-do-not-use-in-prod",
  getSessionIdentifier: (req) => req.sessionID,
  cookieName: "signal.csrf",
  cookieOptions: {
    sameSite: "strict",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
  },
  size: 64,
  getCsrfTokenFromRequest: (req) => (req.headers["x-csrf-token"] as string) ?? "",
});

export function csrfProtectionMiddleware(req: Request, res: Response, next: NextFunction) {
  const exemptPrefixes = ["/api/v1"];

  const exemptExactPaths = [
    "/api/auth/login",
    "/auth/sso/callback",
    "/api/webhooks/ses",
    "/api/webhooks/shopify",
    "/health",
    "/api/health",
  ];
  const isRfc8058OneClick = req.method === "POST" && /^\/api\/unsubscribe\/[^/]+$/.test(req.path);

  if (
    isRfc8058OneClick ||
    exemptExactPaths.includes(req.path) ||
    exemptPrefixes.some((path) => req.path === path || req.path.startsWith(`${path}/`))
  ) {
    return next();
  }

  return doubleCsrfProtection(req, res, next);
}

export { generateToken };
