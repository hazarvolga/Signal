import { Router } from "express";
import { prisma } from "../services/prisma";
import { AppError } from "../middleware/errorHandler";
import { requireAuth, requireRole } from "../middleware/auth";
import type { RouteContext } from "./context";
import { getOrganizationId } from "../lib/authContext";
import { enqueueDataRequest } from "../services/compliance/dataRequestQueue";
import { readEncryptedExport } from "../services/compliance/exportCrypto";

export default function registerComplianceRoutes(ctx: RouteContext): Router {
  const router = Router();

  /**
   * RFC 8058 Single-Click List-Unsubscribe endpoint
   */
  router.get("/api/unsubscribe/:token", async (req, res, next) => {
    try {
      const { token } = req.params;
      const contact = await prisma.contact.findUnique({
        where: { preferenceToken: token },
        select: { emailConsent: true },
      });

      if (!contact) {
        return res.status(404).json({ error: "Invalid unsubscribe token" });
      }

      res.send(`
        <html>
          <body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background: #F5F2EC; margin: 0;">
            <div style="text-align: center; padding: 40px; background: white; border: 1px solid #1A1814; max-width: 400px;">
              <h2 style="font-family: serif; margin-top: 0;">Email Preferences</h2>
              <p style="font-size: 14px; color: #666;">${contact.emailConsent ? "Use the unsubscribe action in your email client to stop marketing messages." : "This address is already unsubscribed."}</p>
            </div>
          </body>
        </html>
      `);
    } catch (err) {
      next(err);
    }
  });

  router.post("/api/unsubscribe/:token", async (req, res, next) => {
    try {
      if (req.body?.["List-Unsubscribe"] !== "One-Click") {
        return res.status(400).json({ error: "Invalid one-click unsubscribe request" });
      }

      const contact = await prisma.contact.findUnique({
        where: { preferenceToken: req.params.token },
      });
      if (!contact) return res.status(404).json({ error: "Invalid unsubscribe token" });

      await prisma.$transaction(async (tx) => {
        await tx.contact.update({
          where: { id: contact.id },
          data: { emailConsent: false, status: "UNSUBSCRIBED" },
        });
        await tx.suppression.upsert({
          where: {
            organizationId_email: {
              organizationId: contact.organizationId,
              email: contact.email.toLowerCase(),
            },
          },
          create: {
            organizationId: contact.organizationId,
            contactId: contact.id,
            email: contact.email.toLowerCase(),
            reason: "UNSUBSCRIBE",
            source: "LIST_UNSUBSCRIBE_RFC8058",
          },
          update: {
            contactId: contact.id,
            active: true,
            reason: "UNSUBSCRIBE",
            source: "LIST_UNSUBSCRIBE_RFC8058",
          },
        });

        if (contact.emailConsent || contact.status !== "UNSUBSCRIBED") {
          await tx.consentLog.create({
            data: {
              contactId: contact.id,
              action: "UNSUBSCRIBE",
              source: "LIST_UNSUBSCRIBE_RFC8058",
              ipAddress: req.ip,
              userAgent: req.headers["user-agent"],
              organizationId: contact.organizationId,
            },
          });
        }
      });

      res.status(200).json({ success: true });
    } catch (err) {
      next(err);
    }
  });

  router.get("/api/preferences/:token", async (req, res, next) => {
    try {
      const { token } = req.params;
      const contact = await prisma.contact.findUnique({
        where: { preferenceToken: token },
        include: {
          listMemberships: { include: { list: true } },
          organization: true,
        },
      });

      if (!contact) throw new AppError("Invalid preference link", 404);

      const allLists = await prisma.list.findMany({
        where: { organizationId: contact.organizationId },
      });

      res.json({
        contact: {
          id: contact.id,
          email: contact.email,
          firstName: contact.firstName,
          lastName: contact.lastName,
          emailConsent: contact.emailConsent,
          smsConsent: contact.smsConsent,
          whatsappConsent: contact.whatsappConsent,
        },
        memberships: contact.listMemberships.map((m) => m.listId),
        availableLists: allLists,
        organization: {
          name: contact.organization.name,
          logoUrl: contact.organization.logoUrl,
        },
      });
    } catch (err) {
      next(err);
    }
  });

  router.post("/api/preferences/:token", async (req, res, next) => {
    try {
      const { token } = req.params;
      const { listIds, emailConsent, smsConsent, whatsappConsent } = req.body;

      const contact = await prisma.contact.findUnique({
        where: { preferenceToken: token },
      });

      if (!contact) throw new AppError("Invalid preference link", 404);
      const publicConsentVersion = process.env.CONSENT_TEXT_VERSION?.trim();
      if ((emailConsent || smsConsent || whatsappConsent) && !publicConsentVersion) {
        throw new AppError("Public consent text is not configured", 503);
      }

      const contactId = contact.id;
      const requestedListIds = Array.isArray(listIds) ? listIds : [];
      const validLists = requestedListIds.length
        ? await prisma.list.findMany({
            where: { id: { in: requestedListIds }, organizationId: contact.organizationId },
            select: { id: true },
          })
        : [];
      if (validLists.length !== requestedListIds.length) {
        return res.status(400).json({ error: "One or more lists are invalid" });
      }

      await prisma.$transaction(async (tx) => {
        await tx.contact.update({
          where: { id: contactId },
          data: {
            emailConsent: !!emailConsent,
            smsConsent: !!smsConsent,
            whatsappConsent: !!whatsappConsent,
          },
        });
        if (emailConsent) {
          await tx.suppression.updateMany({
            where: {
              organizationId: contact.organizationId,
              email: contact.email.toLowerCase(),
              reason: "UNSUBSCRIBE",
            },
            data: { active: false },
          });
        } else {
          await tx.suppression.upsert({
            where: {
              organizationId_email: {
                organizationId: contact.organizationId,
                email: contact.email.toLowerCase(),
              },
            },
            create: {
              organizationId: contact.organizationId,
              contactId,
              email: contact.email.toLowerCase(),
              reason: "UNSUBSCRIBE",
              source: "PUBLIC_PREFERENCE_CENTER",
            },
            update: {
              contactId,
              active: true,
              reason: "UNSUBSCRIBE",
              source: "PUBLIC_PREFERENCE_CENTER",
            },
          });
        }
        await tx.listMembership.deleteMany({ where: { contactId } });
        if (validLists.length > 0) {
          await tx.listMembership.createMany({
            data: validLists.map(({ id: listId }) => ({ contactId, listId })),
          });
        }
        await tx.consentLog.create({
          data: {
            contactId,
            action:
              Boolean(emailConsent) === contact.emailConsent
                ? "PREFERENCE_UPDATE"
                : emailConsent
                  ? "SUBSCRIBE"
                  : "UNSUBSCRIBE",
            source: "PUBLIC_PREFERENCE_CENTER",
            ipAddress: req.ip,
            userAgent: req.headers["user-agent"],
            consentTextVersion: publicConsentVersion,
            purpose: "DIRECT_MARKETING",
            lawfulBasis: "EXPLICIT_CONSENT",
            organizationId: contact.organizationId,
          },
        });
      });

      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  });

  router.get("/api/contacts/:id/preferences", requireAuth, async (req, res, next) => {
    try {
      const contact = await prisma.contact.findFirst({
        where: { id: req.params.id, organizationId: getOrganizationId(req) },
        include: { listMemberships: { include: { list: true } } },
      });
      const allLists = await prisma.list.findMany({
        where: { organizationId: contact?.organizationId },
      });
      res.json({
        contact,
        memberships: contact?.listMemberships.map((m) => m.listId),
        availableLists: allLists,
      });
    } catch (err) {
      next(err);
    }
  });

  router.get("/api/contacts/:id/notifications", requireAuth, async (req, res, next) => {
    try {
      const notifications = await prisma.notification.findMany({
        where: {
          contactId: req.params.id,
          contact: { organizationId: getOrganizationId(req) },
        },
        orderBy: { createdAt: "desc" },
      });
      res.json(notifications);
    } catch (err) {
      next(err);
    }
  });

  router.post(
    "/api/contacts/:id/preferences",
    requireAuth,
    requireRole("EDITOR", "ADMIN", "OWNER"),
    async (req, res, next) => {
      try {
        const {
          listIds,
          emailConsent,
          smsConsent,
          whatsappConsent,
          source,
          consentTextVersion,
          consentPurpose,
          lawfulBasis,
        } = req.body;
        const contactId = req.params.id;
        const orgId = getOrganizationId(req);
        const contact = await prisma.contact.findFirst({
          where: { id: contactId, organizationId: orgId },
          select: { id: true, email: true, emailConsent: true },
        });
        if (!contact) throw new AppError("Contact not found", 404);
        if (
          (emailConsent || smsConsent || whatsappConsent) &&
          ![consentTextVersion, consentPurpose, lawfulBasis].every(
            (value) => typeof value === "string" && value.trim().length > 0
          )
        ) {
          throw new AppError(
            "Consent text version, purpose and lawful basis are required when enabling consent",
            400
          );
        }
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

        await prisma.$transaction(async (tx) => {
          await tx.contact.update({
            where: { id: contactId },
            data: {
              emailConsent: !!emailConsent,
              smsConsent: !!smsConsent,
              whatsappConsent: !!whatsappConsent,
            },
          });
          if (emailConsent) {
            await tx.suppression.updateMany({
              where: {
                organizationId: orgId,
                email: contact.email.toLowerCase(),
                reason: "UNSUBSCRIBE",
              },
              data: { active: false },
            });
          } else {
            await tx.suppression.upsert({
              where: {
                organizationId_email: {
                  organizationId: orgId,
                  email: contact.email.toLowerCase(),
                },
              },
              create: {
                organizationId: orgId,
                contactId,
                email: contact.email.toLowerCase(),
                reason: "UNSUBSCRIBE",
                source: source || "ADMIN_PREFERENCE_CENTER",
              },
              update: {
                contactId,
                active: true,
                reason: "UNSUBSCRIBE",
                source: source || "ADMIN_PREFERENCE_CENTER",
              },
            });
          }
          await tx.listMembership.deleteMany({ where: { contactId } });
          if (validLists.length > 0) {
            await tx.listMembership.createMany({
              data: validLists.map(({ id: listId }) => ({ contactId, listId })),
            });
          }
          await tx.consentLog.create({
            data: {
              contactId,
              action:
                Boolean(emailConsent) === contact.emailConsent
                  ? "PREFERENCE_UPDATE"
                  : emailConsent
                    ? "SUBSCRIBE"
                    : "UNSUBSCRIBE",
              source: source || "ADMIN_PREFERENCE_CENTER",
              ipAddress: req.ip,
              userAgent: req.headers["user-agent"],
              consentTextVersion,
              purpose: consentPurpose,
              lawfulBasis,
              organizationId: orgId,
            },
          });
        });

        res.json({ success: true });
      } catch (err) {
        next(err);
      }
    }
  );

  // Protected Compliance & Data Protection Routes
  router.get(
    "/api/compliance/consent-logs",
    requireAuth,
    requireRole("ADMIN", "OWNER"),
    async (req, res, next) => {
      try {
        const orgId = getOrganizationId(req);
        const logs = await prisma.consentLog.findMany({
          where: { organizationId: orgId },
          include: { contact: true },
          orderBy: { timestamp: "desc" },
        });
        res.json(logs);
      } catch (err) {
        next(err);
      }
    }
  );

  router.get(
    "/api/compliance/data-requests",
    requireAuth,
    requireRole("ADMIN", "OWNER"),
    async (req, res, next) => {
      try {
        const orgId = getOrganizationId(req);
        const requests = await prisma.dataRequest.findMany({
          where: { organizationId: orgId },
          include: { contact: true },
          orderBy: { createdAt: "desc" },
        });
        res.json(requests);
      } catch (err) {
        next(err);
      }
    }
  );

  router.post(
    "/api/compliance/data-requests",
    requireAuth,
    requireRole("ADMIN", "OWNER"),
    async (req, res, next) => {
      try {
        const { contactId, type } = req.body;
        const orgId = getOrganizationId(req);
        if (type !== "EXPORT" && type !== "DELETE") {
          throw new AppError("Data request type must be EXPORT or DELETE", 400);
        }
        const contact = await prisma.contact.findFirst({
          where: { id: contactId, organizationId: orgId },
          select: { id: true },
        });
        if (!contact) throw new AppError("Contact not found", 404);
        const request = await prisma.dataRequest.create({
          data: { contactId, type, organizationId: orgId },
        });
        try {
          await enqueueDataRequest(request.id);
        } catch (error) {
          await prisma.dataRequest.update({
            where: { id: request.id },
            data: {
              status: "FAILED",
              error: error instanceof Error ? error.message : "Unable to enqueue data request",
            },
          });
          throw new AppError("Data request queue is unavailable", 503);
        }
        res.status(202).json(request);
      } catch (err) {
        next(err);
      }
    }
  );

  router.post(
    "/api/compliance/data-requests/:id/retry",
    requireAuth,
    requireRole("ADMIN", "OWNER"),
    async (req, res, next) => {
      try {
        const orgId = getOrganizationId(req);
        const existing = await prisma.dataRequest.findFirst({
          where: { id: req.params.id, organizationId: orgId, status: "FAILED" },
          select: { id: true },
        });
        if (!existing) throw new AppError("Failed data request not found", 404);
        const request = await prisma.dataRequest.update({
          where: { id: existing.id },
          data: { status: "PENDING", error: null },
        });
        await enqueueDataRequest(request.id);
        res.status(202).json(request);
      } catch (err) {
        next(err);
      }
    }
  );

  router.get(
    "/api/compliance/data-requests/:id/download",
    requireAuth,
    requireRole("ADMIN", "OWNER"),
    async (req, res, next) => {
      try {
        const request = await prisma.dataRequest.findFirst({
          where: {
            id: req.params.id,
            organizationId: getOrganizationId(req),
            type: "EXPORT",
            status: "COMPLETED",
          },
        });
        if (!request?.expiresAt || request.expiresAt <= new Date()) {
          throw new AppError("Export not found or expired", 404);
        }
        const payload = await readEncryptedExport(request.id);
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="signal-export-${request.id}.json"`
        );
        res.setHeader("Cache-Control", "private, no-store");
        res.send(payload);
      } catch (err) {
        next(err);
      }
    }
  );

  return router;
}
