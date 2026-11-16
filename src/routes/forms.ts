import { Router } from "express";
import { prisma } from "../services/prisma";
import type { RouteContext } from "./context";
import { requireAuth, requireRole } from "../middleware/auth";
import { getOrganizationId } from "../lib/authContext";
import { validateBody } from "../lib/schemas";
import { z } from "zod";
import crypto from "node:crypto";
import { redisService } from "../services/redisService";
import { calculateConversionRate } from "../lib/formMetrics";
import { serverEmailEngine } from "../services/emailServer";
import { logger } from "../services/logger";

const FormElementSchema = z
  .object({
    id: z.string().trim().min(1).max(64),
    type: z.enum(["text", "input", "button", "image", "spacer", "embedded_form"]),
    content: z.string().max(5_000).optional(),
    placeholder: z.string().max(500).optional(),
    style: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
  })
  .strict();

const FormCreateSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    type: z.enum(["popup", "landing_page"]),
    url: z.string().trim().max(2_048).optional(),
    elements: z.array(FormElementSchema).min(1).max(100),
    welcomeCampaignId: z.string().trim().max(128).optional().nullable(),
    leadMagnetUrl: z.string().trim().max(2_048).optional().nullable(),
    redirectUrl: z.string().trim().max(2_048).optional().nullable(),
  })
  .strict();

const FormSubmissionSchema = z
  .object({
    values: z.record(z.string().trim().min(1).max(64), z.string().trim().max(2_000)),
    website: z.string().max(500).optional().default(""),
    _signal_hp: z.string().max(500).optional().default(""),
  })
  .strict()
  .superRefine((payload, context) => {
    if (Object.keys(payload.values).length > 50) {
      context.addIssue({ code: "custom", path: ["values"], message: "Too many form fields." });
    }
  });

function formatForm(
  form: { id: string; name: string; config: string; createdAt: Date },
  metrics?: { views: number; submissions: number }
) {
  let config: Record<string, any> = {};
  try {
    config = JSON.parse(form.config || "{}");
  } catch {
    config = {};
  }
  const views = metrics?.views ?? config.views ?? 0;
  const submissions = metrics?.submissions ?? config.submissions ?? 0;
  const rawUrl = config.url;
  let url = `/f/${form.id}`;
  if (rawUrl && rawUrl.startsWith("/")) {
    url = rawUrl;
  } else if (config.slug) {
    url = `/f/${config.slug}`;
  }

  return {
    id: form.id,
    name: form.name,
    type: config.type || "landing_page",
    status: config.status || "active",
    views,
    submissions,
    conversionRate: metrics
      ? calculateConversionRate(views, submissions)
      : config.conversionRate || 0,
    createdAt: form.createdAt.toISOString(),
    url,
    elements: Array.isArray(config.elements) ? config.elements : [],
    welcomeCampaignId: config.welcomeCampaignId || null,
    leadMagnetUrl: config.leadMagnetUrl || null,
    redirectUrl: config.redirectUrl || null,
  };
}

async function findPublicForm(idOrSlug: string) {
  let form = await prisma.form.findUnique({ where: { id: idOrSlug } });
  if (form) return form;

  const allForms = await prisma.form.findMany();
  return (
    allForms.find((f) => {
      try {
        const cfg = JSON.parse(f.config || "{}");
        return (
          cfg.slug === idOrSlug ||
          cfg.url?.endsWith(`/${idOrSlug}`) ||
          f.name.toLowerCase().includes(idOrSlug.toLowerCase())
        );
      } catch {
        return false;
      }
    }) || null
  );
}

export default function registerFormRoutes(ctx: RouteContext): Router {
  const router = Router();

  // Public, read-only delivery endpoint. Only active forms are discoverable.
  router.get("/api/public/forms/:id", async (req, res, next) => {
    try {
      const id = String(req.params.id || "").trim();
      if (!id || id.length > 128) {
        res.status(404).json({ error: "Form not found." });
        return;
      }

      const form = await findPublicForm(id);
      if (!form) {
        res.status(404).json({ error: "Form not found." });
        return;
      }

      const baseForm = formatForm(form);
      if (baseForm.status !== "active") {
        res.status(404).json({ error: "Form not found." });
        return;
      }

      const suppliedViewId = String(req.headers["x-form-view-id"] || "").trim();
      const fallbackViewId = `${req.ip || req.socket.remoteAddress || "unknown"}:${req.headers["user-agent"] || "unknown"}:${Math.floor(Date.now() / 1_800_000)}`;
      const viewId = /^[a-zA-Z0-9_-]{16,128}$/.test(suppliedViewId)
        ? suppliedViewId
        : fallbackViewId;
      const viewHash = crypto.createHash("sha256").update(viewId).digest("hex");
      const viewLimit = await redisService.rateLimit(`form-view:${form.id}:${viewHash}`, 1, 1_800);
      const metrics = viewLimit.allowed
        ? await prisma.formMetric.upsert({
            where: { formId: form.id },
            create: { formId: form.id, organizationId: form.organizationId, views: 1 },
            update: { views: { increment: 1 } },
            select: { views: true, submissions: true },
          })
        : await prisma.formMetric.upsert({
            where: { formId: form.id },
            create: { formId: form.id, organizationId: form.organizationId },
            update: {},
            select: { views: true, submissions: true },
          });
      const formatted = formatForm(form, metrics);

      res.json(formatted);
    } catch (err) {
      next(err);
    }
  });

  router.post(
    "/api/public/forms/:id/submissions",
    validateBody(FormSubmissionSchema),
    async (req, res, next) => {
      try {
        const id = String(req.params.id || "").trim();
        if (!id || id.length > 128) {
          res.status(404).json({ error: "Form not found." });
          return;
        }

        const form = await findPublicForm(id);
        if (!form) {
          res.status(404).json({ error: "Form not found." });
          return;
        }

        const formatted = formatForm(form);
        if (formatted.status !== "active") {
          res.status(404).json({ error: "Form not found." });
          return;
        }

        if (req.body.website || req.body._signal_hp) {
          logger.warn(
            { formId: form.id, ip: req.ip },
            "Honeypot triggered, silently dropping bot submission"
          );
          res.status(204).send();
          return;
        }

        const remoteAddress = req.ip || req.socket.remoteAddress || "unknown";
        const addressHash = crypto.createHash("sha256").update(remoteAddress).digest("hex");
        const limit = await redisService.rateLimit(
          `ratelimit:form-submission:${form.id}:${addressHash}`,
          10,
          60
        );
        res.setHeader("X-RateLimit-Remaining", limit.remaining);
        res.setHeader("X-RateLimit-Reset", limit.reset);
        if (!limit.allowed) {
          res.status(429).json({ error: "Too many submissions. Please try again later." });
          return;
        }

        const allowedInputIds = new Set(
          formatted.elements
            .filter((element: { type?: string }) => element.type === "input")
            .map((element: { id?: string }) => element.id)
            .filter((elementId: unknown): elementId is string => typeof elementId === "string")
        );
        const values: Record<string, string> = {};
        for (const [fieldId, value] of Object.entries(req.body.values as Record<string, string>)) {
          if (allowedInputIds.has(fieldId)) values[fieldId] = value;
        }
        if (Object.keys(values).length === 0) {
          res.status(400).json({ error: "No valid form fields were submitted." });
          return;
        }

        const [submission] = await prisma.$transaction([
          prisma.formSubmission.create({
            data: {
              formId: form.id,
              organizationId: form.organizationId,
              payload: values,
            },
          }),
          prisma.formMetric.upsert({
            where: { formId: form.id },
            create: { formId: form.id, organizationId: form.organizationId, submissions: 1 },
            update: { submissions: { increment: 1 } },
          }),
        ]);

        // Auto-subscribe contact and trigger welcome email if email provided
        let submittedEmail: string | null = null;
        let submittedName: string | null = null;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        for (const val of Object.values(values)) {
          const str = String(val).trim();
          if (!submittedEmail && emailRegex.test(str)) {
            submittedEmail = str.toLowerCase();
          } else if (
            !submittedName &&
            str.length >= 2 &&
            str.length < 50 &&
            !str.includes("@") &&
            !str.startsWith("http")
          ) {
            submittedName = str;
          }
        }

        if (submittedEmail) {
          try {
            let contact = await prisma.contact.findFirst({
              where: { organizationId: form.organizationId, email: submittedEmail },
            });
            if (contact) {
              if (contact.status !== "SUBSCRIBED" || !contact.emailConsent) {
                await prisma.contact.update({
                  where: { id: contact.id },
                  data: { status: "SUBSCRIBED", emailConsent: true },
                });
              }
            } else {
              contact = await prisma.contact.create({
                data: {
                  organizationId: form.organizationId,
                  email: submittedEmail,
                  firstName: submittedName || undefined,
                  status: "SUBSCRIBED",
                  emailConsent: true,
                  preferenceToken: crypto.randomBytes(32).toString("base64url"),
                },
              });
              await prisma.consentLog.create({
                data: {
                  contactId: contact.id,
                  organizationId: form.organizationId,
                  action: "SUBSCRIBE",
                  source: "PUBLIC_FORM",
                  ipAddress: req.ip || "unknown",
                },
              });
            }

            // Emit workflow events for active automations & live activity feed
            if (ctx.createEventAndBroadcast) {
              try {
                await ctx.createEventAndBroadcast({
                  type: "SIGNUP",
                  contactId: contact.id,
                  metadata: {
                    formId: form.id,
                    formName: form.name,
                    email: submittedEmail,
                    source: "PUBLIC_FORM",
                  },
                });
                await ctx.createEventAndBroadcast({
                  type: "FORM_SUBMITTED",
                  contactId: contact.id,
                  metadata: {
                    formId: form.id,
                    formName: form.name,
                    submissionId: submission.id,
                  },
                });
              } catch (eventErr) {
                logger.warn(
                  { err: eventErr, formId: form.id },
                  "Failed to broadcast form submission event"
                );
              }
            }

            // Trigger Welcome Campaign / Lead Magnet if configured
            if (formatted.welcomeCampaignId) {
              const campaign = await prisma.campaign.findFirst({
                where: { id: formatted.welcomeCampaignId, organizationId: form.organizationId },
              });
              if (campaign) {
                let html = campaign.content || "<p>Welcome to our community!</p>";
                if (formatted.leadMagnetUrl) {
                  html += `<br><div style="margin-top:24px;text-align:center;"><a href="${formatted.leadMagnetUrl}" target="_blank" style="background:#800020;color:#ffffff;padding:12px 24px;border-radius:4px;text-decoration:none;font-weight:bold;display:inline-block;">Download Deliverable Now</a></div>`;
                }
                await serverEmailEngine.send({
                  to: submittedEmail,
                  subject: campaign.subject || "Welcome!",
                  html,
                  fromName: campaign.fromName || "Signal",
                  fromEmail: campaign.fromEmail || "noreply@signal.test",
                  campaignId: campaign.id,
                  contactId: contact.id,
                  organizationId: form.organizationId,
                });
                logger.info(
                  { campaignId: campaign.id, recipient: submittedEmail },
                  "Welcome email sent successfully"
                );
              }
            }
          } catch (syncError) {
            logger.warn(
              { err: syncError, email: submittedEmail },
              "Failed to sync subscriber contact or send welcome email"
            );
          }
        }

        res.status(201).json({
          success: true,
          submissionId: submission.id,
          redirectUrl: formatted.redirectUrl,
          leadMagnetUrl: formatted.leadMagnetUrl,
        });
      } catch (err) {
        next(err);
      }
    }
  );

  router.use("/api/forms", requireAuth);

  // GET /api/forms - Fetch real database forms directly from Prisma DB
  router.get("/api/forms", async (req, res, next) => {
    try {
      const forms = await prisma.form.findMany({
        where: { organizationId: getOrganizationId(req) },
        orderBy: { createdAt: "desc" },
      });

      const metrics = await prisma.formMetric.findMany({
        where: { organizationId: getOrganizationId(req) },
        select: { formId: true, views: true, submissions: true },
      });
      const metricsByForm = new Map(metrics.map((item) => [item.formId, item]));

      const formattedForms = forms.map((form) => formatForm(form, metricsByForm.get(form.id)));

      res.json(formattedForms);
    } catch (err) {
      next(err);
    }
  });

  // POST /api/forms - Create a new real form in DB
  router.post(
    "/api/forms",
    requireRole("EDITOR", "ADMIN", "OWNER"),
    validateBody(FormCreateSchema),
    async (req, res, next) => {
      try {
        const { name, type, url, elements, welcomeCampaignId, leadMagnetUrl, redirectUrl } =
          req.body;
        const form = await prisma.form.create({
          data: {
            name,
            organizationId: getOrganizationId(req),
            config: JSON.stringify({
              type: type || "landing_page",
              status: "active",
              views: 0,
              submissions: 0,
              conversionRate: 0,
              url,
              elements,
              welcomeCampaignId: welcomeCampaignId || null,
              leadMagnetUrl: leadMagnetUrl || null,
              redirectUrl: redirectUrl || null,
            }),
          },
        });

        res.status(201).json(formatForm(form));
      } catch (err) {
        next(err);
      }
    }
  );

  router.get(
    "/api/forms/:id/submissions",
    requireRole("EDITOR", "ADMIN", "OWNER"),
    async (req, res, next) => {
      try {
        const id = String(req.params.id || "").trim();
        const organizationId = getOrganizationId(req);
        const form =
          id && id.length <= 128
            ? await prisma.form.findFirst({ where: { id, organizationId }, select: { id: true } })
            : null;
        if (!form) {
          res.status(404).json({ error: "Form not found." });
          return;
        }

        const [data, total] = await Promise.all([
          prisma.formSubmission.findMany({
            where: { formId: id, organizationId },
            orderBy: { createdAt: "desc" },
            take: 100,
            select: { id: true, createdAt: true, payload: true },
          }),
          prisma.formSubmission.count({ where: { formId: id, organizationId } }),
        ]);

        res.json({ data, total });
      } catch (err) {
        next(err);
      }
    }
  );

  // PUT /api/forms/:id - Update a form within the current organization
  router.put(
    "/api/forms/:id",
    requireRole("EDITOR", "ADMIN", "OWNER"),
    validateBody(FormCreateSchema),
    async (req, res, next) => {
      try {
        const id = String(req.params.id || "").trim();
        if (!id || id.length > 128) {
          res.status(400).json({ error: "Invalid form id." });
          return;
        }

        const organizationId = getOrganizationId(req);
        const existing = await prisma.form.findFirst({ where: { id, organizationId } });
        if (!existing) {
          res.status(404).json({ error: "Form not found." });
          return;
        }

        let existingConfig: Record<string, unknown> = {};
        try {
          existingConfig = JSON.parse(existing.config || "{}");
        } catch {
          existingConfig = {};
        }

        const { name, type, url, elements, welcomeCampaignId, leadMagnetUrl, redirectUrl } =
          req.body;
        const updated = await prisma.form.update({
          where: { id },
          data: {
            name,
            config: JSON.stringify({
              ...existingConfig,
              type,
              url,
              elements,
              welcomeCampaignId:
                welcomeCampaignId !== undefined
                  ? welcomeCampaignId
                  : existingConfig.welcomeCampaignId || null,
              leadMagnetUrl:
                leadMagnetUrl !== undefined ? leadMagnetUrl : existingConfig.leadMagnetUrl || null,
              redirectUrl:
                redirectUrl !== undefined ? redirectUrl : existingConfig.redirectUrl || null,
            }),
          },
        });

        res.json(formatForm(updated));
      } catch (err) {
        next(err);
      }
    }
  );

  // DELETE /api/forms/:id - Delete a form within the current organization
  router.delete(
    "/api/forms/:id",
    requireRole("EDITOR", "ADMIN", "OWNER"),
    async (req, res, next) => {
      try {
        const id = String(req.params.id || "").trim();
        if (!id || id.length > 128) {
          res.status(400).json({ error: "Invalid form id." });
          return;
        }

        const organizationId = getOrganizationId(req);
        const existing = await prisma.form.findFirst({ where: { id, organizationId } });
        if (!existing) {
          res.status(404).json({ error: "Form not found." });
          return;
        }

        await prisma.$transaction([
          prisma.formSubmission.deleteMany({ where: { formId: id, organizationId } }),
          prisma.formMetric.deleteMany({ where: { formId: id, organizationId } }),
          prisma.form.delete({ where: { id } }),
        ]);

        res.status(204).send();
      } catch (err) {
        next(err);
      }
    }
  );

  return router;
}
