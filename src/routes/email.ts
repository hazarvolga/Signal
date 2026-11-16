import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth";
import { serverEmailEngine } from "../services/emailServer";
import {
  ABConfigurationError,
  AudienceRequiredError,
  queueCampaignDispatch,
  replaceCampaignAudience,
  UnsupportedCampaignChannelError,
} from "../services/email/deliveryQueue";
import { prisma } from "../services/prisma";
import { AppError } from "../middleware/errorHandler";
import { getAuthenticatedUser, getOrganizationId } from "../lib/authContext";
import type { RouteContext } from "./context";
import {
  InvalidTrackingTokenError,
  recordTrackingEvent,
} from "../services/email/tracking";

export default function registerEmailRoutes(_ctx: RouteContext): Router {
  const router = Router();

  router.get("/api/email/track/open/:token", async (req, res, next) => {
    try {
      await recordTrackingEvent(req.params.token, "OPEN");
      const pixel = Buffer.from(
        "R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==",
        "base64"
      );
      res
        .status(200)
        .set({
          "Content-Type": "image/gif",
          "Content-Length": String(pixel.length),
          "Cache-Control": "no-store, no-cache, must-revalidate, private",
          Pragma: "no-cache",
          "X-Content-Type-Options": "nosniff",
        })
        .send(pixel);
    } catch (error) {
      if (error instanceof InvalidTrackingTokenError) {
        return res
          .status(error.message.includes("expired") ? 410 : 400)
          .json({ error: "Invalid tracking token" });
      }
      next(error);
    }
  });

  router.get("/api/email/track/click/:token", async (req, res, next) => {
    try {
      const result = await recordTrackingEvent(req.params.token, "CLICK");
      if (!result.destination) {
        return res.status(400).json({ error: "Invalid tracking destination" });
      }
      res
        .status(302)
        .set({
          "Cache-Control": "no-store, no-cache, must-revalidate, private",
          "Referrer-Policy": "no-referrer",
          "X-Content-Type-Options": "nosniff",
        })
        .redirect(result.destination);
    } catch (error) {
      if (error instanceof InvalidTrackingTokenError) {
        return res
          .status(error.message.includes("expired") ? 410 : 400)
          .json({ error: "Invalid tracking token" });
      }
      next(error);
    }
  });

  router.use("/api/email/", requireAuth);

  /**
   * POST /api/email/dispatch
   * Transmit transactional or test email via server email engine
   */
  router.post(
    "/api/email/dispatch",
    requireRole("ADMIN", "OWNER"),
    async (req, res, next) => {
      try {
        if (process.env.NODE_ENV === "production") {
          return res.status(403).json({
            error: "Direct provider dispatch is disabled in production; use the durable campaign queue",
          });
        }
        const { to, subject, html, replyTo, fromName, fromEmail } = req.body;
        const orgId = getOrganizationId(req);

        if (!to || !subject || !html) {
          return res.status(400).json({ error: "to, subject, and html are required fields" });
        }

        const result = await serverEmailEngine.send({
          to,
          subject,
          html,
          replyTo,
          fromName,
          fromEmail,
          organizationId: orgId,
        });

        if (!result.success) {
          return res.status(500).json({ error: result.error || "Email dispatch failed" });
        }

        res.json(result);
      } catch (err) {
        next(err);
      }
    }
  );

  /**
   * POST /api/email/dispatch-smtp
   * Dedicated endpoint for SMTP transmission
   */
  router.post(
    "/api/email/dispatch-smtp",
    requireRole("ADMIN", "OWNER"),
    async (req, res, next) => {
      try {
        if (process.env.NODE_ENV === "production") {
          return res.status(403).json({
            error: "Direct SMTP dispatch is disabled in production; use the durable campaign queue",
          });
        }
        const { options, config } = req.body;
        const result = await serverEmailEngine.send({
          to: options?.to,
          subject: options?.subject,
          html: options?.html,
          fromName: config?.fromName,
          fromEmail: config?.fromEmail,
        });

        if (!result.success) {
          return res.status(500).json({ error: result.error || "SMTP transmission failed" });
        }

        res.json(result);
      } catch (err) {
        next(err);
      }
    }
  );

  /**
   * PUT /api/email/campaigns/:id/audience
   * Replaces the explicit, tenant-scoped audience snapshot for a campaign.
   */
  router.put(
    "/api/email/campaigns/:id/audience",
    requireRole("EDITOR", "ADMIN", "OWNER"),
    async (req, res, next) => {
      try {
        const contactIds = req.body?.contactIds;
        if (!Array.isArray(contactIds) || contactIds.length === 0) {
          throw new AppError("A non-empty contactIds array is required", 400);
        }
        if (contactIds.length > 100_000 || contactIds.some((id) => typeof id !== "string")) {
          throw new AppError("Invalid campaign audience", 400);
        }
        const count = await replaceCampaignAudience(
          req.params.id,
          getOrganizationId(req),
          contactIds
        );
        res.json({ success: true, audienceCount: count });
      } catch (error) {
        if (
          error instanceof AudienceRequiredError ||
          error instanceof ABConfigurationError ||
          error instanceof UnsupportedCampaignChannelError
        ) {
          return res.status(400).json({ error: error.message });
        }
        next(error);
      }
    }
  );

  /**
   * POST /api/email/campaigns/:id/dispatch
   * Trigger server-side background dispatch for an entire campaign
   */
  router.post(
    "/api/email/campaigns/:id/dispatch",
    requireRole("EDITOR", "ADMIN", "OWNER"),
    async (req, res, next) => {
      try {
        const campaignId = req.params.id;
        const organizationId = getOrganizationId(req);
        const campaign = await prisma.campaign.findFirst({
          where: { id: campaignId, organizationId },
          select: { id: true, updatedAt: true },
        });
        if (!campaign) throw new AppError("Campaign not found", 404);

        const suppliedKey = req.headers["idempotency-key"];
        if (Array.isArray(suppliedKey)) throw new AppError("Invalid Idempotency-Key", 400);
        const idempotencyKey =
          suppliedKey?.trim() ||
          `manual:${campaign.id}:${campaign.updatedAt.toISOString()}`;
        if (idempotencyKey.length > 200) throw new AppError("Idempotency-Key is too long", 400);

        const queued = await queueCampaignDispatch({
          campaignId,
          organizationId,
          idempotencyKey,
          requestedById: getAuthenticatedUser(req).id,
        });
        res.status(202).json({ success: true, ...queued });
      } catch (error) {
        if (
          error instanceof AudienceRequiredError ||
          error instanceof ABConfigurationError ||
          error instanceof UnsupportedCampaignChannelError
        ) {
          return res.status(400).json({ error: error.message });
        }
        next(error);
      }
    }
  );

  router.get("/api/email/dispatches/:id", async (req, res, next) => {
    try {
      const dispatch = await prisma.campaignDispatch.findFirst({
        where: { id: req.params.id, organizationId: getOrganizationId(req) },
        select: {
          id: true,
          campaignId: true,
          phase: true,
          winnerVariationId: true,
          status: true,
          totalRecipients: true,
          acceptedCount: true,
          deliveredCount: true,
          failedCount: true,
          suppressedCount: true,
          lastError: true,
          createdAt: true,
          completedAt: true,
        },
      });
      if (!dispatch) throw new AppError("Dispatch not found", 404);
      res.json(dispatch);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
