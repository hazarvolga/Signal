import { Router } from "express";
import { prisma } from "../services/prisma";
import { AppError } from "../middleware/errorHandler";
import { requireAuth, requireRole } from "../middleware/auth";
import { validateBody, CampaignCreateSchema, CampaignUpdateSchema } from "../lib/schemas";
import type { RouteContext } from "./context";
import { getOrganizationId } from "../lib/authContext";
import { evaluateABCampaignWinner } from "../services/email/abTesting";
import { getCampaignDeliveryQueue } from "../services/email/deliveryQueue";
import { processABTestFinalization } from "../workers/emailDeliveryWorker";
import {
  decodeTenantCursor,
  encodeTenantCursor,
  InvalidPaginationCursorError,
} from "../lib/paginationCursor";
import { campaignPageIds, restorePageOrder } from "../services/keysetPagination";
import { refreshSegment } from "../lib/segmentRefresh";

export default function registerCampaignRoutes(ctx: RouteContext): Router {
  const router = Router();

  router.use("/api/campaigns", requireAuth);

  router.get("/api/campaigns", async (req, res, next) => {
    try {
      const orgId = getOrganizationId(req);
      const requestedLimit = Number(req.query.limit ?? 100);
      if (!Number.isInteger(requestedLimit) || requestedLimit < 1) {
        return res.status(400).json({ error: "Invalid pagination limit" });
      }
      const limit = Math.min(requestedLimit, 250);
      const cursorQuery = req.query.cursor;
      if (cursorQuery !== undefined && typeof cursorQuery !== "string") {
        return res.status(400).json({ error: "Invalid pagination cursor" });
      }
      const rawCursor = typeof cursorQuery === "string" ? cursorQuery : undefined;
      const cursorSecret = process.env.PAGINATION_CURSOR_SECRET || process.env.SESSION_SECRET;
      if (!cursorSecret) throw new Error("Pagination cursor secret is unavailable");
      let cursor: ReturnType<typeof decodeTenantCursor> | undefined;
      try {
        cursor = rawCursor ? decodeTenantCursor(rawCursor, orgId, cursorSecret) : undefined;
      } catch (error) {
        if (error instanceof InvalidPaginationCursorError) {
          return res.status(400).json({ error: error.message });
        }
        throw error;
      }
      const pageIds = await campaignPageIds(prisma, orgId, limit + 1, cursor);
      const campaignRows = await prisma.campaign.findMany({
        where: {
          organizationId: orgId,
          id: { in: pageIds },
        },
        include: { template: true },
      });
      const campaigns = restorePageOrder(pageIds, campaignRows);
      const hasMore = campaigns.length > limit;
      const data = hasMore ? campaigns.slice(0, limit) : campaigns;
      const last = data.at(-1);
      const nextCursor =
        hasMore && last
          ? encodeTenantCursor(
              { organizationId: orgId, createdAt: last.createdAt.toISOString(), id: last.id },
              cursorSecret
            )
          : null;
      res.json({ data, pagination: { limit, hasMore, nextCursor } });
    } catch (err) {
      next(err);
    }
  });

  // GAP-002: Validate campaign creation body with Zod
  router.post(
    "/api/campaigns",
    requireRole("EDITOR", "ADMIN", "OWNER"),
    validateBody(CampaignCreateSchema),
    async (req, res, next) => {
      try {
        const orgId = getOrganizationId(req);

        const {
          name,
          subject,
          previewText,
          fromName,
          fromEmail,
          content,
          type,
          scheduledAt,
          timezone,
          perUserTimezone,
          subjectB,
          contentB,
          testPercentage,
          testDuration,
          winnerCriteria,
          channel,
          audienceContactIds,
          segmentIds,
          segmentId,
        } = req.body;

        const requestedSegmentIds = Array.isArray(segmentIds)
          ? (segmentIds as string[])
          : typeof segmentId === "string" && segmentId
            ? [segmentId]
            : [];

        let segmentContactIds: string[] = [];
        if (requestedSegmentIds.length > 0) {
          for (const sId of requestedSegmentIds) {
            try {
              await refreshSegment(sId);
            } catch {}
          }
          const segments = await prisma.segment.findMany({
            where: { id: { in: requestedSegmentIds }, organizationId: orgId },
            include: {
              contacts: {
                where: { status: "SUBSCRIBED", emailConsent: true },
                select: { id: true },
              },
            },
          });
          for (const seg of segments) {
            for (const c of seg.contacts) {
              segmentContactIds.push(c.id);
            }
          }
        }

        const rawAudienceIds = Array.isArray(audienceContactIds) ? audienceContactIds : [];
        const uniqueAudienceContactIds = [
          ...new Set([...rawAudienceIds, ...segmentContactIds]),
        ] as string[];
        if (uniqueAudienceContactIds.length > 0) {
          const tenantContacts = await prisma.contact.count({
            where: {
              id: { in: uniqueAudienceContactIds },
              organizationId: orgId,
            },
          });
          if (tenantContacts !== uniqueAudienceContactIds.length) {
            throw new AppError("One or more audience contacts are invalid", 400);
          }
        }
        const campaign = await prisma.campaign.create({
          data: {
            name,
            subject,
            previewText,
            fromName,
            fromEmail,
            content,
            type,
            channel: channel || "EMAIL",
            subjectB,
            contentB,
            testPercentage: testPercentage ?? undefined,
            testDuration: testDuration ?? undefined,
            winnerCriteria,
            timezone: timezone || "UTC",
            perUserTimezone: perUserTimezone || false,
            scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
            status: scheduledAt ? "SCHEDULED" : "DRAFT",
            organizationId: orgId,
            audiences:
              uniqueAudienceContactIds.length > 0
                ? {
                    create: uniqueAudienceContactIds.map((contactId) => ({ contactId })),
                  }
                : undefined,
            variations:
              type === "AB"
                ? {
                    create: [
                      {
                        subject,
                        content,
                        fromName,
                        fromEmail,
                        previewText,
                        weight: 1,
                      },
                      {
                        subject: subjectB,
                        content: contentB,
                        fromName,
                        fromEmail,
                        previewText,
                        weight: 1,
                      },
                    ],
                  }
                : undefined,
          },
          include: { variations: true },
        });
        res.json(campaign);
      } catch (err) {
        next(err);
      }
    }
  );

  router.patch(
    "/api/campaigns/:id/status",
    requireRole("EDITOR", "ADMIN", "OWNER"),
    async (req, res, next) => {
      try {
        const { status } = req.body;
        if (!["DRAFT", "PAUSED", "ARCHIVED"].includes(status)) {
          throw new AppError(
            "Campaign dispatch states can only be changed by the delivery queue",
            400
          );
        }
        const orgId = getOrganizationId(req);
        const existingCampaign = await prisma.campaign.findFirst({
          where: { id: req.params.id, organizationId: orgId },
          select: { id: true },
        });
        if (!existingCampaign) throw new AppError("Campaign not found", 404);
        const campaign = await prisma.campaign.update({
          where: { id: existingCampaign.id },
          data: {
            status,
          },
        });

        res.json(campaign);
      } catch (err) {
        next(err);
      }
    }
  );

  router.delete(
    "/api/campaigns/:id",
    requireRole("EDITOR", "ADMIN", "OWNER"),
    async (req, res, next) => {
      try {
        const result = await prisma.campaign.deleteMany({
          where: { id: req.params.id, organizationId: getOrganizationId(req) },
        });
        if (result.count === 0) throw new AppError("Campaign not found", 404);
        res.json({ success: true });
      } catch (err) {
        next(err);
      }
    }
  );

  // BUG-004 FIX: Use real event data from the database instead of hardcoded values
  router.get("/api/campaigns/:id/analytics", async (req, res, next) => {
    try {
      const campaign = await prisma.campaign.findFirst({
        where: { id: req.params.id, organizationId: getOrganizationId(req) },
      });
      if (!campaign) throw new AppError("Campaign not found", 404);

      const [deliveryStatuses, eventStatuses, timeSeriesRows, deviceRows] = await Promise.all([
        prisma.recipientDelivery.groupBy({
          by: ["status"],
          where: {
            dispatch: {
              campaignId: campaign.id,
              organizationId: campaign.organizationId,
            },
          },
          _count: { _all: true },
        }),
        prisma.engagementEvent.groupBy({
          by: ["type"],
          where: { campaignId: campaign.id },
          _count: { _all: true },
        }),
        prisma.$queryRaw<Array<{ timestamp: string; opens: bigint; clicks: bigint }>>`
            SELECT
              to_char(date_trunc('hour', "timestamp" AT TIME ZONE 'UTC'), 'HH24:00') AS "timestamp",
              count(*) FILTER (WHERE "type" = 'OPEN') AS "opens",
              count(*) FILTER (WHERE "type" = 'CLICK') AS "clicks"
            FROM "EngagementEvent"
            WHERE "campaignId" = ${campaign.id}
              AND "type" IN ('OPEN', 'CLICK')
            GROUP BY date_trunc('hour', "timestamp" AT TIME ZONE 'UTC')
            ORDER BY date_trunc('hour', "timestamp" AT TIME ZONE 'UTC') ASC
          `,
        prisma.$queryRaw<Array<{ name: string; value: bigint }>>`
            SELECT
              CASE
                WHEN "metadata"::jsonb ->> 'device'
                  IN ('Mobile', 'Desktop', 'Tablet')
                THEN "metadata"::jsonb ->> 'device'
                ELSE 'Other'
              END AS "name",
              count(*) AS "value"
            FROM "EngagementEvent"
            WHERE "campaignId" = ${campaign.id} AND "type" = 'OPEN'
            GROUP BY 1
          `,
      ]);
      const deliveriesByStatus = Object.fromEntries(
        deliveryStatuses.map(({ status, _count }) => [status, _count._all])
      );
      const sent = ["ACCEPTED", "DELIVERED", "BOUNCED", "COMPLAINED"].reduce(
        (total, status) => total + (deliveriesByStatus[status] || 0),
        0
      );
      const eventsByType = Object.fromEntries(
        eventStatuses.map(({ type, _count }) => [type, _count._all])
      );
      const opened = eventsByType.OPEN || 0;
      const clicked = eventsByType.CLICK || 0;
      const unsubscribed = eventsByType.UNSUBSCRIBE || 0;
      const bounced = deliveriesByStatus.BOUNCED || 0;
      const conversions = eventsByType.CONVERSION || 0;
      const timeSeries = timeSeriesRows.map((row) => ({
        timestamp: row.timestamp,
        opens: Number(row.opens),
        clicks: Number(row.clicks),
      }));
      const deviceData = deviceRows.map((row) => ({
        name: row.name,
        value: Number(row.value),
      }));

      res.json({
        campaign,
        stats: { sent, opened, clicked, unsubscribed, bounced, conversions },
        timeSeries,
        deviceData,
      });
    } catch (err) {
      next(err);
    }
  });

  router.get("/api/campaigns/:id/ab-results", async (req, res, next) => {
    try {
      const { id } = req.params;
      const result = await evaluateABCampaignWinner(id, getOrganizationId(req));
      res.json(result);
    } catch (err) {
      if ((err as Error).message === "A/B campaign not found") {
        return next(new AppError("A/B campaign not found", 404));
      }
      next(err);
    }
  });

  router.post(
    "/api/campaigns/:id/pick-winner",
    requireRole("EDITOR", "ADMIN", "OWNER"),
    async (req, res, next) => {
      try {
        const { id } = req.params;
        const organizationId = getOrganizationId(req);
        const testDispatch = await prisma.campaignDispatch.findFirst({
          where: {
            campaignId: id,
            organizationId,
            phase: "TEST",
            status: { in: ["ACCEPTED", "PARTIAL"] },
          },
          select: { id: true },
          orderBy: { createdAt: "desc" },
        });
        if (!testDispatch) {
          return res.status(409).json({
            status: "WAITING",
            error: "A completed A/B test dispatch is required",
          });
        }
        const result = await processABTestFinalization(
          testDispatch.id,
          id,
          organizationId,
          getCampaignDeliveryQueue()
        );
        if (result.status !== "WINNER_QUEUED") {
          return res.status(409).json(result);
        }
        res.json(result);
      } catch (err) {
        if ((err as Error).message === "A/B campaign not found") {
          return next(new AppError("A/B campaign not found", 404));
        }
        if ((err as Error).message === "A/B test window is still open") {
          return res.status(409).json({ status: "WAITING" });
        }
        next(err);
      }
    }
  );

  return router;
}
