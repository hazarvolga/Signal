import { z } from "zod";

// ─── Shared primitives ──────────────────────────────────────────────────────

const cuid = z.string().cuid();
const emailSchema = z.string().email().max(254).toLowerCase().trim();
const phoneSchema = z.string().max(20).optional();
const colorHex = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/)
  .optional();

// ─── Auth ───────────────────────────────────────────────────────────────────

export const LoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(8).max(128),
});

export const SSOCallbackSchema = z.object({
  state: z.string().min(1),
  email: emailSchema,
  name: z.string().max(100).optional(),
});

// ─── Contacts ───────────────────────────────────────────────────────────────

export const ContactCreateSchema = z.object({
  email: emailSchema,
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  phone: phoneSchema,
  status: z.enum(["SUBSCRIBED", "UNSUBSCRIBED", "BOUNCED", "CLEANED"]).default("UNSUBSCRIBED"),
  emailConsent: z.boolean().default(false),
  smsConsent: z.boolean().default(false),
  whatsappConsent: z.boolean().default(false),
  tags: z
    .array(z.string().trim().min(1).max(50))
    .max(50)
    .default([])
    .transform((tags) => [...new Set(tags)]),
  customFields: z.record(z.string(), z.unknown()).optional(),
  listIds: z.array(cuid).optional(),
  consentTextVersion: z.string().min(1).max(100).optional(),
  consentPurpose: z.string().min(1).max(200).optional(),
  lawfulBasis: z.string().min(1).max(100).optional(),
});

export const ContactUpdateSchema = ContactCreateSchema.partial();

// ─── Campaigns ──────────────────────────────────────────────────────────────

const CampaignFieldsSchema = z.object({
  name: z.string().min(1).max(200),
  subject: z.string().max(500).optional(),
  subjectB: z.string().max(500).optional(),
  previewText: z.string().max(200).optional(),
  fromName: z.string().max(100).optional(),
  fromEmail: emailSchema.optional(),
  channel: z.enum(["EMAIL", "SMS", "WHATSAPP", "IN_APP"]).default("EMAIL"),
  type: z.enum(["REGULAR", "AB", "AUTOMATED", "TRANSACTIONAL"]).default("REGULAR"),
  templateId: cuid.optional(),
  listIds: z.array(cuid).optional(),
  segmentIds: z.array(cuid).optional(),
  audienceContactIds: z.array(cuid).max(100_000).default([]),
  scheduledAt: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().datetime().optional()
  ),
  status: z.enum(["DRAFT", "SCHEDULED", "SENT", "SENDING", "PAUSED", "ARCHIVED"]).default("DRAFT"),
  content: z.string().max(2_000_000).optional(),
  contentB: z.string().max(2_000_000).optional(),
  htmlContent: z.string().max(2_000_000).optional(), // 2MB max
  textContent: z.string().max(100_000).optional(),
  testPercentage: z.coerce.number().int().min(1).max(100).optional(),
  testDuration: z.coerce
    .number()
    .int()
    .min(1)
    .max(24 * 30)
    .optional(),
  winnerCriteria: z.enum(["OPEN_RATE", "CLICK_RATE"]).optional(),
  timezone: z.string().min(1).max(100).optional(),
  perUserTimezone: z.boolean().optional(),
  brandId: cuid.optional(),
});

export const CampaignCreateSchema = CampaignFieldsSchema.superRefine((campaign, context) => {
  if (campaign.scheduledAt && campaign.audienceContactIds.length === 0) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "A scheduled campaign requires an explicit audience snapshot",
      path: ["audienceContactIds"],
    });
  }
  if (campaign.channel === "EMAIL") {
    for (const [field, value] of [
      ["subject", campaign.subject],
      ["fromName", campaign.fromName],
      ["fromEmail", campaign.fromEmail],
      ["content", campaign.content],
    ] as const) {
      if (!value) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Email campaign requires ${field}`,
          path: [field],
        });
      }
    }
  }
  if (campaign.type !== "AB") return;
  if (!campaign.subject || !campaign.content) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "A/B variation A requires subject and content",
      path: ["subject"],
    });
  }
  if (!campaign.subjectB || !campaign.contentB) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "A/B variation B requires subject and content",
      path: ["subjectB"],
    });
  }
  if ((campaign.testPercentage || 20) >= 100) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "A/B test size must leave a remaining winner audience",
      path: ["testPercentage"],
    });
  }
});

export const CampaignUpdateSchema = CampaignFieldsSchema.partial();

export const CampaignSendSchema = z.object({
  status: z.enum(["SENT", "PAUSED", "ARCHIVED"]),
});

// ─── Flows ──────────────────────────────────────────────────────────────────

export const FlowCreateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  trigger: z
    .enum([
      "CONTACT_ADDED",
      "CONTACT_SUBSCRIBED",
      "CONTACT_UNSUBSCRIBED",
      "CAMPAIGN_OPENED",
      "CAMPAIGN_CLICKED",
      "FORM_SUBMITTED",
      "PURCHASE",
      "CUSTOM",
    ])
    .optional(),
  status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "ARCHIVED"]).default("DRAFT"),
  nodes: z.string().default("[]"),
  edges: z.string().default("[]"),
});

export const FlowUpdateSchema = FlowCreateSchema.partial();

// ─── Templates ──────────────────────────────────────────────────────────────

export const TemplateCreateSchema = z.object({
  name: z.string().min(1).max(200),
  subject: z.string().max(500).optional(),
  htmlContent: z.string().max(2_000_000).optional(),
  textContent: z.string().max(100_000).optional(),
  category: z.string().max(100).optional(),
  brandId: cuid.optional(),
});

export const TemplateUpdateSchema = TemplateCreateSchema.partial();

// ─── Segments ───────────────────────────────────────────────────────────────

export const SegmentRuleSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("attribute"),
    field: z.enum(["status", "emailConsent", "engagementScore"]),
    operator: z.enum(["equals", "not_equals", "gt", "gte", "lt", "lte"]).default("equals"),
    value: z.union([z.string().max(200), z.number(), z.boolean()]),
  }),
  z.object({
    type: z.literal("event"),
    eventName: z
      .string()
      .min(1)
      .max(100)
      .regex(/^[A-Z0-9_:-]+$/),
    timeframe: z.string().regex(/^[1-9][0-9]{0,3}[hdwm]$/),
  }),
]);

export const SegmentCreateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  rules: z.array(SegmentRuleSchema).max(50).default([]),
  conditionLogic: z.enum(["AND", "OR"]).default("AND"),
});

export const SegmentUpdateSchema = SegmentCreateSchema.partial();

// ─── Roles ──────────────────────────────────────────────────────────────────

export const RoleCreateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  permissions: z.array(z.string().max(100)).max(200).default([]),
});

export const RoleUpdateSchema = RoleCreateSchema.partial();

// ─── AI requests ────────────────────────────────────────────────────────────

export const AISubjectLinesSchema = z.object({
  topic: z.string().min(1).max(500).trim(),
});

export const AIPreviewTextSchema = z.object({
  subject: z.string().min(1).max(500).trim(),
  content: z.string().min(1).max(10_000).trim(),
});

export const AISpamScoreSchema = z.object({
  subject: z.string().min(1).max(500).trim(),
  content: z.string().min(1).max(50_000).trim(),
});

export const AIPersonalizeSchema = z.object({
  template: z.string().min(1).max(50_000).trim(),
  contactData: z.record(z.string(), z.unknown()),
});

// ─── API Keys ────────────────────────────────────────────────────────────────

export const ApiKeyCreateSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  permissions: z.array(z.string().max(100)).max(50).default(["contacts:read"]),
});

// ─── Brands ──────────────────────────────────────────────────────────────────

export const BrandCreateSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  logoUrl: z.string().url().optional(),
  primaryColor: colorHex,
  secondaryColor: colorHex,
  fontFamily: z.string().max(100).optional(),
});

// ─── Assets and engagement ──────────────────────────────────────────────────

const inlineAssetDataUrl = z
  .string()
  .max(7_000_000)
  .regex(
    /^data:(?:image\/(?:png|jpeg|gif|webp)|application\/pdf);base64,[A-Za-z0-9+/]+={0,2}$/,
    "Asset must be an allowed base64 data URL"
  );

const boundedMetadata = z
  .record(z.string().max(100), z.unknown())
  .refine((value) => Buffer.byteLength(JSON.stringify(value), "utf8") <= 16_384, {
    message: "Metadata must not exceed 16KB",
  });

export const AssetCreateSchema = z
  .object({
    name: z.string().trim().min(1).max(255),
    url: inlineAssetDataUrl,
    type: z.enum(["IMAGE", "VIDEO", "DOCUMENT", "FILE"]),
    metadata: boundedMetadata.optional(),
  })
  .strict();

export const EngagementEventSchema = z
  .object({
    campaignId: cuid,
    contactId: cuid.optional(),
    type: z
      .string()
      .trim()
      .min(1)
      .max(50)
      .regex(/^[a-z0-9_:-]+$/i),
    value: z.coerce.number().finite().min(0).max(1_000_000_000),
    sectionId: z.string().trim().min(1).max(200).optional(),
    metadata: boundedMetadata.optional(),
  })
  .strict();

// ─── Helper: validate middleware factory ────────────────────────────────────

import type { Request, Response, NextFunction } from "express";

/**
 * validateBody — Express middleware factory that validates req.body against a Zod schema.
 * Returns 400 with structured error details on failure.
 */
export function validateBody<T>(schema: z.ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        error: "Validation failed",
        code: "VALIDATION_ERROR",
        details: result.error.flatten().fieldErrors,
      });
      return;
    }
    req.body = result.data;
    next();
  };
}

/**
 * validateQuery — Express middleware factory that validates req.query against a Zod schema.
 */
export function validateQuery<T>(schema: z.ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      res.status(400).json({
        error: "Query validation failed",
        code: "VALIDATION_ERROR",
        details: result.error.flatten().fieldErrors,
      });
      return;
    }
    (req as any).validatedQuery = result.data;
    next();
  };
}
