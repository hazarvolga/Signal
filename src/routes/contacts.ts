import { Router } from "express";
import multer from "multer";
import { prisma } from "../services/prisma";
import { AppError } from "../middleware/errorHandler";
import { requireAuth, requireRole } from "../middleware/auth";
import {
  validateBody,
  ContactCreateSchema,
  ContactUpdateSchema,
  SegmentCreateSchema,
  SegmentUpdateSchema,
} from "../lib/schemas";
import type { RouteContext } from "./context";
import { refreshSegment } from "../lib/segmentRefresh";
import { getOrganizationId } from "../lib/authContext";
import crypto from "crypto";
import {
  decodeContactCursor,
  encodeContactCursor,
  InvalidPaginationCursorError,
} from "../lib/paginationCursor";
import { contactPageIds, restorePageOrder } from "../services/keysetPagination";
import { logger } from "../services/logger";

const upload = multer({ storage: multer.memoryStorage() });

export default function registerContactRoutes(ctx: RouteContext): Router {
  const router = Router();

  router.use("/api/contacts", requireAuth);
  router.use("/api/segments", requireAuth);
  router.use("/api/custom-fields", requireAuth);
  router.use("/api/tags", requireAuth);

  router.get("/api/tags", async (req, res, next) => {
    try {
      const orgId = getOrganizationId(req);
      const tags = await prisma.tag.findMany({
        where: { organizationId: orgId },
        orderBy: { name: "asc" },
      });
      res.json(tags);
    } catch (err) {
      next(err);
    }
  });

  router.get("/api/contacts", async (req, res, next) => {
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
      let cursor: ReturnType<typeof decodeContactCursor> | undefined;
      try {
        cursor = rawCursor ? decodeContactCursor(rawCursor, orgId, cursorSecret) : undefined;
      } catch (error) {
        if (error instanceof InvalidPaginationCursorError) {
          return res.status(400).json({ error: error.message });
        }
        throw error;
      }
      const pageIds = await contactPageIds(prisma, orgId, limit + 1, cursor);
      const contactRows = await prisma.contact.findMany({
        where: {
          organizationId: orgId,
          id: { in: pageIds },
        },
        include: { tags: true },
      });
      const contacts = restorePageOrder(pageIds, contactRows);
      const hasMore = contacts.length > limit;
      const data = hasMore ? contacts.slice(0, limit) : contacts;
      const last = data.at(-1);
      const nextCursor =
        hasMore && last
          ? encodeContactCursor(
              {
                organizationId: orgId,
                createdAt: last.createdAt.toISOString(),
                id: last.id,
              },
              cursorSecret
            )
          : null;
      res.json({ data, pagination: { limit, hasMore, nextCursor } });
    } catch (err) {
      next(err);
    }
  });

  // GAP-002: Validate contact creation body with Zod
  router.post(
    "/api/contacts",
    requireRole("EDITOR", "ADMIN", "OWNER"),
    validateBody(ContactCreateSchema),
    async (req, res, next) => {
      try {
        const orgId = getOrganizationId(req);

        const {
          email,
          firstName,
          lastName,
          tags,
          listIds,
          customFields,
          emailConsent,
          smsConsent,
          whatsappConsent,
          consentTextVersion,
          consentPurpose,
          lawfulBasis,
        } = req.body;

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          return res.status(400).json({ error: "Invalid email format" });
        }

        if (
          (emailConsent || smsConsent || whatsappConsent) &&
          (!consentTextVersion || !consentPurpose || !lawfulBasis)
        ) {
          return res.status(400).json({
            error:
              "Consent text version, purpose and lawful basis are required when enabling consent",
          });
        }

        try {
          const requestedListIds = Array.isArray(listIds) ? listIds : [];
          const validLists = requestedListIds.length
            ? await prisma.list.findMany({
                where: { id: { in: requestedListIds }, organizationId: orgId },
                select: { id: true },
              })
            : [];
          if (validLists.length !== requestedListIds.length) {
            return res.status(400).json({ error: "One or more lists are invalid" });
          }
          const data: any = {
            email,
            firstName,
            lastName,
            organizationId: orgId,
            status: emailConsent ? "SUBSCRIBED" : "UNSUBSCRIBED",
            customFields: JSON.stringify(customFields || {}),
            emailConsent: Boolean(emailConsent),
            smsConsent: smsConsent !== undefined ? Boolean(smsConsent) : false,
            whatsappConsent: whatsappConsent !== undefined ? Boolean(whatsappConsent) : false,
            preferenceToken: crypto.randomBytes(32).toString("base64url"),
          };
          if (tags.length > 0) {
            data.tags = {
              connectOrCreate: tags.map((tag: string) => ({
                where: {
                  name_organizationId: {
                    name: tag.trim(),
                    organizationId: orgId,
                  },
                },
                create: { name: tag.trim(), organizationId: orgId },
              })),
            };
          }
          if (validLists.length > 0) {
            data.listMemberships = {
              create: validLists.map(({ id: listId }) => ({ listId })),
            };
          }
          const contact = await prisma.$transaction(async (tx) => {
            const created = await tx.contact.create({ data });
            await tx.consentLog.create({
              data: {
                contactId: created.id,
                action: created.emailConsent ? "SUBSCRIBE" : "UNSUBSCRIBE",
                source: "ADMIN_API",
                ipAddress: req.ip,
                userAgent: req.headers["user-agent"],
                consentTextVersion,
                purpose: consentPurpose,
                lawfulBasis,
                organizationId: orgId,
              },
            });
            return created;
          });

          if (contact && ctx.createEventAndBroadcast) {
            try {
              await ctx.createEventAndBroadcast({
                type: "CONTACT_CREATED",
                contactId: contact.id,
                metadata: { email: contact.email, source: "ADMIN_API" },
              });
              if (contact.emailConsent) {
                await ctx.createEventAndBroadcast({
                  type: "SIGNUP",
                  contactId: contact.id,
                  metadata: { email: contact.email, source: "ADMIN_API" },
                });
              }
            } catch (eventErr) {
              logger.warn(
                { err: eventErr, contactId: contact.id },
                "Failed to broadcast contact creation event"
              );
            }
          }

          res.json(contact);
        } catch (e) {
          if ((e as { code?: string }).code === "P2002") {
            return res.status(409).json({ error: "Contact already exists" });
          }
          throw e;
        }
      } catch (err) {
        next(err);
      }
    }
  );

  router.post(
    "/api/contacts/bulk",
    requireRole("EDITOR", "ADMIN", "OWNER"),
    upload.single("file"),
    async (req, res, next) => {
      try {
        const orgId = getOrganizationId(req);

        const { contacts, triggerAutomations } = req.body;
        if (!Array.isArray(contacts)) {
          return res.status(400).json({ error: "Invalid payload" });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        let imported = 0;
        let failed = 0;
        const shouldTrigger = Boolean(triggerAutomations);

        for (const c of contacts) {
          if (!c.email || !emailRegex.test(c.email)) {
            failed++;
            continue;
          }
          try {
            const upserted = await prisma.contact.upsert({
              where: { email_organizationId: { email: c.email, organizationId: orgId } },
              update: {
                firstName: c.firstName || undefined,
                lastName: c.lastName || undefined,
                tags: c.tags
                  ? {
                      connectOrCreate: c.tags
                        .split(",")
                        .map((t: string) => ({
                          where: {
                            name_organizationId: {
                              name: t.trim(),
                              organizationId: orgId,
                            },
                          },
                          create: { name: t.trim(), organizationId: orgId },
                        }))
                        .filter((t: any) => t.where.name_organizationId.name),
                    }
                  : undefined,
              },
              create: {
                email: c.email,
                firstName: c.firstName || "",
                lastName: c.lastName || "",
                organizationId: orgId,
                status: "UNSUBSCRIBED",
                emailConsent: false,
                smsConsent: false,
                whatsappConsent: false,
                preferenceToken: crypto.randomBytes(32).toString("base64url"),
                tags: c.tags
                  ? {
                      connectOrCreate: c.tags
                        .split(",")
                        .map((t: string) => ({
                          where: {
                            name_organizationId: {
                              name: t.trim(),
                              organizationId: orgId,
                            },
                          },
                          create: { name: t.trim(), organizationId: orgId },
                        }))
                        .filter((t: any) => t.where.name_organizationId.name),
                    }
                  : undefined,
              },
            });
            if (shouldTrigger && ctx.createEventAndBroadcast) {
              void ctx
                .createEventAndBroadcast({
                  type: "CONTACT_CREATED",
                  contactId: upserted.id,
                  metadata: { email: upserted.email, source: "BULK_IMPORT" },
                })
                .catch(() => {});
            }
            imported++;
          } catch (e) {
            failed++;
          }
        }

        res.json({ imported, failed });
      } catch (err) {
        next(err);
      }
    }
  );

  router.get("/api/segments", async (req, res, next) => {
    try {
      const segments = await prisma.segment.findMany({
        where: { organizationId: getOrganizationId(req) },
        orderBy: { createdAt: "desc" },
      });
      res.json(segments);
    } catch (err) {
      next(err);
    }
  });

  // GAP-002: Validate segment creation body with Zod
  router.post(
    "/api/segments",
    requireRole("EDITOR", "ADMIN", "OWNER"),
    validateBody(SegmentCreateSchema),
    async (req, res, next) => {
      try {
        const { name, rules, conditionLogic } = req.body;
        const segment = await prisma.segment.create({
          data: {
            name,
            rules: JSON.stringify({ logic: conditionLogic, rules }),
            organizationId: getOrganizationId(req),
          },
        });

        await refreshSegment(segment.id);

        const updatedSegment = await prisma.segment.findUnique({ where: { id: segment.id } });
        res.json(updatedSegment);
      } catch (err) {
        next(err);
      }
    }
  );

  router.get("/api/segments/:id/contacts", async (req, res, next) => {
    try {
      const segment = await prisma.segment.findFirst({
        where: { id: req.params.id, organizationId: getOrganizationId(req) },
        include: {
          contacts: {
            include: { tags: true },
          },
        },
      });
      if (!segment) throw new AppError("Segment not found", 404);

      res.json(segment.contacts);
    } catch (err) {
      next(err);
    }
  });

  router.get("/api/segments/:id/count", async (req, res, next) => {
    try {
      const segment = await prisma.segment.findFirst({
        where: { id: req.params.id, organizationId: getOrganizationId(req) },
        select: { contactCount: true },
      });
      if (!segment) throw new AppError("Segment not found", 404);

      res.json({ count: segment.contactCount });
    } catch (err) {
      next(err);
    }
  });

  router.delete(
    "/api/segments/:id",
    requireRole("EDITOR", "ADMIN", "OWNER"),
    async (req, res, next) => {
      try {
        const result = await prisma.segment.deleteMany({
          where: { id: req.params.id, organizationId: getOrganizationId(req) },
        });
        if (result.count === 0) throw new AppError("Segment not found", 404);
        res.json({ success: true });
      } catch (err) {
        next(err);
      }
    }
  );

  router.get("/api/custom-fields", async (req, res, next) => {
    try {
      const fields = await prisma.customFieldDefinition.findMany({
        where: { organizationId: getOrganizationId(req) },
        orderBy: { name: "asc" },
      });
      res.json(fields);
    } catch (err) {
      next(err);
    }
  });

  router.post(
    "/api/custom-fields",
    requireRole("EDITOR", "ADMIN", "OWNER"),
    async (req, res, next) => {
      try {
        const { name, key, type } = req.body;
        const field = await prisma.customFieldDefinition.create({
          data: {
            name,
            key,
            type,
            organizationId: getOrganizationId(req),
          },
        });
        res.json(field);
      } catch (err) {
        next(err);
      }
    }
  );

  router.delete(
    "/api/custom-fields/:id",
    requireRole("EDITOR", "ADMIN", "OWNER"),
    async (req, res, next) => {
      try {
        const result = await prisma.customFieldDefinition.deleteMany({
          where: { id: req.params.id, organizationId: getOrganizationId(req) },
        });
        if (result.count === 0) throw new AppError("Custom field not found", 404);
        res.json({ success: true });
      } catch (err) {
        next(err);
      }
    }
  );

  return router;
}
