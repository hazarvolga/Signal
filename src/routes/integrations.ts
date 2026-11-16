import crypto from "crypto";
import { Router, text } from "express";
import { prisma } from "../services/prisma";
import { AppError } from "../middleware/errorHandler";
import type { RouteContext } from "./context";
import { requireAuth, requireRole } from "../middleware/auth";
import { getOrganizationId } from "../lib/authContext";
import { InvalidSnsMessageError, processSesSnsMessage } from "../services/email/snsWebhook";

export default function registerIntegrationRoutes(ctx: RouteContext): Router {
  const router = Router();
  router.use("/api/products", requireAuth);
  router.use("/api/revenue", requireAuth);
  router.use("/api/analytics", requireAuth);
  router.use("/api/integrations", requireAuth);

  router.get("/api/products", async (req, res, next) => {
    try {
      const products = await prisma.product.findMany({
        where: { organizationId: getOrganizationId(req) },
      });
      res.json(products);
    } catch (err) {
      next(err);
    }
  });

  router.post(
    "/api/products/sync",
    requireRole("EDITOR", "ADMIN", "OWNER"),
    async (req, res, next) => {
      try {
        if (process.env.NODE_ENV === "production") {
          return res.status(501).json({ error: "Product sync provider is not configured" });
        }
        const orgId = getOrganizationId(req);

        const mockProducts = [
          { name: "Editorial Tote Bag", price: 25.0, source: "SHOPIFY", externalId: "sh_123" },
          {
            name: "SIGNAL Annual Subscription",
            price: 120.0,
            source: "CUSTOM",
            externalId: "sub_456",
          },
          {
            name: "Limited Edition Print",
            price: 45.0,
            source: "WOOCOMMERCE",
            externalId: "woo_789",
          },
        ];

        for (const p of mockProducts) {
          await prisma.product.upsert({
            where: { id: p.externalId },
            update: {
              name: p.name,
              price: p.price,
              source: p.source,
              externalId: p.externalId,
            },
            create: {
              name: p.name,
              price: p.price,
              source: p.source,
              externalId: p.externalId,
              organizationId: orgId,
              id: p.externalId,
            },
          });
        }
        res.json({ status: "Synced", count: mockProducts.length });
      } catch (err) {
        next(err);
      }
    }
  );

  router.get("/api/revenue/summary", async (req, res, next) => {
    try {
      const orgId = getOrganizationId(req);
      const [totalAgg, orderCount, campaignAgg, flowAgg] = await Promise.all([
        prisma.revenue.aggregate({
          where: { organizationId: orgId },
          _sum: { amount: true },
        }),
        prisma.revenue.count({
          where: { organizationId: orgId },
        }),
        prisma.revenue.aggregate({
          where: { organizationId: orgId, campaignId: { not: null } },
          _sum: { amount: true },
        }),
        prisma.revenue.aggregate({
          where: { organizationId: orgId, campaignId: null },
          _sum: { amount: true },
        }),
      ]);

      const totalRevenue = totalAgg._sum.amount || 0;
      const avgOrderValue = orderCount > 0 ? Number((totalRevenue / orderCount).toFixed(2)) : 0;
      const campaignRev = campaignAgg._sum.amount || 0;
      const automationRev = flowAgg._sum.amount || 0;
      const campaignRoi =
        campaignRev > 0 ? Number((campaignRev / Math.max(1, orderCount * 15)).toFixed(1)) : 0;

      res.json({
        totalRevenue,
        orderCount,
        avgOrderValue,
        campaignRevenue: campaignRev,
        automationRevenue: automationRev,
        campaignRoi,
      });
    } catch (err) {
      next(err);
    }
  });

  router.get("/api/analytics/revenue/attribution", async (req, res, next) => {
    try {
      const orgId = getOrganizationId(req);

      const revenues = await prisma.revenue.groupBy({
        by: ["campaignId"],
        where: { organizationId: orgId },
        _sum: { amount: true },
      });
      const campaignIds = revenues
        .map((revenue) => revenue.campaignId)
        .filter((id): id is string => Boolean(id));
      const campaigns = await prisma.campaign.findMany({
        where: { id: { in: campaignIds }, organizationId: orgId },
        select: { id: true, name: true },
      });
      const campaignNames = new Map(campaigns.map((campaign) => [campaign.id, campaign.name]));

      const colors = ["#8B1A1A", "#2D5A27", "#D4AF37", "#4A6B82", "#6B4C82"];
      const attributionData = revenues.map((r, index) => ({
        name: (r.campaignId && campaignNames.get(r.campaignId)) || "Unattributed",
        value: r._sum.amount || 0,
        color: colors[index % colors.length],
      }));

      res.json(attributionData);
    } catch (err) {
      next(err);
    }
  });

  router.get("/api/integrations", async (req, res, next) => {
    try {
      const integrations = await prisma.integration.findMany({
        where: { organizationId: getOrganizationId(req) },
        select: {
          id: true,
          type: true,
          status: true,
          organizationId: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      res.json(integrations);
    } catch (err) {
      next(err);
    }
  });

  router.patch("/api/integrations/:id", requireRole("ADMIN", "OWNER"), async (req, res, next) => {
    try {
      const { id } = req.params;
      const { status, config } = req.body;
      if (status !== "CONNECTED" && status !== "DISCONNECTED") {
        throw new AppError("Integration status is invalid", 400);
      }
      let parsedConfig: Record<string, unknown> | undefined;
      try {
        parsedConfig =
          typeof config === "string" ? (JSON.parse(config) as Record<string, unknown>) : config;
      } catch {
        throw new AppError("Integration config must be valid JSON", 400);
      }
      const allowedConfig =
        parsedConfig && typeof parsedConfig === "object"
          ? {
              shopDomain:
                typeof parsedConfig.shopDomain === "string"
                  ? parsedConfig.shopDomain.trim().toLowerCase()
                  : undefined,
            }
          : {};
      if (parsedConfig && Object.keys(parsedConfig).some((key) => key !== "shopDomain")) {
        throw new AppError(
          "Integration secrets cannot be stored through this endpoint; use deployment secrets",
          400
        );
      }
      const existing = await prisma.integration.findFirst({
        where: { id, organizationId: getOrganizationId(req) },
        select: { id: true, type: true, organizationId: true },
      });
      if (!existing) throw new AppError("Integration not found", 404);
      if (allowedConfig.shopDomain && existing.type !== "SHOPIFY") {
        throw new AppError("shopDomain is only valid for Shopify integrations", 400);
      }
      const integration = await prisma.$transaction(async (tx) => {
        if (status === "CONNECTED" && allowedConfig.shopDomain) {
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${allowedConfig.shopDomain}))`;
          const connectedShops = await tx.integration.findMany({
            where: {
              id: { not: existing.id },
              type: "SHOPIFY",
              status: "CONNECTED",
            },
            select: { organizationId: true, config: true },
          });
          const claimedByAnotherTenant = connectedShops.some(({ config }) => {
            try {
              const parsed = JSON.parse(config) as { shopDomain?: string };
              return parsed.shopDomain?.trim().toLowerCase() === allowedConfig.shopDomain;
            } catch {
              return false;
            }
          });
          if (claimedByAnotherTenant) {
            throw new AppError("Shopify shop is already connected to another organization", 409);
          }
        }
        return tx.integration.update({
          where: { id: existing.id },
          data: {
            status,
            config: JSON.stringify(allowedConfig),
          },
        });
      });
      res.json({
        id: integration.id,
        type: integration.type,
        status: integration.status,
        organizationId: integration.organizationId,
        updatedAt: integration.updatedAt,
      });
    } catch (err) {
      next(err);
    }
  });

  // ── Dedicated Provider Integration Management ──────────────────────

  function maskSecret(val?: string): string {
    if (!val || typeof val !== "string") return "";
    const trimmed = val.trim();
    if (trimmed.length <= 8) return "••••••••";
    return `${trimmed.slice(0, 3)}••••••••${trimmed.slice(-3)}`;
  }

  function isMasked(val?: string): boolean {
    return typeof val === "string" && val.includes("••••••••");
  }

  const VALID_PROVIDERS = [
    "SHOPIFY",
    "WOOCOMMERCE",
    "HUBSPOT",
    "ZAPIER",
    "TWILIO",
    "WHATSAPP",
  ] as const;

  router.get("/api/integrations/status", async (req, res, next) => {
    try {
      const orgId = getOrganizationId(req);
      const integrations = await prisma.integration.findMany({
        where: { organizationId: orgId },
      });

      const statusMap: Record<string, { status: string; updatedAt?: Date; configSummary?: any }> =
        {};
      for (const p of VALID_PROVIDERS) {
        statusMap[p] = { status: "DISCONNECTED" };
      }

      for (const item of integrations) {
        const type = item.type.toUpperCase();
        let parsed: any = {};
        try {
          parsed = JSON.parse(item.config || "{}");
        } catch {
          parsed = {};
        }

        const summary: any = {};
        if (parsed.shopDomain) summary.shopDomain = parsed.shopDomain;
        if (parsed.storeUrl) summary.storeUrl = parsed.storeUrl;
        if (parsed.fromNumber) summary.fromNumber = parsed.fromNumber;
        if (parsed.accountSid) summary.accountSid = parsed.accountSid;
        if (parsed.wabaId) summary.wabaId = parsed.wabaId;
        if (parsed.phoneNumberId) summary.phoneNumberId = parsed.phoneNumberId;
        if (parsed.lastSyncTime) summary.lastSyncTime = parsed.lastSyncTime;
        if (parsed.lastSyncCount !== undefined) summary.lastSyncCount = parsed.lastSyncCount;

        statusMap[type] = {
          status: item.status,
          updatedAt: item.updatedAt,
          configSummary: summary,
        };
      }

      res.json(statusMap);
    } catch (err) {
      next(err);
    }
  });

  router.get("/api/integrations/provider/:type", async (req, res, next) => {
    try {
      const orgId = getOrganizationId(req);
      const providerType = req.params.type.toUpperCase();
      if (!VALID_PROVIDERS.includes(providerType as any)) {
        throw new AppError(`Unsupported integration provider: ${req.params.type}`, 400);
      }

      const existing = await prisma.integration.findFirst({
        where: { type: providerType, organizationId: orgId },
      });

      if (!existing) {
        return res.json({
          type: providerType,
          status: "DISCONNECTED",
          config: {},
        });
      }

      let parsed: any = {};
      try {
        parsed = JSON.parse(existing.config || "{}");
      } catch {
        parsed = {};
      }

      // Return configuration with sensitive tokens masked
      const maskedConfig = { ...parsed };
      if (maskedConfig.accessToken) maskedConfig.accessToken = maskSecret(maskedConfig.accessToken);
      if (maskedConfig.authToken) maskedConfig.authToken = maskSecret(maskedConfig.authToken);
      if (maskedConfig.consumerSecret)
        maskedConfig.consumerSecret = maskSecret(maskedConfig.consumerSecret);
      if (maskedConfig.webhookSecret)
        maskedConfig.webhookSecret = maskSecret(maskedConfig.webhookSecret);

      res.json({
        id: existing.id,
        type: existing.type,
        status: existing.status,
        config: maskedConfig,
        updatedAt: existing.updatedAt,
      });
    } catch (err) {
      next(err);
    }
  });

  router.put(
    "/api/integrations/provider/:type",
    requireRole("ADMIN", "OWNER"),
    async (req, res, next) => {
      try {
        const orgId = getOrganizationId(req);
        const providerType = req.params.type.toUpperCase();
        if (!VALID_PROVIDERS.includes(providerType as any)) {
          throw new AppError(`Unsupported integration provider: ${req.params.type}`, 400);
        }

        const existing = await prisma.integration.findFirst({
          where: { type: providerType, organizationId: orgId },
        });

        let existingConfig: any = {};
        if (existing?.config) {
          try {
            existingConfig = JSON.parse(existing.config);
          } catch {
            existingConfig = {};
          }
        }

        const incomingConfig = req.body.config || {};
        const newConfig = { ...existingConfig, ...incomingConfig };

        // Preserve existing secret if incoming value is masked or omitted
        const secretFields = ["accessToken", "authToken", "consumerSecret", "webhookSecret"];
        for (const field of secretFields) {
          if (!incomingConfig[field] || isMasked(incomingConfig[field])) {
            if (existingConfig[field]) {
              newConfig[field] = existingConfig[field];
            } else {
              delete newConfig[field];
            }
          }
        }

        const targetStatus =
          req.body.status || (existing?.status === "CONNECTED" ? "CONNECTED" : "DISCONNECTED");

        const saved = existing
          ? await prisma.integration.update({
              where: { id: existing.id },
              data: {
                config: JSON.stringify(newConfig),
                status: targetStatus,
              },
            })
          : await prisma.integration.create({
              data: {
                type: providerType,
                status: targetStatus,
                config: JSON.stringify(newConfig),
                organizationId: orgId,
              },
            });

        res.json({
          id: saved.id,
          type: saved.type,
          status: saved.status,
          updatedAt: saved.updatedAt,
        });
      } catch (err) {
        next(err);
      }
    }
  );

  router.post(
    "/api/integrations/provider/:type/test",
    requireRole("ADMIN", "OWNER"),
    async (req, res, next) => {
      try {
        const orgId = getOrganizationId(req);
        const providerType = req.params.type.toUpperCase();
        if (!VALID_PROVIDERS.includes(providerType as any)) {
          throw new AppError(`Unsupported integration provider: ${req.params.type}`, 400);
        }

        const existing = await prisma.integration.findFirst({
          where: { type: providerType, organizationId: orgId },
        });

        let config: any = {};
        if (existing?.config) {
          try {
            config = JSON.parse(existing.config);
          } catch {
            config = {};
          }
        }
        // Allow testing unsaved credentials passed in request body
        if (req.body.config) {
          const secretFields = ["accessToken", "authToken", "consumerSecret", "webhookSecret"];
          const override = { ...req.body.config };
          for (const field of secretFields) {
            if (isMasked(override[field]) && config[field]) {
              override[field] = config[field];
            }
          }
          config = { ...config, ...override };
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 7000);

        try {
          if (providerType === "SHOPIFY") {
            const shop = config.shopDomain
              ? config.shopDomain.replace(/^https?:\/\//, "").replace(/\/$/, "")
              : "";
            if (!shop || !config.accessToken) {
              return res
                .status(400)
                .json({ success: false, error: "Shop domain and access token are required" });
            }
            const response = await fetch(`https://${shop}/admin/api/2024-01/shop.json`, {
              headers: { "X-Shopify-Access-Token": config.accessToken },
              signal: controller.signal,
            });
            if (!response.ok) {
              const text = await response.text();
              throw new Error(`Shopify returned HTTP ${response.status}: ${text.slice(0, 100)}`);
            }
            const data = (await response.json()) as any;
            if (existing) {
              await prisma.integration.update({
                where: { id: existing.id },
                data: { status: "CONNECTED" },
              });
            }
            return res.json({
              success: true,
              message: `Connected successfully to Shopify store "${data.shop?.name || shop}"`,
              details: {
                name: data.shop?.name,
                email: data.shop?.email,
                domain: data.shop?.domain,
              },
            });
          }

          if (providerType === "WOOCOMMERCE") {
            const url = config.storeUrl ? config.storeUrl.replace(/\/$/, "") : "";
            if (!url || !config.consumerKey || !config.consumerSecret) {
              return res
                .status(400)
                .json({
                  success: false,
                  error: "Store URL, Consumer Key, and Consumer Secret are required",
                });
            }
            const authHeader = `Basic ${Buffer.from(`${config.consumerKey}:${config.consumerSecret}`).toString("base64")}`;
            const response = await fetch(`${url}/wp-json/wc/v3/system_status`, {
              headers: { Authorization: authHeader },
              signal: controller.signal,
            });
            if (!response.ok) {
              throw new Error(`WooCommerce returned HTTP ${response.status}`);
            }
            const data = (await response.json()) as any;
            if (existing) {
              await prisma.integration.update({
                where: { id: existing.id },
                data: { status: "CONNECTED" },
              });
            }
            return res.json({
              success: true,
              message: `Connected successfully to WooCommerce (${data.environment?.version || "Active"})`,
              details: { wcVersion: data.environment?.version, currency: data.settings?.currency },
            });
          }

          if (providerType === "HUBSPOT") {
            if (!config.accessToken) {
              return res
                .status(400)
                .json({ success: false, error: "HubSpot Private App Access Token is required" });
            }
            const response = await fetch("https://api.hubapi.com/crm/v3/objects/contacts?limit=1", {
              headers: { Authorization: `Bearer ${config.accessToken}` },
              signal: controller.signal,
            });
            if (!response.ok) {
              throw new Error(`HubSpot returned HTTP ${response.status}`);
            }
            if (existing) {
              await prisma.integration.update({
                where: { id: existing.id },
                data: { status: "CONNECTED" },
              });
            }
            return res.json({
              success: true,
              message: "Connected successfully to HubSpot CRM",
            });
          }

          if (providerType === "TWILIO") {
            if (!config.accountSid || !config.authToken) {
              return res
                .status(400)
                .json({ success: false, error: "Account SID and Auth Token are required" });
            }
            const authHeader = `Basic ${Buffer.from(`${config.accountSid}:${config.authToken}`).toString("base64")}`;
            const response = await fetch(
              `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}.json`,
              {
                headers: { Authorization: authHeader },
                signal: controller.signal,
              }
            );
            if (!response.ok) {
              throw new Error(`Twilio returned HTTP ${response.status}`);
            }
            const data = (await response.json()) as any;
            if (existing) {
              await prisma.integration.update({
                where: { id: existing.id },
                data: { status: "CONNECTED" },
              });
            }
            return res.json({
              success: true,
              message: `Connected successfully to Twilio Account: ${data.friendly_name || config.accountSid}`,
              details: { status: data.status, type: data.type },
            });
          }

          if (providerType === "WHATSAPP") {
            if (!config.phoneNumberId || !config.accessToken) {
              return res
                .status(400)
                .json({
                  success: false,
                  error: "Phone Number ID and System Access Token are required",
                });
            }
            const response = await fetch(
              `https://graph.facebook.com/v21.0/${config.phoneNumberId}`,
              {
                headers: { Authorization: `Bearer ${config.accessToken}` },
                signal: controller.signal,
              }
            );
            if (!response.ok) {
              throw new Error(`Meta Graph API returned HTTP ${response.status}`);
            }
            const data = (await response.json()) as any;
            if (existing) {
              await prisma.integration.update({
                where: { id: existing.id },
                data: { status: "CONNECTED" },
              });
            }
            return res.json({
              success: true,
              message: `Connected successfully to WhatsApp Phone ID: ${data.display_phone_number || config.phoneNumberId}`,
              details: { verifiedName: data.verified_name, qualityRating: data.quality_rating },
            });
          }

          if (providerType === "ZAPIER") {
            if (existing) {
              await prisma.integration.update({
                where: { id: existing.id },
                data: { status: "CONNECTED" },
              });
            }
            return res.json({
              success: true,
              message: "Zapier integration configured successfully",
            });
          }

          res.status(400).json({ success: false, error: "Unsupported provider for testing" });
        } catch (testErr: any) {
          const errorMsg =
            testErr.name === "AbortError"
              ? "Connection timeout after 7s"
              : testErr.message || "Failed to reach provider API";
          if (existing) {
            await prisma.integration
              .update({ where: { id: existing.id }, data: { status: "ERROR" } })
              .catch(() => {});
          }
          res.status(502).json({ success: false, error: errorMsg });
        } finally {
          clearTimeout(timeoutId);
        }
      } catch (err) {
        next(err);
      }
    }
  );

  router.post(
    "/api/integrations/provider/:type/sync",
    requireRole("ADMIN", "OWNER"),
    async (req, res, next) => {
      try {
        const orgId = getOrganizationId(req);
        const providerType = req.params.type.toUpperCase();
        const existing = await prisma.integration.findFirst({
          where: { type: providerType, organizationId: orgId },
        });

        if (!existing || existing.status !== "CONNECTED") {
          throw new AppError(`Integration ${providerType} is not connected`, 400);
        }

        let config: any = {};
        try {
          config = JSON.parse(existing.config || "{}");
        } catch {
          config = {};
        }

        let syncCount = 0;
        const now = new Date();

        if (providerType === "SHOPIFY") {
          const shop = config.shopDomain?.replace(/^https?:\/\//, "").replace(/\/$/, "");
          if (shop && config.accessToken) {
            const resp = await fetch(`https://${shop}/admin/api/2024-01/products.json?limit=50`, {
              headers: { "X-Shopify-Access-Token": config.accessToken },
            });
            if (resp.ok) {
              const data = (await resp.json()) as any;
              const products = data.products || [];
              for (const p of products) {
                const variant = p.variants?.[0] || {};
                await prisma.product.upsert({
                  where: { id: `sh_${p.id}` },
                  update: {
                    name: p.title,
                    price: parseFloat(variant.price || "0"),
                    stock: variant.inventory_quantity || 0,
                    updatedAt: now,
                  },
                  create: {
                    id: `sh_${p.id}`,
                    externalId: String(p.id),
                    name: p.title,
                    price: parseFloat(variant.price || "0"),
                    stock: variant.inventory_quantity || 0,
                    source: "SHOPIFY",
                    organizationId: orgId,
                  },
                });
                syncCount++;
              }
            }
          }
        }

        // Update last sync info in config
        config.lastSyncTime = now.toISOString();
        config.lastSyncCount = syncCount;
        await prisma.integration.update({
          where: { id: existing.id },
          data: { config: JSON.stringify(config) },
        });

        res.json({ success: true, count: syncCount, syncedAt: now.toISOString() });
      } catch (err) {
        next(err);
      }
    }
  );

  router.post(
    "/api/integrations/provider/:type/disconnect",
    requireRole("ADMIN", "OWNER"),
    async (req, res, next) => {
      try {
        const orgId = getOrganizationId(req);
        const providerType = req.params.type.toUpperCase();
        const existing = await prisma.integration.findFirst({
          where: { type: providerType, organizationId: orgId },
        });

        if (!existing) {
          return res.json({ success: true, status: "DISCONNECTED" });
        }

        await prisma.integration.update({
          where: { id: existing.id },
          data: { status: "DISCONNECTED" },
        });

        res.json({ success: true, status: "DISCONNECTED" });
      } catch (err) {
        next(err);
      }
    }
  );

  router.get("/api/webhooks", requireAuth, async (req, res, next) => {
    try {
      const webhooks = await prisma.webhook.findMany({
        where: { organizationId: getOrganizationId(req) },
        select: {
          id: true,
          url: true,
          events: true,
          isActive: true,
          organizationId: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      res.json(webhooks);
    } catch (err) {
      next(err);
    }
  });

  router.post(
    "/api/webhooks",
    requireAuth,
    requireRole("ADMIN", "OWNER"),
    async (req, res, next) => {
      try {
        const { url, events } = req.body;
        const webhook = await prisma.webhook.create({
          data: {
            url,
            events: JSON.stringify(events),
            organizationId: getOrganizationId(req),
            isActive: true,
          },
        });
        res.json(webhook);
      } catch (err) {
        next(err);
      }
    }
  );

  router.delete(
    "/api/webhooks/:id",
    requireAuth,
    requireRole("ADMIN", "OWNER"),
    async (req, res, next) => {
      try {
        const result = await prisma.webhook.deleteMany({
          where: { id: req.params.id, organizationId: getOrganizationId(req) },
        });
        if (result.count === 0) throw new AppError("Webhook not found", 404);
        res.json({ success: true });
      } catch (err) {
        next(err);
      }
    }
  );

  /**
   * POST /api/webhooks/ses
   * Amazon SES Bounce & Complaint Webhook Handler
   */
  router.post(
    "/api/webhooks/ses",
    text({ type: "text/plain", limit: "1mb" }),
    async (req, res, next) => {
      try {
        const payload = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
        const result = await processSesSnsMessage(payload);
        if (result.kind === "confirmation") {
          const confirmation = await fetch(result.subscribeUrl, {
            method: "GET",
            redirect: "error",
          });
          if (!confirmation.ok) {
            throw new Error(
              `SNS subscription confirmation failed with HTTP ${confirmation.status}`
            );
          }
        }
        res.json({ success: true, ...result });
      } catch (error) {
        if (error instanceof InvalidSnsMessageError || error instanceof SyntaxError) {
          return res.status(401).json({ error: "Invalid SNS notification" });
        }
        next(error);
      }
    }
  );

  router.post("/api/webhooks/shopify", async (req, res, next) => {
    try {
      const topic = req.headers["x-shopify-topic"] as string;
      const shopDomain = req.headers["x-shopify-shop-domain"] as string;
      const hmacHeader = req.headers["x-shopify-hmac-sha256"] as string;
      const webhookId = req.headers["x-shopify-webhook-id"] as string;
      const payload = req.body;
      const rawBody = (req as typeof req & { rawBody?: Buffer }).rawBody;

      const webhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET;
      if (!webhookSecret || !hmacHeader || !rawBody || !shopDomain || !webhookId) {
        return res.status(401).json({ error: "Shopify webhook verification is not configured" });
      }
      const calculatedHmac = crypto
        .createHmac("sha256", webhookSecret)
        .update(rawBody)
        .digest("base64");
      const supplied = Buffer.from(hmacHeader);
      const calculated = Buffer.from(calculatedHmac);
      if (supplied.length !== calculated.length || !crypto.timingSafeEqual(supplied, calculated)) {
        return res.status(401).json({ error: "Invalid HMAC signature" });
      }

      if (!["products/update", "orders/create"].includes(topic)) {
        return res.status(400).json({ error: "Unsupported Shopify webhook topic" });
      }

      const integrations = await prisma.integration.findMany({
        where: { type: "SHOPIFY", status: "CONNECTED" },
        select: { organizationId: true, config: true },
      });
      const matchingIntegrations = integrations.filter(({ config }) => {
        try {
          const parsed = JSON.parse(config) as { shopDomain?: string };
          return parsed.shopDomain?.trim().toLowerCase() === shopDomain.trim().toLowerCase();
        } catch {
          return false;
        }
      });
      if (matchingIntegrations.length !== 1) {
        return res.status(401).json({ error: "Unknown or ambiguous Shopify shop" });
      }
      const integration = matchingIntegrations[0];
      const organizationId = integration.organizationId;

      const duplicate = await prisma.webhookLog.findUnique({ where: { externalId: webhookId } });
      if (duplicate) return res.status(200).end();

      const log = await prisma.webhookLog.create({
        data: {
          externalId: webhookId,
          source: "SHOPIFY",
          topic: topic || "unknown",
          payload: rawBody.toString("utf8"),
          processed: false,
          organizationId,
        },
      });

      if (topic === "products/update") {
        const { variants } = payload;
        if (variants && Array.isArray(variants)) {
          for (const variant of variants) {
            await prisma.product.updateMany({
              where: {
                externalId: variant.id.toString(),
                organizationId,
              },
              data: {
                stock: variant.inventory_quantity,
                price: parseFloat(variant.price),
                updatedAt: new Date(),
              },
            });
          }
        }
      }

      if (topic === "orders/create") {
        const { customer, total_price, id: orderId } = payload;
        if (customer && customer.email) {
          const contact = await prisma.contact.findFirst({
            where: { email: customer.email, organizationId },
          });

          if (contact) {
            await ctx.createEventAndBroadcast({
              type: "ORDER_PLACED",
              metadata: {
                orderId,
                total: total_price,
                source: "SHOPIFY_WEBHOOK",
              },
              contactId: contact.id,
            });
          }
        }
      }

      await prisma.webhookLog.update({
        where: { id: log.id },
        data: { processed: true },
      });

      res.status(200).end();
    } catch (err) {
      next(err);
    }
  });

  router.post(
    "/api/webhooks/shopify/simulate",
    requireAuth,
    requireRole("ADMIN", "OWNER"),
    async (req, res, next) => {
      try {
        if (process.env.NODE_ENV === "production") {
          return res.status(404).json({ error: "Simulation endpoint is disabled" });
        }
        const { type } = req.body;
        const org = await prisma.organization.findUnique({
          where: { id: getOrganizationId(req) },
        });
        if (!org) throw new AppError("No organization found", 404);

        let product = await prisma.product.findFirst({
          where: { externalId: "shopify_12345", organizationId: org.id },
        });

        if (!product) {
          product = await prisma.product.create({
            data: {
              name: "Mock Shopify Product",
              externalId: "shopify_12345",
              price: 99.99,
              source: "SHOPIFY",
              stock: 10,
              organizationId: org.id,
            },
          });
        }

        if (type === "stock") {
          const newStock = Math.floor(Math.random() * 100);
          await prisma.product.update({
            where: { id: product.id },
            data: { stock: newStock },
          });

          await prisma.webhookLog.create({
            data: {
              source: "SHOPIFY",
              topic: "products/update",
              payload: JSON.stringify({
                id: 12345,
                variants: [{ id: "shopify_12345", inventory_quantity: newStock, price: "99.99" }],
              }),
              processed: true,
              organizationId: org.id,
            },
          });

          return res.json({
            success: true,
            message: `Stock updated to ${newStock} via simulated webhook`,
          });
        }

        if (type === "order") {
          const contact = await prisma.contact.findFirst({ where: { organizationId: org.id } });
          if (!contact) throw new AppError("No contact found to simulate order", 404);

          const orderId = Date.now().toString();
          await ctx.createEventAndBroadcast({
            type: "ORDER_PLACED",
            metadata: { orderId, total: "149.50", source: "SIMULATED_WEBHOOK" },
            contactId: contact.id,
          });

          await prisma.webhookLog.create({
            data: {
              source: "SHOPIFY",
              topic: "orders/create",
              payload: JSON.stringify({
                id: orderId,
                total_price: "149.50",
                customer: { email: contact.email },
              }),
              processed: true,
              organizationId: org.id,
            },
          });

          return res.json({ success: true, message: "Order creation simulated via webhook" });
        }

        res.status(400).json({ error: "Invalid simulation type" });
      } catch (err) {
        next(err);
      }
    }
  );

  return router;
}
