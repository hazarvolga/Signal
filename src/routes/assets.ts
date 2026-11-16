import { Router } from "express";
import { prisma } from "../services/prisma";
import { AppError } from "../middleware/errorHandler";
import type { RouteContext } from "./context";
import { requireAuth, requireRole } from "../middleware/auth";
import { getOrganizationId } from "../lib/authContext";
import { AssetCreateSchema, EngagementEventSchema, validateBody } from "../lib/schemas";
import { logger } from "../services/logger";
import {
  decodeAndValidateAssetDataUrl,
  deleteAssetObject,
  InvalidAssetBinaryError,
  signedAssetUrl,
  storeAssetObject,
} from "../services/objectStorage";
import {
  decodeTenantCursor,
  encodeTenantCursor,
  InvalidPaginationCursorError,
} from "../lib/paginationCursor";

export default function registerAssetRoutes(ctx: RouteContext): Router {
  const router = Router();
  router.use("/api/engagement", requireAuth);
  router.use("/api/campaigns", requireAuth);
  router.use("/api/assets", requireAuth);

  router.post(
    "/api/engagement",
    requireRole("EDITOR", "ADMIN", "OWNER"),
    validateBody(EngagementEventSchema),
    async (req, res, next) => {
      try {
        const { campaignId, contactId, type, value, sectionId, metadata } = req.body;
        const orgId = getOrganizationId(req);
        const campaign = await prisma.campaign.findFirst({
          where: { id: campaignId, organizationId: orgId },
          select: { id: true },
        });
        const contact = contactId
          ? await prisma.contact.findFirst({
              where: { id: contactId, organizationId: orgId },
              select: { id: true },
            })
          : null;
        if (!campaign || (contactId && !contact)) throw new AppError("Resource not found", 404);

        const event = await prisma.engagementEvent.create({
          data: {
            campaignId,
            contactId,
            type,
            value,
            sectionId,
            metadata: metadata ? JSON.stringify(metadata) : null,
          },
        });
        res.json(event);
      } catch (err) {
        next(err);
      }
    }
  );

  router.get("/api/campaigns/:id/engagement", async (req, res, next) => {
    try {
      const { id } = req.params;
      const campaign = await prisma.campaign.findFirst({
        where: { id, organizationId: getOrganizationId(req) },
        select: { id: true },
      });
      if (!campaign) throw new AppError("Campaign not found", 404);

      const events = await prisma.engagementEvent.findMany({
        where: { campaignId: id },
        orderBy: { timestamp: "asc" },
      });

      const totalReadTime = events
        .filter((e) => e.type === "read_time")
        .reduce((acc, e) => acc + e.value, 0);

      const avgScrollDepth = events
        .filter((e) => e.type === "scroll")
        .reduce((acc, e, _, arr) => acc + e.value / arr.length, 0);

      const sectionEngagement = events.reduce((acc: any, e) => {
        if (e.sectionId) {
          if (!acc[e.sectionId]) acc[e.sectionId] = { readTime: 0, views: 0 };
          if (e.type === "read_time") acc[e.sectionId].readTime += e.value;
          if (e.type === "scroll") acc[e.sectionId].views += 1;
        }
        return acc;
      }, {});

      res.json({
        events,
        summary: {
          totalReadTime,
          avgScrollDepth,
          sectionEngagement,
        },
      });
    } catch (err) {
      next(err);
    }
  });

  router.get("/api/assets", async (req, res, next) => {
    try {
      const organizationId = getOrganizationId(req);
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
        cursor = rawCursor
          ? decodeTenantCursor(rawCursor, organizationId, cursorSecret)
          : undefined;
      } catch (error) {
        if (error instanceof InvalidPaginationCursorError) {
          return res.status(400).json({ error: error.message });
        }
        throw error;
      }
      const assets = await prisma.asset.findMany({
        where: {
          organizationId,
          ...(cursor
            ? {
                OR: [
                  { createdAt: { lt: new Date(cursor.createdAt) } },
                  { createdAt: new Date(cursor.createdAt), id: { lt: cursor.id } },
                ],
              }
            : {}),
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: limit + 1,
      });
      const hasMore = assets.length > limit;
      const page = hasMore ? assets.slice(0, limit) : assets;
      const response = await Promise.all(
        page.map(async (asset) => ({
          ...asset,
          url:
            asset.storageKey && asset.scanStatus === "VALIDATED"
              ? await signedAssetUrl(asset.storageKey)
              : asset.storageKey
                ? null
                : asset.url,
        }))
      );
      const last = page.at(-1);
      const nextCursor =
        hasMore && last
          ? encodeTenantCursor(
              { organizationId, createdAt: last.createdAt.toISOString(), id: last.id },
              cursorSecret
            )
          : null;
      res.json({ data: response, pagination: { limit, hasMore, nextCursor } });
    } catch (err) {
      next(err);
    }
  });

  router.post(
    "/api/assets",
    requireRole("EDITOR", "ADMIN", "OWNER"),
    validateBody(AssetCreateSchema),
    async (req, res, next) => {
      try {
        const { name, url, type, metadata } = req.body;
        const organizationId = getOrganizationId(req);
        const binary = decodeAndValidateAssetDataUrl(url);
        const expectedType = binary.mimeType === "application/pdf" ? "DOCUMENT" : "IMAGE";
        if (type !== expectedType) {
          throw new InvalidAssetBinaryError("Asset type does not match its MIME type");
        }
        const configuredQuota = Number.parseInt(
          process.env.ASSET_TENANT_QUOTA_BYTES || "52428800",
          10
        );
        const quotaBytes = Number.isFinite(configuredQuota)
          ? Math.min(1024 * 1024 * 1024, Math.max(1024 * 1024, configuredQuota))
          : 50 * 1024 * 1024;
        const storageKey = await storeAssetObject(organizationId, binary);
        let asset;
        try {
          asset = await prisma.$transaction(async (tx) => {
            await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${organizationId}))`;
            const usage = await tx.asset.aggregate({
              where: { organizationId },
              _sum: { size: true },
            });
            if ((usage._sum.size || 0) + binary.sizeBytes > quotaBytes) {
              throw new AppError("Organization asset quota exceeded", 413);
            }
            return tx.asset.create({
              data: {
                name,
                url: `storage://${storageKey}`,
                type,
                storageKey,
                mimeType: binary.mimeType,
                size: binary.sizeBytes,
                checksum: binary.checksum,
                scanStatus: binary.scanStatus,
                metadata: metadata ? JSON.stringify(metadata) : null,
                organizationId,
              },
            });
          });
        } catch (error) {
          await deleteAssetObject(storageKey).catch((cleanupError) => {
            logger.error({ err: cleanupError, storageKey }, "Asset rollback cleanup failed");
          });
          throw error;
        }
        res.json({
          ...asset,
          url: binary.scanStatus === "VALIDATED" ? await signedAssetUrl(storageKey) : null,
        });
      } catch (err) {
        if (err instanceof InvalidAssetBinaryError) {
          return res.status(400).json({ error: err.message });
        }
        next(err);
      }
    }
  );

  router.delete(
    "/api/assets/:id",
    requireRole("EDITOR", "ADMIN", "OWNER"),
    async (req, res, next) => {
      try {
        const { id } = req.params;
        const existing = await prisma.asset.findFirst({
          where: { id, organizationId: getOrganizationId(req) },
          select: { storageKey: true },
        });
        const result = await prisma.asset.deleteMany({
          where: { id, organizationId: getOrganizationId(req) },
        });
        if (result.count === 0) throw new AppError("Asset not found", 404);
        if (existing?.storageKey) {
          await deleteAssetObject(existing.storageKey).catch((cleanupError) => {
            logger.error(
              { err: cleanupError, storageKey: existing.storageKey },
              "Deleted asset object cleanup failed"
            );
          });
        }
        res.json({ success: true });
      } catch (err) {
        next(err);
      }
    }
  );

  return router;
}
