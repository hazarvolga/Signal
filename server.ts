import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cron from "node-cron";

import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import { mjmlTemplates } from "./src/data/mjmlTemplates";
import { redisService } from "./src/services/redisService";
import passport from "passport";
import session, { type SessionData } from "express-session";
import { csrfProtectionMiddleware, generateToken } from "./src/middleware/csrf";
import { validateConfig } from "./src/lib/configValidator";
import { register, httpRequestDuration, httpRequestsTotal } from "./src/services/metrics";
import {
  instrumentQueueWorker,
  refreshOperationalMetrics,
} from "./src/services/operationalMetrics";
import { initSentry } from "./src/services/sentry";
import { requestIdMiddleware } from "./src/middleware/requestId";
import { hasValidMetricsCredential } from "./src/lib/metricsAuth";
import { normalizeWorkflowTemplateSeedData } from "./src/services/workflow/templateGraph";
import { dispatchOutboundWebhooks } from "./src/services/webhookDispatcher";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { prisma } from "./src/services/prisma";
import { Queue } from "bullmq";
import Redis from "ioredis";
import { Server } from "socket.io";
import http from "http";
import { TemplateEngine } from "./src/services/template/TemplateEngine";
import { logger } from "./src/services/logger";
import type { RouteContext } from "./src/routes/context";
import { errorHandler } from "./src/middleware/errorHandler";
import registerCampaignRoutes from "./src/routes/campaigns";
import registerContactRoutes from "./src/routes/contacts";
import registerTemplateRoutes from "./src/routes/templates";
import registerFlowRoutes from "./src/routes/flows";
import registerAuthRoutes from "./src/routes/auth";
import registerAdminRoutes from "./src/routes/admin";
import registerValidationRoutes from "./src/routes/validation";
import registerAiRoutes from "./src/routes/ai";
import registerComplianceRoutes from "./src/routes/compliance";
import registerIntegrationRoutes from "./src/routes/integrations";
import registerAssetRoutes from "./src/routes/assets";
import registerFormRoutes from "./src/routes/forms";
import registerGrowthRoutes from "./src/routes/growth";
import registerEmailRoutes from "./src/routes/email";
import {
  claimScheduledCampaigns,
  enqueueOrphanedDispatches,
  initializeCampaignDeliveryQueue,
} from "./src/services/email/deliveryQueue";
import { createEmailDeliveryWorker } from "./src/workers/emailDeliveryWorker";
import { initializeReferralVerificationQueue } from "./src/services/email/referralVerificationQueue";
import { createReferralVerificationWorker } from "./src/workers/referralVerificationWorker";
import { refreshSegment } from "./src/lib/segmentRefresh";
import { dataRequestQueue } from "./src/services/compliance/dataRequestQueue";
import { dataRequestWorker } from "./src/workers/dataRequestWorker";
import { hasApiKeyScope, type ApiKeyScope } from "./src/lib/apiKeyScopes";
import { startWorkflowRuntime } from "./src/workers/workflowWorker";
import { enqueueWorkflowEvent, getWorkflowQueue } from "./src/services/workflow/queue";

initSentry();

const redisConnection = process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,
      retryStrategy(times) {
        if (times > 3) return null;
        return Math.min(times * 100, 3000);
      },
    })
  : null;

if (redisConnection) {
  redisConnection.on("error", (err: any) => {
    if (err.code === "ECONNREFUSED") {
      logger.warn("Redis connection refused. Bulk validation features will be disabled.");
    }
  });
}

class IORedisSessionStore extends session.Store {
  private readonly prefix = "signal:sess:";

  constructor(
    private readonly client: Redis,
    private readonly defaultTtlSeconds = 24 * 60 * 60
  ) {
    super();
  }

  get(sid: string, callback: (err?: unknown, session?: SessionData | null) => void): void {
    this.client
      .get(`${this.prefix}${sid}`)
      .then((value) => callback(undefined, value ? JSON.parse(value) : null))
      .catch((error) => callback(error));
  }

  set(sid: string, value: SessionData, callback?: (err?: unknown) => void): void {
    const maxAgeMs = value.cookie?.maxAge;
    const ttlSeconds =
      typeof maxAgeMs === "number"
        ? Math.max(1, Math.ceil(maxAgeMs / 1000))
        : this.defaultTtlSeconds;

    this.client
      .set(`${this.prefix}${sid}`, JSON.stringify(value), "EX", ttlSeconds)
      .then(() => callback?.())
      .catch((error) => callback?.(error));
  }

  destroy(sid: string, callback?: (err?: unknown) => void): void {
    this.client
      .del(`${this.prefix}${sid}`)
      .then(() => callback?.())
      .catch((error) => callback?.(error));
  }

  touch(sid: string, value: SessionData, callback?: (err?: unknown) => void): void {
    const maxAgeMs = value.cookie?.maxAge;
    const ttlSeconds =
      typeof maxAgeMs === "number"
        ? Math.max(1, Math.ceil(maxAgeMs / 1000))
        : this.defaultTtlSeconds;

    this.client
      .expire(`${this.prefix}${sid}`, ttlSeconds)
      .then(() => callback?.())
      .catch((error) => callback?.(error));
  }
}

const validationQueue = redisConnection
  ? new Queue("bulk-validation", { connection: redisConnection as any })
  : null;
const campaignDeliveryQueue = redisConnection
  ? initializeCampaignDeliveryQueue(redisConnection)
  : null;
const emailDeliveryWorker = redisConnection ? createEmailDeliveryWorker(redisConnection) : null;
const referralVerificationQueue = redisConnection
  ? initializeReferralVerificationQueue(redisConnection)
  : null;
const referralVerificationWorker = redisConnection
  ? createReferralVerificationWorker(redisConnection)
  : null;
const workflowWorker = redisConnection ? startWorkflowRuntime(redisConnection) : null;
const workflowQueue = redisConnection ? getWorkflowQueue() : null;

instrumentQueueWorker(emailDeliveryWorker, "campaign-delivery");
instrumentQueueWorker(workflowWorker, "workflow-execution");
instrumentQueueWorker(dataRequestWorker, "data-requests");

import "./src/workers/validationWorker";

export let app: express.Express;
export let httpServer: http.Server;

async function seed() {
  let org = await prisma.organization.findFirst();

  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: "SIGNAL Editorial",
        slug: "signal",
        address: "123 Broadcast Ave, News City",
      },
    });
    await prisma.user.create({
      data: {
        email: "admin@signal.app",
        name: "Editor in Chief",
        role: "OWNER",
        status: "ACTIVE",
        organizationId: org.id,
      },
    });
  }

  // Seed MJML Templates if none exist
  const templateCount = await prisma.template.count({ where: { organizationId: org.id } });
  if (templateCount === 0) {
    console.log("Seeding MJML templates...");
    for (const t of mjmlTemplates) {
      await prisma.template.create({
        data: {
          name: t.name,
          category: t.category,
          content: t.content,
          organizationId: org.id,
        },
      });
    }
    console.log(`Seeded ${mjmlTemplates.length} templates.`);
  }

  const contactCount = await prisma.contact.count();
  if (contactCount === 0) {
    await prisma.contact.createMany({
      data: [
        {
          email: "reader1@example.com",
          firstName: "Julian",
          lastName: "Barnes",
          organizationId: org.id,
          engagementScore: 85,
          status: "SUBSCRIBED",
        },
        {
          email: "reader2@example.com",
          firstName: "Zadie",
          lastName: "Smith",
          organizationId: org.id,
          engagementScore: 92,
          status: "SUBSCRIBED",
        },
        {
          email: "reader3@example.com",
          firstName: "Kazuo",
          lastName: "Ishiguro",
          organizationId: org.id,
          engagementScore: 45,
          status: "SUBSCRIBED",
        },
        {
          email: "reader4@example.com",
          firstName: "Elena",
          lastName: "Ferrante",
          organizationId: org.id,
          engagementScore: 78,
          status: "SUBSCRIBED",
        },
      ],
    });
    console.log("Seeded initial contacts.");
  }

  const productCount = await prisma.product.count();
  if (productCount === 0) {
    await prisma.product.createMany({
      data: [
        {
          name: "SIGNAL Editorial Tote",
          price: 25.0,
          source: "SHOPIFY",
          externalId: "sh_1",
          organizationId: org.id,
        },
        {
          name: "Annual Subscription",
          price: 120.0,
          source: "CUSTOM",
          externalId: "sub_1",
          organizationId: org.id,
        },
        {
          name: "Limited Edition Print",
          price: 45.0,
          source: "WOOCOMMERCE",
          externalId: "woo_1",
          organizationId: org.id,
        },
      ],
    });
    console.log("Seeded initial products.");
  }

  const brandCount = await prisma.brand.count();
  if (brandCount === 0) {
    await prisma.brand.create({
      data: {
        name: "SIGNAL Main",
        primaryColor: "#800020",
        secondaryColor: "#141414",
        fontFamily: "Inter",
        organizationId: org.id,
      },
    });
    console.log("Seeded initial brand.");
  }

  const integrationCount = await prisma.integration.count();
  if (integrationCount === 0) {
    await prisma.integration.create({
      data: {
        type: "SHOPIFY",
        status: "CONNECTED",
        organizationId: org.id,
      },
    });
    console.log("Seeded initial integration.");
  }

  const revenueCount = await prisma.revenue.count();
  if (revenueCount === 0) {
    const contact = await prisma.contact.findFirst();
    if (contact) {
      await prisma.revenue.createMany({
        data: [
          { amount: 25.0, contactId: contact.id, organizationId: org.id },
          { amount: 120.0, contactId: contact.id, organizationId: org.id },
          { amount: 45.0, contactId: contact.id, organizationId: org.id },
        ],
      });
      console.log("Seeded initial revenue.");
    }
  }

  const workflowTemplateCount = await prisma.workflowTemplate.count();
  if (workflowTemplateCount < 30) {
    // Clear existing to avoid duplicates if we are re-seeding
    await prisma.workflowTemplate.deleteMany({});
    await prisma.workflowTemplate.createMany({
      data: normalizeWorkflowTemplateSeedData([
        // Onboarding & Activation
        {
          name: "Welcome Sequence",
          description: "Automated welcome series for new signups + dashboard walkthrough.",
          category: "ONBOARDING",
          nodes: JSON.stringify([
            {
              id: "1",
              type: "custom",
              position: { x: 100, y: 100 },
              data: {
                label: "User Signed Up",
                type: "Trigger",
                icon: "Zap",
                color: "bg-burgundy/10 text-burgundy",
              },
            },
          ]),
          edges: "[]",
        },
        {
          name: "Product First Use Guide",
          description: "Step-by-step guide for first-time product usage via email or in-app.",
          category: "ONBOARDING",
          nodes: JSON.stringify([
            {
              id: "1",
              type: "custom",
              position: { x: 100, y: 100 },
              data: {
                label: "First Login",
                type: "Trigger",
                icon: "Zap",
                color: "bg-burgundy/10 text-burgundy",
              },
            },
          ]),
          edges: "[]",
        },
        {
          name: "Account Verification Reminder",
          description: "Automated reminder for users who haven't verified their account.",
          category: "ONBOARDING",
          nodes: JSON.stringify([
            { id: "1", type: "trigger", data: { label: "Verification Pending" } },
          ]),
          edges: "[]",
        },
        {
          name: "Profile Completion Nudge",
          description: "Encourage users to fill out missing profile fields.",
          category: "ONBOARDING",
          nodes: JSON.stringify([
            { id: "1", type: "trigger", data: { label: "Profile Incomplete" } },
          ]),
          edges: "[]",
        },
        {
          name: "First Feature Adoption",
          description: "Triggered when a core feature hasn't been used within the first week.",
          category: "ONBOARDING",
          nodes: JSON.stringify([
            { id: "1", type: "trigger", data: { label: "Feature Not Used" } },
          ]),
          edges: "[]",
        },
        // Engagement & Retention
        {
          name: "7-Day Inactivity Reminder",
          description: "Re-engage users who haven't logged in for 7 days.",
          category: "ENGAGEMENT",
          nodes: JSON.stringify([
            { id: "1", type: "trigger", data: { label: "Inactivity: 7 Days" } },
          ]),
          edges: "[]",
        },
        {
          name: "14-Day Inactivity Reminder",
          description: "Re-engage users who haven't logged in for 14 days.",
          category: "ENGAGEMENT",
          nodes: JSON.stringify([
            { id: "1", type: "trigger", data: { label: "Inactivity: 14 Days" } },
          ]),
          edges: "[]",
        },
        {
          name: "30-Day Inactivity Reminder",
          description: "Re-engage users who haven't logged in for 30 days.",
          category: "ENGAGEMENT",
          nodes: JSON.stringify([
            { id: "1", type: "trigger", data: { label: "Inactivity: 30 Days" } },
          ]),
          edges: "[]",
        },
        {
          name: "Content Consumption Follow-Up",
          description: "Follow up with users who didn't finish a webinar or course.",
          category: "ENGAGEMENT",
          nodes: JSON.stringify([
            { id: "1", type: "trigger", data: { label: "Content Partially Consumed" } },
          ]),
          edges: "[]",
        },
        {
          name: "Feature Adoption Encouragement",
          description: "Personalized usage tips for underutilized features.",
          category: "ENGAGEMENT",
          nodes: JSON.stringify([
            { id: "1", type: "trigger", data: { label: "Feature Adoption Opportunity" } },
          ]),
          edges: "[]",
        },
        {
          name: "Weekly Engagement Digest",
          description: "Automated summary of user activity and insights.",
          category: "ENGAGEMENT",
          nodes: JSON.stringify([{ id: "1", type: "trigger", data: { label: "Weekly Schedule" } }]),
          edges: "[]",
        },
        {
          name: "Re-engagement Campaign",
          description: "Win back long-term inactive users with special offers.",
          category: "ENGAGEMENT",
          nodes: JSON.stringify([
            { id: "1", type: "trigger", data: { label: "Dormant User Detected" } },
          ]),
          edges: "[]",
        },
        // Revenue & Upsell
        {
          name: "Trial Expiration Alert",
          description: "Notify users before their trial ends with an upgrade offer.",
          category: "REVENUE",
          nodes: JSON.stringify([{ id: "1", type: "trigger", data: { label: "Trial Ends Soon" } }]),
          edges: "[]",
        },
        {
          name: "Payment Failure Retry Sequence",
          description: "Automated support and retry flow for failed payments.",
          category: "REVENUE",
          nodes: JSON.stringify([{ id: "1", type: "trigger", data: { label: "Payment Failed" } }]),
          edges: "[]",
        },
        {
          name: "Cross-Sell Recommendation",
          description: "Suggest products based on user purchase history.",
          category: "REVENUE",
          nodes: JSON.stringify([
            { id: "1", type: "trigger", data: { label: "Purchase Completed" } },
          ]),
          edges: "[]",
        },
        {
          name: "Upsell / Upgrade Flow",
          description: "Targeted offers for higher-tier plans based on usage.",
          category: "REVENUE",
          nodes: JSON.stringify([
            { id: "1", type: "trigger", data: { label: "Usage Threshold Reached" } },
          ]),
          edges: "[]",
        },
        {
          name: "Subscription Renewal Reminder",
          description: "Remind users of upcoming subscription renewals.",
          category: "REVENUE",
          nodes: JSON.stringify([
            { id: "1", type: "trigger", data: { label: "Renewal in 7 Days" } },
          ]),
          edges: "[]",
        },
        // Customer Support & Feedback
        {
          name: "Support Ticket Follow-Up",
          description: "Automated follow-up for new or delayed support tickets.",
          category: "SUPPORT",
          nodes: JSON.stringify([{ id: "1", type: "trigger", data: { label: "Ticket Created" } }]),
          edges: "[]",
        },
        {
          name: "Post-Support Survey",
          description: "Collect NPS or satisfaction feedback after support resolution.",
          category: "SUPPORT",
          nodes: JSON.stringify([{ id: "1", type: "trigger", data: { label: "Ticket Resolved" } }]),
          edges: "[]",
        },
        {
          name: "Churn Prevention Win-Back",
          description: "Special offers for users who cancelled their subscription.",
          category: "SUPPORT",
          nodes: JSON.stringify([
            { id: "1", type: "trigger", data: { label: "Subscription Cancelled" } },
          ]),
          edges: "[]",
        },
        {
          name: "Feature Feedback Request",
          description: "Ask for feedback after a user uses a specific feature.",
          category: "SUPPORT",
          nodes: JSON.stringify([{ id: "1", type: "trigger", data: { label: "Feature Used" } }]),
          edges: "[]",
        },
        {
          name: "Service Announcement Alerts",
          description: "Automated alerts for maintenance or critical updates.",
          category: "SUPPORT",
          nodes: JSON.stringify([
            { id: "1", type: "trigger", data: { label: "System Announcement" } },
          ]),
          edges: "[]",
        },
        // Event-Driven
        {
          name: "Abandoned Cart Reminder",
          description: "Recover lost sales with automated cart reminders.",
          category: "EVENT_DRIVEN",
          nodes: JSON.stringify([{ id: "1", type: "trigger", data: { label: "Cart Abandoned" } }]),
          edges: "[]",
        },
        {
          name: "Event Registration Confirmation",
          description: "Onboarding and reminders for webinar/event signups.",
          category: "EVENT_DRIVEN",
          nodes: JSON.stringify([
            { id: "1", type: "trigger", data: { label: "Event Registered" } },
          ]),
          edges: "[]",
        },
        {
          name: "Milestone Achievement",
          description: "Celebrate user successes and usage milestones.",
          category: "EVENT_DRIVEN",
          nodes: JSON.stringify([
            { id: "1", type: "trigger", data: { label: "Milestone Reached" } },
          ]),
          edges: "[]",
        },
        {
          name: "Custom Trigger Event",
          description: "Automation based on custom user behavior events.",
          category: "EVENT_DRIVEN",
          nodes: JSON.stringify([
            { id: "1", type: "trigger", data: { label: "Custom Event Fired" } },
          ]),
          edges: "[]",
        },
        {
          name: "Birthday / Anniversary Email",
          description: "Personalized greetings for special user dates.",
          category: "EVENT_DRIVEN",
          nodes: JSON.stringify([{ id: "1", type: "trigger", data: { label: "Special Date" } }]),
          edges: "[]",
        },
        // AI Powered
        {
          name: "Predictive Churn Prevention",
          description: "AI-powered detection of users likely to churn.",
          category: "AI_POWERED",
          nodes: JSON.stringify([
            { id: "1", type: "trigger", data: { label: "AI: High Churn Risk" } },
          ]),
          edges: "[]",
        },
        {
          name: "AI Subject Line Optimization",
          description: "Automatically optimize email subject lines using AI.",
          category: "AI_POWERED",
          nodes: JSON.stringify([
            { id: "1", type: "trigger", data: { label: "Campaign Started" } },
          ]),
          edges: "[]",
        },
        {
          name: "Send-Time Personalization",
          description: "Deliver emails at the optimal time for each user.",
          category: "AI_POWERED",
          nodes: JSON.stringify([
            { id: "1", type: "trigger", data: { label: "AI: Optimal Time Window" } },
          ]),
          edges: "[]",
        },
        {
          name: "Content Personalization Flow",
          description: "AI-driven content selection based on user interests.",
          category: "AI_POWERED",
          nodes: JSON.stringify([
            { id: "1", type: "trigger", data: { label: "User Interest Detected" } },
          ]),
          edges: "[]",
        },
        {
          name: "Engagement Score Automation",
          description: "Branch workflows based on AI engagement scores.",
          category: "AI_POWERED",
          nodes: JSON.stringify([
            { id: "1", type: "trigger", data: { label: "Score Threshold Reached" } },
          ]),
          edges: "[]",
        },
      ]),
    });
    console.log("Seeded expanded workflow templates.");
  }

  // Seed Consent Logs and Data Requests
  const consentLogCount = await prisma.consentLog.count();
  if (consentLogCount === 0) {
    const contact = await prisma.contact.findFirst();
    if (contact) {
      await prisma.consentLog.createMany({
        data: [
          {
            contactId: contact.id,
            action: "SUBSCRIBE",
            source: "FORM",
            ipAddress: "192.168.1.1",
            organizationId: org.id,
          },
          {
            contactId: contact.id,
            action: "PREFERENCE_UPDATE",
            source: "PREFERENCE_CENTER",
            ipAddress: "192.168.1.1",
            organizationId: org.id,
          },
        ],
      });
      console.log("Seeded initial consent logs.");
    }
  }

  const dataRequestCount = await prisma.dataRequest.count();
  if (dataRequestCount === 0) {
    const contact = await prisma.contact.findFirst();
    if (contact) {
      await prisma.dataRequest.createMany({
        data: [
          { contactId: contact.id, type: "EXPORT", status: "COMPLETED", organizationId: org.id },
          { contactId: contact.id, type: "DELETE", status: "PENDING", organizationId: org.id },
        ],
      });
      console.log("Seeded initial data requests.");
    }
  }

  // Seed Approval Requests
  const approvalCount = await prisma.approvalRequest.count();
  if (approvalCount === 0) {
    const campaign = await prisma.campaign.create({
      data: {
        name: "Q1 Newsletter",
        subject: "Our latest updates",
        fromName: "SIGNAL",
        fromEmail: "news@signal.app",
        status: "IN_REVIEW",
        organizationId: org.id,
      },
    });

    await prisma.approvalRequest.create({
      data: {
        campaignId: campaign.id,
        requesterId: "Editor in Chief",
        status: "PENDING",
        comments: "Please review the new layout.",
      },
    });
    console.log("Seeded initial approval request.");
  }
}

export async function createApp() {
  if (process.env.NODE_ENV !== "production") {
    try {
      await seed();
    } catch (err) {
      console.error("Database seeding failed. Ensure DATABASE_URL is correct.", err);
      logger.error({ err }, "Database seeding failed");
    }
  }

  app = express();
  httpServer = http.createServer(app);

  const APP_URL = process.env.APP_URL || "http://localhost:3000";
  const ALLOWED_ORIGINS = process.env.APP_URL
    ? [process.env.APP_URL]
    : ["http://localhost:3000", "http://localhost:5173"];

  const isDev = process.env.NODE_ENV !== "production";

  if (!isDev) {
    app.set("trust proxy", 1);
  }

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: isDev ? ["'self'", "'unsafe-inline'", "'unsafe-eval'"] : ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
          imgSrc: [
            "'self'",
            "data:",
            "https:",
            "blob:",
            "https://cdn.tailwindcss.com",
            "https://fonts.googleapis.com",
          ],
          connectSrc: ["'self'", APP_URL],
          frameAncestors: ["'self'"],
          formAction: ["'self'"],
          baseUri: ["'self'"],
          objectSrc: ["'none'"],
        },
      },
    })
  );

  // Allow embed in iframes for public forms and landing pages (/f/*)
  app.use((req, res, next) => {
    if (req.path.startsWith("/f/")) {
      res.removeHeader("X-Frame-Options");
      const csp = res.getHeader("Content-Security-Policy");
      if (typeof csp === "string") {
        res.setHeader(
          "Content-Security-Policy",
          csp.replace(/frame-ancestors\s+[^;]+;?/, "frame-ancestors 'self' *;")
        );
      }
    }
    next();
  });

  app.use(
    cors({
      origin: ALLOWED_ORIGINS,
      credentials: true,
      methods: ["GET", "POST", "PATCH", "DELETE", "PUT"],
    })
  );

  const io = new Server(httpServer, {
    cors: {
      origin: ALLOWED_ORIGINS,
      methods: ["GET", "POST"],
    },
  });

  const roomUsers = new Map<string, Map<string, any>>();

  async function createEventAndBroadcast(data: {
    type: string;
    contactId: string;
    campaignId?: string;
    variationId?: string;
    metadata?: any;
  }) {
    const event = await prisma.event.create({
      data: {
        type: data.type,
        contactId: data.contactId,
        campaignId: data.campaignId,
        variationId: data.variationId,
        metadata: data.metadata ? JSON.stringify(data.metadata) : "{}",
      },
      include: { contact: true },
    });

    io.to(`${event.contact.organizationId}:dashboard-live`).emit("live-activity", {
      id: event.id,
      type: event.type,
      contactName: event.contact
        ? `${event.contact.firstName} ${event.contact.lastName}`
        : "Unknown",
      timestamp: event.timestamp,
      metadata: data.metadata || {},
    });

    if (redisConnection) {
      void enqueueWorkflowEvent({
        eventId: event.id,
        organizationId: event.contact.organizationId,
        contactId: event.contactId,
        eventType: event.type,
        eventName:
          data.metadata && typeof data.metadata.name === "string" ? data.metadata.name : undefined,
        metadata: data.metadata && typeof data.metadata === "object" ? data.metadata : undefined,
      }).catch((error) => {
        logger.error({ error, eventId: event.id }, "Failed to enqueue workflow event");
      });
    }

    // Dispatch outbound tenant webhooks with HMAC-SHA256 signature
    void dispatchOutboundWebhooks({
      topic: event.type,
      organizationId: event.contact.organizationId,
      data: {
        eventId: event.id,
        contactId: event.contactId,
        campaignId: event.campaignId,
        variationId: event.variationId,
        metadata: data.metadata || {},
        contact: {
          email: event.contact?.email,
          firstName: event.contact?.firstName,
          lastName: event.contact?.lastName,
          phone: event.contact?.phone,
        },
      },
    }).catch((error) => {
      logger.error({ error, eventId: event.id }, "Failed to dispatch outbound webhooks");
    });

    return event;
  }

  io.on("connection", (socket) => {
    let socketWindowStartedAt = Date.now();
    let socketEventCount = 0;
    const allowedCollaborationRooms = new Set(["dashboard-live", "collaboration-hub"]);
    const scopedRoom = (roomId: unknown): string | null => {
      if (typeof roomId !== "string" || !allowedCollaborationRooms.has(roomId)) {
        return null;
      }
      return `${socket.data.organizationId}:${roomId}`;
    };

    socket.use(([event, payload], next) => {
      const now = Date.now();
      if (now - socketWindowStartedAt >= 10_000) {
        socketWindowStartedAt = now;
        socketEventCount = 0;
      }
      socketEventCount += 1;
      if (socketEventCount > 200) return next(new Error("Socket rate limit exceeded"));
      if (
        typeof event !== "string" ||
        event.length > 100 ||
        Buffer.byteLength(JSON.stringify(payload ?? null), "utf8") > 16_384
      ) {
        return next(new Error("Invalid socket payload"));
      }
      next();
    });

    socket.on("join-room", ({ roomId }) => {
      const scopedRoomId = scopedRoom(roomId);
      if (!scopedRoomId) return;
      socket.join(scopedRoomId);
      if (!roomUsers.has(scopedRoomId)) {
        roomUsers.set(scopedRoomId, new Map());
      }
      roomUsers.get(scopedRoomId)!.set(socket.id, socket.data.user);

      io.to(scopedRoomId).emit("room-users", Array.from(roomUsers.get(scopedRoomId)!.values()));
    });

    socket.on("cursor-move", ({ roomId, position }) => {
      const scopedRoomId = scopedRoom(roomId);
      if (
        !scopedRoomId ||
        !socket.rooms.has(scopedRoomId) ||
        !position ||
        !Number.isFinite(position.x) ||
        !Number.isFinite(position.y) ||
        Math.abs(position.x) > 1_000_000 ||
        Math.abs(position.y) > 1_000_000
      ) {
        return;
      }
      const user = roomUsers.get(scopedRoomId)?.get(socket.id);
      socket.to(scopedRoomId).emit("user-cursor-move", { socketId: socket.id, position, user });
    });

    socket.on("activity", ({ roomId, activity }) => {
      const scopedRoomId = scopedRoom(roomId);
      if (
        !scopedRoomId ||
        !socket.rooms.has(scopedRoomId) ||
        typeof activity !== "string" ||
        activity.length === 0 ||
        activity.length > 500
      ) {
        return;
      }
      const user = roomUsers.get(scopedRoomId)?.get(socket.id);
      io.to(scopedRoomId).emit("user-activity", { socketId: socket.id, activity, user });
    });

    socket.on("leave-room", ({ roomId }) => {
      const scopedRoomId = scopedRoom(roomId);
      if (!scopedRoomId || !socket.rooms.has(scopedRoomId)) return;
      socket.leave(scopedRoomId);
      roomUsers.get(scopedRoomId)?.delete(socket.id);
      io.to(scopedRoomId).emit(
        "room-users",
        Array.from(roomUsers.get(scopedRoomId)?.values() || [])
      );
    });

    socket.on("disconnecting", () => {
      for (const roomId of socket.rooms) {
        if (roomUsers.has(roomId)) {
          roomUsers.get(roomId)!.delete(socket.id);
          io.to(roomId).emit("room-users", Array.from(roomUsers.get(roomId)!.values()));
        }
      }
    });
  });

  // BUG-010 FIX: Removed duplicate express.json() — single registration below at L822 with 10mb limit

  app.use((req, res, next) => {
    const end = httpRequestDuration.startTimer({ method: req.method, route: req.path });
    res.on("finish", () => {
      const status = res.statusCode.toString();
      end({ method: req.method, route: req.path, status });
      httpRequestsTotal.inc({ method: req.method, route: req.path, status });
    });
    next();
  });

  // GAP-008 FIX: Restrict /metrics to localhost or internal network only
  app.get("/metrics", async (req, res) => {
    const remoteIp = req.ip || req.socket.remoteAddress || "";
    const isLocalAddress =
      remoteIp === "127.0.0.1" || remoteIp === "::1" || remoteIp === "::ffff:127.0.0.1";
    const hasValidMetricsToken = hasValidMetricsCredential(req.headers, process.env.METRICS_TOKEN);
    const isLocal = isLocalAddress || hasValidMetricsToken;

    if (!isLocal && process.env.NODE_ENV === "production") {
      return res.status(403).json({ error: "Metrics access restricted" });
    }
    await refreshOperationalMetrics(
      redisConnection,
      [validationQueue, campaignDeliveryQueue, workflowQueue, dataRequestQueue].filter(
        (queue): queue is Queue => queue !== null
      )
    );
    res.set("Content-Type", register.contentType);
    res.send(await register.metrics());
  });

  app.use(requestIdMiddleware);

  app.use(
    express.json({
      limit: "10mb",
      verify(req, _res, buffer) {
        (req as express.Request & { rawBody?: Buffer }).rawBody = Buffer.from(buffer);
      },
    })
  );
  app.use(express.urlencoded({ extended: false, limit: "1mb" }));
  app.use(cookieParser());

  // Initialize Template Engine
  const templateEngine = new TemplateEngine(redisConnection || undefined);
  if (process.env.NODE_ENV === "production" && !process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET must be set in production. Generate a random 64-char string.");
  }
  const sessionSecret =
    process.env.SESSION_SECRET ||
    (process.env.NODE_ENV !== "production" ? crypto.randomBytes(64).toString("hex") : undefined);

  if (process.env.NODE_ENV === "production" && !redisConnection) {
    throw new Error("REDIS_URL must be set in production for the session store.");
  }

  if (process.env.NODE_ENV === "production" && redisConnection) {
    try {
      await redisConnection.ping();
    } catch (error) {
      throw new Error("Redis session store is unavailable in production.", { cause: error });
    }
  }

  const sessionStore = redisConnection ? new IORedisSessionStore(redisConnection) : undefined;

  const cookieConfig = {
    secure:
      process.env.COOKIE_SECURE !== undefined
        ? process.env.COOKIE_SECURE === "true"
        : process.env.NODE_ENV === "production" &&
          (process.env.APP_URL?.startsWith("https://") ?? false),
    sameSite: "lax" as const,
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
  };

  const sessionMiddleware = session({
    name: "signal.sid",
    secret: sessionSecret!,
    store: sessionStore,
    proxy: process.env.NODE_ENV === "production",
    resave: false,
    saveUninitialized: false,
    cookie: cookieConfig,
  });
  app.use(sessionMiddleware);
  io.engine.use(sessionMiddleware as any);
  io.use(async (socket, next) => {
    try {
      const userId = (socket.request as any).session?.passport?.user;
      if (!userId) return next(new Error("Authentication required"));
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          organizationId: true,
        },
      });
      if (!user || user.status !== "ACTIVE") return next(new Error("Authentication required"));
      socket.data.user = user;
      socket.data.organizationId = user.organizationId;
      next();
    } catch (error) {
      next(error instanceof Error ? error : new Error("Socket authentication failed"));
    }
  });

  app.use(passport.initialize());
  app.use(passport.session());

  app.get("/api/csrf-token", (req, res) => {
    (req.session as any).csrfInitialized = true;
    res.json({ csrfToken: generateToken(req, res) });
  });

  app.use(csrfProtectionMiddleware);

  passport.serializeUser((user: any, done) => done(null, user.id));
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await prisma.user.findUnique({ where: { id } });
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // Rate limiting: general API endpoints
  const apiRateLimitMax = Number(process.env.API_RATE_LIMIT_MAX || 200);
  if (!Number.isInteger(apiRateLimitMax) || apiRateLimitMax < 1) {
    throw new Error("API_RATE_LIMIT_MAX must be a positive integer");
  }
  const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: apiRateLimitMax,
    skip: (req) =>
      req.path.startsWith("/email/track/") ||
      req.path === "/webhooks/ses" ||
      req.path === "/webhooks/shopify" ||
      req.path === "/health",
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests, please try again later." },
  });

  const providerEventLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10_000,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Provider event rate limit exceeded." },
  });

  // Apply rate limiters
  app.use("/api/", apiLimiter);
  app.use("/api/email/track", providerEventLimiter);
  app.use("/api/webhooks/ses", providerEventLimiter);
  app.use("/api/webhooks/shopify", providerEventLimiter);

  app.use((req, res, next) => {
    res.on("finish", () => {
      const organizationId =
        (req.user as any)?.organizationId || (req as any).organization?.id || null;
      if (
        ["POST", "PUT", "PATCH", "DELETE"].includes(req.method) &&
        res.statusCode < 400 &&
        organizationId
      ) {
        const action = `${req.method} ${req.path}`;
        const userId = (req.user as any)?.id || "system";
        prisma.auditLog
          .create({
            data: {
              action,
              entityType: req.path.split("/")[2] || "unknown",
              entityId: (req.params as any).id || "bulk",
              userId,
              organizationId,
            },
          })
          .catch((err) => logger.error({ err, action }, "SOC2 audit log write failed"));
      }
    });
    next();
  });

  // --- Public API Gateway & Rate Limiting ---
  const publicApiGateway = async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    const apiKeyHeader = req.headers["x-api-key"] as string;
    if (!apiKeyHeader) return res.status(401).json({ error: "API key required" });

    const keyHash = crypto.createHash("sha256").update(apiKeyHeader).digest("hex");

    const key = await prisma.apiKey.findUnique({
      where: { key: keyHash },
      include: { organization: true },
    });

    if (!key) return res.status(401).json({ error: "Invalid API key" });

    // Rate Limiting
    const { allowed, remaining, reset } = await redisService.rateLimit(
      `ratelimit:api:${key.id}`,
      100,
      60
    ); // 100 req/min
    res.setHeader("X-RateLimit-Remaining", remaining);
    res.setHeader("X-RateLimit-Reset", reset);

    if (!allowed) {
      return res.status(429).json({ error: "Rate limit exceeded" });
    }

    // Attach org to request
    (req as any).organization = key.organization;
    (req as any).apiKey = key;

    // Update last used
    prisma.apiKey
      .update({
        where: { id: key.id },
        data: { lastUsedAt: new Date() },
      })
      .catch(() => {});

    next();
  };

  // --- Public API V1 Routes ---
  const publicRouter = express.Router();
  publicRouter.use(publicApiGateway);
  const requireApiKeyScope =
    (scope: ApiKeyScope) =>
    (req: express.Request, res: express.Response, next: express.NextFunction) => {
      const key = (req as any).apiKey as { scopes: string } | undefined;
      if (!key || !hasApiKeyScope(key.scopes, scope)) {
        return res.status(403).json({ error: "API key scope is insufficient" });
      }
      next();
    };

  publicRouter.get("/contacts", requireApiKeyScope("contacts:read"), async (req, res) => {
    const org = (req as any).organization;
    const cacheKey = `api:contacts:${org.id}`;

    const cached = await redisService.get<any[]>(cacheKey);
    if (cached) return res.json(cached);

    const contacts = await prisma.contact.findMany({
      where: { organizationId: org.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
        emailConsent: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    await redisService.set(cacheKey, contacts, 300); // Cache for 5 mins
    res.json(contacts);
  });

  publicRouter.post("/contacts", requireApiKeyScope("contacts:write"), async (req, res) => {
    const org = (req as any).organization;
    const { email, firstName, lastName } = req.body;
    const contact = await prisma.contact.upsert({
      where: { email_organizationId: { email, organizationId: org.id } },
      update: { firstName, lastName },
      create: {
        email,
        firstName,
        lastName,
        organizationId: org.id,
        emailConsent: false,
        status: "UNSUBSCRIBED",
        preferenceToken: crypto.randomBytes(32).toString("base64url"),
      },
    });

    // Invalidate cache
    await redisService.del(`api:contacts:${org.id}`);

    res.json(contact);
  });

  publicRouter.get("/campaigns", requireApiKeyScope("campaigns:read"), async (req, res) => {
    const org = (req as any).organization;
    const cacheKey = `api:campaigns:${org.id}`;

    const cached = await redisService.get<any[]>(cacheKey);
    if (cached) return res.json(cached);

    const campaigns = await prisma.campaign.findMany({ where: { organizationId: org.id } });
    await redisService.set(cacheKey, campaigns, 300);
    res.json(campaigns);
  });

  publicRouter.get("/templates", requireApiKeyScope("templates:read"), async (req, res) => {
    const org = (req as any).organization;
    const templates = await prisma.template.findMany({ where: { organizationId: org.id } });
    res.json(templates);
  });

  publicRouter.get("/segments", requireApiKeyScope("segments:read"), async (req, res) => {
    const org = (req as any).organization;
    const segments = await prisma.segment.findMany({ where: { organizationId: org.id } });
    res.json(segments);
  });

  publicRouter.get("/docs", (req, res) => {
    res.json({
      version: "v1",
      baseUrl: "/api/v1",
      endpoints: [
        { path: "/contacts", methods: ["GET", "POST"], description: "Manage audience contacts" },
        { path: "/campaigns", methods: ["GET"], description: "List all email campaigns" },
        { path: "/templates", methods: ["GET"], description: "Retrieve MJML email templates" },
        { path: "/segments", methods: ["GET"], description: "List audience segments" },
      ],
      authentication: {
        header: "x-api-key",
        type: "Bearer-like API Key",
      },
      rateLimit: "100 requests per minute",
    });
  });

  app.use("/api/v1", publicRouter);

  app.get("/api/v1/documentation", (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>SIGNAL Public API Documentation</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <link href="https://fonts.googleapis.com/css2?family=Libre+Franklin:wght@400;600;800&family=JetBrains+Mono&family=Playfair+Display:ital,wght@0,900;1,900&display=swap" rel="stylesheet">
          <style>
              body { font-family: 'Libre Franklin', sans-serif; background-color: #F5F2EC; color: #1A1814; }
              .serif { font-family: 'Playfair Display', serif; }
              .mono { font-family: 'JetBrains Mono', monospace; }
              .endpoint-card { background: white; border: 1px solid #1A1814; }
              .method-tag { font-size: 10px; font-weight: 800; text-transform: uppercase; padding: 2px 6px; border: 1px solid currentColor; }
          </style>
      </head>
      <body class="p-8 md:p-16 max-w-5xl mx-auto">
          <header class="mb-16 border-b border-black/10 pb-8">
              <div class="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#8B1A1A] mb-4">Developer Portal</div>
              <h1 class="serif text-6xl md:text-8xl mb-6">Public API <span class="italic font-normal">v1</span></h1>
              <p class="text-xl text-black/60 max-w-2xl">Integrate SIGNAL's enterprise-grade marketing automation into your own applications. Secure, scalable, and built for developers.</p>
          </header>

          <section class="mb-16">
              <h2 class="text-sm font-extrabold uppercase tracking-widest mb-8 border-b border-[#8B1A1A]/20 pb-2">Authentication</h2>
              <div class="endpoint-card p-8">
                  <p class="mb-4">All requests must include your API key in the <code class="mono bg-black/5 px-2 py-1 rounded text-sm">x-api-key</code> header.</p>
                  <div class="mono bg-[#1A1814] text-white p-4 text-sm overflow-x-auto">
                      curl -H "x-api-key: YOUR_API_KEY" https://signal.app/api/v1/contacts
                  </div>
              </div>
          </section>

          <section class="mb-16">
              <h2 class="text-sm font-extrabold uppercase tracking-widest mb-8 border-b border-[#8B1A1A]/20 pb-2">Endpoints</h2>
              <div class="space-y-6">
                  <!-- Contacts -->
                  <div class="endpoint-card p-8">
                      <div class="flex items-center gap-4 mb-4">
                          <span class="method-tag text-emerald-700">GET</span>
                          <code class="mono font-bold">/contacts</code>
                      </div>
                      <p class="text-sm text-black/60 mb-6">Retrieve a list of all contacts in your organization.</p>
                      <div class="text-[10px] font-bold uppercase text-black/40 mb-2">Response Example</div>
                      <pre class="mono bg-black/5 p-4 text-xs overflow-x-auto">[{"id": "...", "email": "user@example.com", ...}]</pre>
                  </div>

                  <div class="endpoint-card p-8">
                      <div class="flex items-center gap-4 mb-4">
                          <span class="method-tag text-blue-700">POST</span>
                          <code class="mono font-bold">/contacts</code>
                      </div>
                      <p class="text-sm text-black/60 mb-6">Create or update a contact.</p>
                      <div class="text-[10px] font-bold uppercase text-black/40 mb-2">Request Body</div>
                      <pre class="mono bg-black/5 p-4 text-xs overflow-x-auto">{"email": "new@example.com", "firstName": "John"}</pre>
                  </div>

                  <!-- Campaigns -->
                  <div class="endpoint-card p-8">
                      <div class="flex items-center gap-4 mb-4">
                          <span class="method-tag text-emerald-700">GET</span>
                          <code class="mono font-bold">/campaigns</code>
                      </div>
                      <p class="text-sm text-black/60 mb-6">List all email campaigns and their current status.</p>
                  </div>

                  <!-- Templates -->
                  <div class="endpoint-card p-8">
                      <div class="flex items-center gap-4 mb-4">
                          <span class="method-tag text-emerald-700">GET</span>
                          <code class="mono font-bold">/templates</code>
                      </div>
                      <p class="text-sm text-black/60 mb-6">Retrieve your MJML email templates.</p>
                  </div>
              </div>
          </section>

          <footer class="mt-32 pt-8 border-t border-black/10 text-[10px] font-bold uppercase tracking-widest text-black/40">
              &copy; 2026 SIGNAL Editorial Infrastructure. SOC2 Type II Compliant.
          </footer>
      </body>
      </html>
    `);
  });

  app.get("/api/v1/openapi.json", (req, res) => {
    res.json({
      openapi: "3.0.0",
      info: {
        title: "SIGNAL Public API",
        version: "v1",
        description:
          "SIGNAL's enterprise-grade marketing automation API. Secure, scalable, and built for developers.",
      },
      servers: [{ url: "/api/v1", description: "Public API v1" }],
      security: [{ ApiKeyAuth: [] }],
      paths: {
        "/contacts": {
          get: {
            summary: "List contacts",
            description: "Retrieve a list of all contacts in your organization.",
            security: [{ ApiKeyAuth: [] }],
            responses: {
              "200": {
                description: "Array of contacts",
                content: {
                  "application/json": {
                    schema: { type: "array", items: { $ref: "#/components/schemas/Contact" } },
                  },
                },
              },
            },
          },
          post: {
            summary: "Create or update a contact",
            description:
              "Upsert a contact by email. If the email exists, fields are updated; otherwise a new contact is created.",
            security: [{ ApiKeyAuth: [] }],
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ContactCreate" },
                },
              },
            },
            responses: {
              "200": {
                description: "Created or updated contact",
                content: {
                  "application/json": { schema: { $ref: "#/components/schemas/Contact" } },
                },
              },
            },
          },
        },
        "/campaigns": {
          get: {
            summary: "List campaigns",
            description: "List all email campaigns and their current status.",
            security: [{ ApiKeyAuth: [] }],
            responses: {
              "200": {
                description: "Array of campaigns",
                content: {
                  "application/json": {
                    schema: { type: "array", items: { $ref: "#/components/schemas/Campaign" } },
                  },
                },
              },
            },
          },
        },
        "/templates": {
          get: {
            summary: "List templates",
            description: "Retrieve your MJML email templates.",
            security: [{ ApiKeyAuth: [] }],
            responses: {
              "200": {
                description: "Array of templates",
                content: {
                  "application/json": {
                    schema: { type: "array", items: { $ref: "#/components/schemas/Template" } },
                  },
                },
              },
            },
          },
        },
        "/segments": {
          get: {
            summary: "List segments",
            description: "List audience segments.",
            security: [{ ApiKeyAuth: [] }],
            responses: {
              "200": {
                description: "Array of segments",
                content: {
                  "application/json": {
                    schema: { type: "array", items: { $ref: "#/components/schemas/Segment" } },
                  },
                },
              },
            },
          },
        },
      },
      components: {
        securitySchemes: {
          ApiKeyAuth: {
            type: "apiKey",
            in: "header",
            name: "x-api-key",
            description:
              "API key for authenticating requests. Contact your SIGNAL administrator to obtain a key.",
          },
        },
        schemas: {
          Contact: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              email: { type: "string", format: "email" },
              firstName: { type: "string" },
              lastName: { type: "string" },
              createdAt: { type: "string", format: "date-time" },
              updatedAt: { type: "string", format: "date-time" },
            },
          },
          ContactCreate: {
            type: "object",
            required: ["email"],
            properties: {
              email: { type: "string", format: "email" },
              firstName: { type: "string" },
              lastName: { type: "string" },
            },
          },
          Campaign: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              name: { type: "string" },
              subject: { type: "string" },
              status: { type: "string", enum: ["DRAFT", "SCHEDULED", "SENDING", "SENT"] },
              channel: { type: "string", enum: ["EMAIL", "SMS", "IN_APP"] },
              createdAt: { type: "string", format: "date-time" },
            },
          },
          Template: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              name: { type: "string" },
              category: { type: "string" },
              createdAt: { type: "string", format: "date-time" },
            },
          },
          Segment: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              name: { type: "string" },
              contactCount: { type: "integer" },
              createdAt: { type: "string", format: "date-time" },
            },
          },
        },
      },
    });
  });

  // Health check endpoints
  const healthHandler = async (_req: express.Request, res: express.Response) => {
    const checks: Record<string, string> = {};
    let overall: "healthy" | "degraded" | "unhealthy" = "healthy";

    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.database = "ok";
    } catch {
      checks.database = "error";
      overall = "unhealthy";
    }

    if (redisConnection) {
      try {
        await redisConnection.ping();
        checks.redis = "ok";
      } catch {
        checks.redis = "error";
        overall = process.env.NODE_ENV === "production" ? "unhealthy" : "degraded";
      }
    } else {
      checks.redis = "not_configured";
      if (process.env.NODE_ENV === "production") overall = "unhealthy";
    }

    res.status(overall === "healthy" ? 200 : overall === "degraded" ? 200 : 503).json({
      status: overall,
      checks,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  };

  app.get("/health", healthHandler);
  app.get("/api/health", healthHandler);
  app.get("/live", (_req, res) => {
    res.json({
      status: "alive",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  // --- Route Modules ---

  const ctx: RouteContext = {
    templateEngine,
    validationQueue: validationQueue as any,
    io: io as any,
    roomUsers,
    createEventAndBroadcast,
    refreshSegment,
    publicApiGateway: publicRouter,
  };

  app.use(registerCampaignRoutes(ctx));
  app.use(registerContactRoutes(ctx));
  app.use(registerTemplateRoutes(ctx));
  app.use(registerFlowRoutes(ctx));
  app.use(registerAuthRoutes(ctx));
  app.use(registerAdminRoutes(ctx));
  app.use(registerValidationRoutes(ctx));
  app.use(registerAiRoutes(ctx));
  app.use(registerComplianceRoutes(ctx));
  app.use(registerIntegrationRoutes(ctx));
  app.use(registerAssetRoutes(ctx));
  app.use(registerFormRoutes(ctx));
  app.use(registerGrowthRoutes(ctx));
  app.use(registerEmailRoutes(ctx));

  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "API endpoint not found", code: "NOT_FOUND" });
  });

  // --- Vite Frontend Dev Middleware ---
  if (process.env.NODE_ENV !== "production" && !process.env.VITEST) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  if (process.env.NODE_ENV === "production") {
    const distPath = path.resolve(process.cwd(), "dist");
    app.use(express.static(distPath, { index: false }));
    app.get("*", (req, res, next) => {
      if (!req.accepts("html") || path.extname(req.path)) {
        return next();
      }
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.use(errorHandler);
  // Schedule campaigns cron job
  cron.schedule("* * * * *", async () => {
    try {
      if (!campaignDeliveryQueue) {
        logger.warn("Scheduled campaign queue is disabled because REDIS_URL is not configured");
        return;
      }
      const claim = await claimScheduledCampaigns(new Date(), campaignDeliveryQueue);
      const recovered = await enqueueOrphanedDispatches(campaignDeliveryQueue);
      logger.info({ ...claim, recovered }, "Scheduled campaigns atomically claimed and queued");
    } catch (error) {
      logger.error({ err: error }, "Error queuing scheduled campaigns");
    }
  });

  // Schedule segment refresh cron job (runs every 5 minutes)
  cron.schedule("*/5 * * * *", async () => {
    try {
      console.log("Starting background segment refresh...");
      const segments = await prisma.segment.findMany({ select: { id: true } });

      for (const segment of segments) {
        await refreshSegment(segment.id);
      }
      console.log("Background segment refresh completed.");
    } catch (error) {
      console.error("Error in segment refresh cron job:", error);
    }
  });

  return { app, httpServer };
}

async function startServer() {
  const config = validateConfig();
  if (!config.valid) {
    logger.error({ errors: config.errors }, "Startup config validation failed");
    process.exit(1);
  }
  if (config.warnings.length > 0) {
    logger.warn({ warnings: config.warnings }, "Config warnings");
  }

  const PORT = parseInt(process.env.PORT || "3000", 10);
  const { httpServer: server } = await createApp();

  process.on("uncaughtException", (err) => {
    logger.fatal({ err }, "Uncaught exception - shutting down");
    process.exit(1);
  });

  process.on("unhandledRejection", (reason) => {
    logger.fatal({ reason }, "Unhandled promise rejection - shutting down");
    process.exit(1);
  });

  const gracefulShutdown = (signal: string) => {
    logger.info({ signal }, `Received ${signal} - starting graceful shutdown`);
    server.close(async () => {
      logger.info("HTTP server closed");
      try {
        await emailDeliveryWorker?.close();
        await referralVerificationWorker?.close();
        await workflowWorker?.close();
        await campaignDeliveryQueue?.close();
        await referralVerificationQueue?.close();
        await dataRequestWorker?.close();
        await dataRequestQueue?.close();
        await validationQueue?.close();
      } catch {}
      try {
        await redisService.disconnect?.();
      } catch {}
      try {
        await prisma.$disconnect();
      } catch {}
      logger.info("Graceful shutdown complete");
      process.exit(0);
    });

    setTimeout(() => {
      logger.fatal("Graceful shutdown timed out after 10s");
      process.exit(1);
    }, 10000);
  };

  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));

  server.listen(PORT, "0.0.0.0", () => {
    logger.info({ port: PORT }, "SIGNAL server started");
  });
}

if (!process.env.VITEST) {
  startServer().catch(console.error);
}
