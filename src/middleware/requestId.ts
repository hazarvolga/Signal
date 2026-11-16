import type { Request, Response, NextFunction } from "express";
import crypto from "crypto";

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const requestId = crypto.randomUUID();
  (req as Request & { requestId?: string }).requestId = requestId;
  res.setHeader("x-request-id", requestId);
  next();
}
