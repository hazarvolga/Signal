import { Router } from "express";
import { prisma } from "../services/prisma";
import { AppError } from "../middleware/errorHandler";
import { requireAuth, requireRole } from "../middleware/auth";
import { getAuthenticatedUser, getOrganizationId } from "../lib/authContext";
import type { RouteContext } from "./context";
import crypto from "crypto";
import { normalizeApiKeyScopes } from "../lib/apiKeyScopes";
import { hashPassword } from "../lib/authHelpers";

const SYSTEM_ROLES = new Set(["OWNER", "ADMIN", "EDITOR", "ANALYST", "VIEWER"]);

export default function registerAdminRoutes(ctx: RouteContext): Router {
  const router = Router();
  const adminOnly = [requireAuth, requireRole("ADMIN", "OWNER")] as const;

  router.use("/api/keys", ...adminOnly);
  router.use("/api/team", ...adminOnly);
  router.use("/api/roles", ...adminOnly);
  router.use("/api/brands", requireAuth);
  router.use("/api/approvals", requireAuth);

  // ── API Keys ──────────────────────────────────────────────────────

  router.get("/api/keys", async (req, res, next) => {
    try {
      const orgId = getOrganizationId(req);
      const keys = await prisma.apiKey.findMany({ where: { organizationId: orgId } });
      const masked = keys.map((k) => ({
        ...k,
        key: k.key.substring(0, 8) + "...",
        scopes: typeof k.scopes === "string" ? JSON.parse(k.scopes) : k.scopes,
      }));
      res.json(masked);
    } catch (err) {
      next(err);
    }
  });

  router.post("/api/keys", async (req, res, next) => {
    try {
      const { name, scopes } = req.body;
      const orgId = getOrganizationId(req);
      if (typeof name !== "string" || name.trim().length < 2 || name.length > 100) {
        throw new AppError("API key name must be between 2 and 100 characters", 400);
      }
      let validatedScopes;
      try {
        validatedScopes = normalizeApiKeyScopes(scopes);
      } catch (error) {
        throw new AppError(error instanceof Error ? error.message : "Invalid API key scopes", 400);
      }

      const plaintextKey = `sig_${crypto.randomUUID()}${crypto.randomUUID()}`;
      const keyHash = crypto.createHash("sha256").update(plaintextKey).digest("hex");

      await prisma.apiKey.create({
        data: {
          name: name.trim(),
          key: keyHash,
          scopes: JSON.stringify(validatedScopes),
          organizationId: orgId,
        },
      });
      res.status(201).json({ key: plaintextKey, name: name.trim(), scopes: validatedScopes });
    } catch (err) {
      next(err);
    }
  });

  router.delete("/api/keys/:id", async (req, res, next) => {
    try {
      const result = await prisma.apiKey.deleteMany({
        where: { id: req.params.id, organizationId: getOrganizationId(req) },
      });
      if (result.count === 0) throw new AppError("API key not found", 404);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  });

  // ── Team Management ───────────────────────────────────────────────

  router.get("/api/team", async (req, res, next) => {
    try {
      const users = await prisma.user.findMany({
        where: { organizationId: getOrganizationId(req) },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
          roleId: true,
          organizationId: true,
          createdAt: true,
          updatedAt: true,
          customRole: true,
        },
        orderBy: { createdAt: "asc" },
      });
      res.json(users);
    } catch (err) {
      next(err);
    }
  });

  router.post("/api/team/invite", async (req, res, next) => {
    try {
      const { email, name, role } = req.body;
      const actor = getAuthenticatedUser(req);
      const invitedRole = role || "VIEWER";
      if (
        typeof email !== "string" ||
        !email.includes("@") ||
        typeof name !== "string" ||
        !name.trim() ||
        !SYSTEM_ROLES.has(invitedRole)
      ) {
        throw new AppError("Invalid team invitation", 400);
      }
      if (invitedRole === "OWNER" && actor.role !== "OWNER") {
        throw new AppError("Only an owner can invite another owner", 403);
      }

      try {
        const newUser = await prisma.user.create({
          data: {
            email,
            name: name.trim(),
            role: invitedRole,
            status: "PENDING",
            organizationId: getOrganizationId(req),
          },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            status: true,
            organizationId: true,
            createdAt: true,
          },
        });
        res.status(201).json(newUser);
      } catch (e) {
        res.status(400).json({ error: "User already exists or invalid data" });
      }
    } catch (err) {
      next(err);
    }
  });

  router.post("/api/team/:id/activate", async (req, res, next) => {
    try {
      const { id } = req.params;
      const { temporaryPassword } = req.body;
      if (
        typeof temporaryPassword !== "string" ||
        temporaryPassword.length < 14 ||
        temporaryPassword.length > 128
      ) {
        throw new AppError("A temporary password between 14 and 128 characters is required", 400);
      }
      try {
        const result = await prisma.user.updateMany({
          where: { id, organizationId: getOrganizationId(req), status: "PENDING" },
          data: { status: "ACTIVE", passwordHash: hashPassword(temporaryPassword) },
        });
        if (result.count === 0) throw new AppError("User not found", 404);
        const user = await prisma.user.findFirst({
          where: { id, organizationId: getOrganizationId(req) },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            status: true,
            organizationId: true,
          },
        });
        res.json(user);
      } catch (e) {
        res.status(400).json({ error: "Failed to activate user" });
      }
    } catch (err) {
      next(err);
    }
  });

  router.patch("/api/team/:id", async (req, res, next) => {
    try {
      const { id } = req.params;
      const { role, name } = req.body;
      const orgId = getOrganizationId(req);
      const actor = getAuthenticatedUser(req);
      if (role !== undefined && (typeof role !== "string" || !SYSTEM_ROLES.has(role))) {
        throw new AppError("Invalid system role", 400);
      }
      if (name !== undefined && (typeof name !== "string" || !name.trim())) {
        throw new AppError("Invalid user name", 400);
      }
      const target = await prisma.user.findFirst({
        where: { id, organizationId: orgId },
        select: { id: true, role: true },
      });
      if (!target) throw new AppError("User not found", 404);
      if (actor.role !== "OWNER" && (target.role === "OWNER" || role === "OWNER")) {
        throw new AppError("Only an owner can grant or modify owner access", 403);
      }
      if (target.role === "OWNER" && role && role !== "OWNER") {
        const ownerCount = await prisma.user.count({
          where: { organizationId: orgId, role: "OWNER" },
        });
        if (ownerCount <= 1) {
          throw new AppError("Cannot demote the last owner", 400);
        }
      }

      try {
        const result = await prisma.user.updateMany({
          where: { id, organizationId: orgId },
          data: {
            ...(role !== undefined && { role }),
            ...(name !== undefined && { name: name.trim() }),
          },
        });
        if (result.count === 0) throw new AppError("User not found", 404);
        const updatedUser = await prisma.user.findFirst({
          where: { id, organizationId: orgId },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            status: true,
            organizationId: true,
          },
        });
        res.json(updatedUser);
      } catch (e) {
        res.status(400).json({ error: "Failed to update user" });
      }
    } catch (err) {
      next(err);
    }
  });

  router.delete("/api/team/:id", async (req, res, next) => {
    try {
      const { id } = req.params;

      const orgId = getOrganizationId(req);
      const actor = getAuthenticatedUser(req);
      if (actor.id === id) {
        return res.status(400).json({ error: "You cannot delete your own account" });
      }
      const userToDelete = await prisma.user.findFirst({ where: { id, organizationId: orgId } });
      if (!userToDelete) throw new AppError("User not found", 404);
      if (userToDelete.role === "OWNER" && actor.role !== "OWNER") {
        throw new AppError("Only an owner can remove another owner", 403);
      }
      if (userToDelete?.role === "OWNER") {
        const ownerCount = await prisma.user.count({
          where: { organizationId: userToDelete.organizationId, role: "OWNER" },
        });
        if (ownerCount <= 1) {
          return res.status(400).json({ error: "Cannot delete the last owner" });
        }
      }

      try {
        const result = await prisma.user.deleteMany({ where: { id, organizationId: orgId } });
        if (result.count === 0) throw new AppError("User not found", 404);
        res.json({ success: true });
      } catch (e) {
        res.status(400).json({ error: "Failed to delete user" });
      }
    } catch (err) {
      next(err);
    }
  });

  // ── Roles ─────────────────────────────────────────────────────────

  router.get("/api/roles", async (req, res, next) => {
    try {
      const roles = await prisma.role.findMany({
        where: { organizationId: getOrganizationId(req) },
      });
      res.json(roles);
    } catch (err) {
      next(err);
    }
  });

  router.post("/api/roles", async (req, res, next) => {
    try {
      const { name, permissions } = req.body;
      const role = await prisma.role.create({
        data: {
          name,
          permissions: JSON.stringify(permissions),
          organizationId: getOrganizationId(req),
        },
      });
      res.json(role);
    } catch (err) {
      next(err);
    }
  });

  // ── Brands ────────────────────────────────────────────────────────

  router.get("/api/brands", async (req, res, next) => {
    try {
      const brands = await prisma.brand.findMany({
        where: { organizationId: getOrganizationId(req) },
      });
      res.json(brands);
    } catch (err) {
      next(err);
    }
  });

  // ── Approvals ─────────────────────────────────────────────────────

  router.get("/api/approvals", async (req, res, next) => {
    try {
      const orgId = getOrganizationId(req);
      const approvals = await prisma.approvalRequest.findMany({
        where: {
          OR: [{ template: { organizationId: orgId } }, { campaign: { organizationId: orgId } }],
        },
        include: { template: true, campaign: true },
        orderBy: { createdAt: "desc" },
      });
      res.json(approvals);
    } catch (err) {
      next(err);
    }
  });

  router.post("/api/approvals", requireRole("EDITOR", "ADMIN", "OWNER"), async (req, res, next) => {
    try {
      const { templateId, campaignId } = req.body;
      const actor = getAuthenticatedUser(req);
      if (!templateId && !campaignId) {
        return res.status(400).json({ error: "templateId or campaignId is required" });
      }
      if (templateId) {
        const template = await prisma.template.findFirst({
          where: { id: templateId, organizationId: actor.organizationId },
          select: { id: true },
        });
        if (!template) throw new AppError("Template not found", 404);
      }
      if (campaignId) {
        const campaign = await prisma.campaign.findFirst({
          where: { id: campaignId, organizationId: actor.organizationId },
          select: { id: true },
        });
        if (!campaign) throw new AppError("Campaign not found", 404);
      }
      const approval = await prisma.approvalRequest.create({
        data: {
          templateId,
          campaignId,
          requesterId: actor.id,
          status: "PENDING",
        },
      });

      if (templateId) {
        await prisma.template.update({ where: { id: templateId }, data: { status: "IN_REVIEW" } });
      }
      if (campaignId) {
        await prisma.campaign.update({ where: { id: campaignId }, data: { status: "IN_REVIEW" } });
      }

      res.json(approval);
    } catch (err) {
      next(err);
    }
  });

  router.patch("/api/approvals/:id", requireRole("ADMIN", "OWNER"), async (req, res, next) => {
    try {
      const { status, comments } = req.body;
      if (status !== "APPROVED" && status !== "REJECTED") {
        throw new AppError("Approval status must be APPROVED or REJECTED", 400);
      }
      const orgId = getOrganizationId(req);
      const existingApproval = await prisma.approvalRequest.findFirst({
        where: {
          id: req.params.id,
          OR: [{ template: { organizationId: orgId } }, { campaign: { organizationId: orgId } }],
        },
        select: { id: true },
      });
      if (!existingApproval) throw new AppError("Approval request not found", 404);
      const approval = await prisma.approvalRequest.update({
        where: { id: existingApproval.id },
        data: { status, comments },
        include: { template: true, campaign: true },
      });

      const finalStatus = status === "APPROVED" ? "APPROVED" : "DRAFT";

      if (approval.templateId) {
        await prisma.template.update({
          where: { id: approval.templateId },
          data: { status: finalStatus },
        });
      }
      if (approval.campaignId) {
        await prisma.campaign.update({
          where: { id: approval.campaignId },
          data: { status: finalStatus },
        });
      }

      res.json(approval);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
