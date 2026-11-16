import type { Request } from "express";
import { AppError } from "../middleware/errorHandler";

export type AuthenticatedUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  organizationId: string;
};

export function getAuthenticatedUser(req: Request): AuthenticatedUser {
  const user = req.user as Partial<AuthenticatedUser> | undefined;

  if (!user?.id || !user.organizationId) {
    throw new AppError("Authentication context is missing", 401);
  }

  return user as AuthenticatedUser;
}

export function getOrganizationId(req: Request): string {
  return getAuthenticatedUser(req).organizationId;
}

