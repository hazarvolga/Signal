import type { Request, Response, NextFunction } from "express";
import { logger } from "../services/logger";
import * as Sentry from "@sentry/node";

export enum ErrorCode {
  VALIDATION_ERROR = "VALIDATION_ERROR",
  NOT_FOUND = "NOT_FOUND",
  UNAUTHORIZED = "UNAUTHORIZED",
  CONFLICT = "CONFLICT",
  INTERNAL_ERROR = "INTERNAL_ERROR",
  PRISMA_ERROR = "PRISMA_ERROR",
  RATE_LIMITED = "RATE_LIMITED",
  SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",
}

export class AppError extends Error {
  statusCode: number;
  code: ErrorCode;
  details?: Record<string, unknown>;

  constructor(
    message: string,
    statusCode: number = 500,
    code: ErrorCode = ErrorCode.INTERNAL_ERROR,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.name = "AppError";
  }
}

function isPrismaError(err: unknown): boolean {
  return typeof (err as any)?.code === "string" && (err as any).code.startsWith("P");
}

function isMulterError(err: unknown): boolean {
  return (err as any)?.name === "MulterError";
}

function isZodError(err: unknown): boolean {
  return (err as any)?.name === "ZodError";
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  const requestId = (req as any).requestId || res.getHeader("x-request-id");
  const organizationId = (req.user as any)?.organizationId;
  const capture = () => {
    Sentry.withScope((scope) => {
      if (requestId) scope.setTag("request_id", String(requestId));
      if (organizationId) scope.setTag("organization_id", organizationId);
      Sentry.captureException(err);
    });
  };

  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      capture();
      logger.error({ err, requestId }, "AppError 5xx");
    }
    res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
      ...(err.details ? { details: err.details } : {}),
    });
    return;
  }

  if (isPrismaError(err)) {
    const prismaErr = err as { code: string; meta?: any };
    switch (prismaErr.code) {
      case "P2002": {
        const target = prismaErr.meta?.target as string[] | undefined;
        res.status(409).json({
          error: "A record with this value already exists",
          code: ErrorCode.CONFLICT,
          details: target ? { fields: target } : undefined,
        });
        return;
      }
      case "P2025": {
        res.status(404).json({
          error: "Record not found",
          code: ErrorCode.NOT_FOUND,
        });
        return;
      }
      default: {
        capture();
        logger.error({ err: prismaErr, code: prismaErr.code, requestId }, "Prisma database error");
        res.status(500).json({
          error: "A database error occurred",
          code: ErrorCode.PRISMA_ERROR,
        });
        return;
      }
    }
  }

  if (isZodError(err)) {
    const zodErr = err as { errors: Array<{ path: (string | number)[]; message: string }> };
    const fieldErrors = zodErr.errors.map((e) => ({
      field: e.path.join("."),
      message: e.message,
    }));
    res.status(400).json({
      error: "Validation failed",
      code: ErrorCode.VALIDATION_ERROR,
      details: { fields: fieldErrors },
    });
    return;
  }

  if (isMulterError(err)) {
    const multerErr = err as { code: string; field?: string };
    res.status(400).json({
      error: multerErr.code === "LIMIT_FILE_SIZE"
        ? "File too large"
        : multerErr.code === "LIMIT_UNEXPECTED_FILE"
          ? "Unexpected file field"
          : "File upload error",
      code: ErrorCode.VALIDATION_ERROR,
      details: multerErr.field ? { field: multerErr.field } : undefined,
    });
    return;
  }

  const statusCode = (err as any)?.statusCode || 500;
  const message = statusCode === 500 ? "Internal server error" : (err as any)?.message;

  if (statusCode === 500) {
    capture();
    logger.error({ err, requestId }, "Unhandled server error");
  }

  res.status(statusCode).json({
    error: message,
    code: statusCode === 500 ? ErrorCode.INTERNAL_ERROR : undefined,
    ...(requestId ? { requestId } : {}),
  });
}
