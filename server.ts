import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { mjmlTemplates } from "./src/data/mjmlTemplates";
import { geminiService } from "./src/services/geminiService";
import { redisService } from "./src/services/redisService";
import passport from "passport";
import session from "express-session";
import { Strategy as SAMLStrategy } from "passport-saml";
import { Strategy as OIDCStrategy } from "passport-openidconnect";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { prisma } from "./src/services/prisma";
import { ValidationEngine } from "./src/services/validation/engine";
import { Queue } from "bullmq";
import Redis from "ioredis";
import { parse } from "csv-parse/sync";
import multer from "multer";
import { Server } from "socket.io";
import http from "http";

const upload = multer({ storage: multer.memoryStorage() });
const redisConnection = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL, { 
  maxRetriesPerRequest: null,
  enableOfflineQueue: false,
  retryStrategy(times) {
    if (times > 3) return null;
    return Math.min(times * 100, 3000);
  }
}) : null;

if (redisConnection) {
  redisConnection.on('error', (err: any) => {
    if (err.code === 'ECONNREFUSED') {
      console.warn("Redis connection refused. Bulk validation features will be disabled.");
    }
  });
}

const validationQueue = redisConnection ? new Queue('bulk-validation', { connection: redisConnection as any }) : null;

import "./src/workers/validationWorker";

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
        { email: "reader1@example.com", firstName: "Julian", lastName: "Barnes", organizationId: org.id, engagementScore: 85, status: "SUBSCRIBED" },
        { email: "reader2@example.com", firstName: "Zadie", lastName: "Smith", organizationId: org.id, engagementScore: 92, status: "SUBSCRIBED" },
        { email: "reader3@example.com", firstName: "Kazuo", lastName: "Ishiguro", organizationId: org.id, engagementScore: 45, status: "SUBSCRIBED" },
        { email: "reader4@example.com", firstName: "Elena", lastName: "Ferrante", organizationId: org.id, engagementScore: 78, status: "SUBSCRIBED" },
      ]
    });
    console.log("Seeded initial contacts.");
  }

  const productCount = await prisma.product.count();
  if (productCount === 0) {
    await prisma.product.createMany({
      data: [
        { name: "SIGNAL Editorial Tote", price: 25.00, source: "SHOPIFY", externalId: "sh_1", organizationId: org.id },
        { name: "Annual Subscription", price: 120.00, source: "CUSTOM", externalId: "sub_1", organizationId: org.id },
        { name: "Limited Edition Print", price: 45.00, source: "WOOCOMMERCE", externalId: "woo_1", organizationId: org.id },
      ]
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
        organizationId: org.id
      }
    });
    console.log("Seeded initial brand.");
  }

  const integrationCount = await prisma.integration.count();
  if (integrationCount === 0) {
    await prisma.integration.create({
      data: {
        type: "SHOPIFY",
        status: "CONNECTED",
        organizationId: org.id
      }
    });
    console.log("Seeded initial integration.");
  }

  const revenueCount = await prisma.revenue.count();
  if (revenueCount === 0) {
    const contact = await prisma.contact.findFirst();
    if (contact) {
      await prisma.revenue.createMany({
        data: [
          { amount: 25.00, contactId: contact.id, organizationId: org.id },
          { amount: 120.00, contactId: contact.id, organizationId: org.id },
          { amount: 45.00, contactId: contact.id, organizationId: org.id },
        ]
      });
      console.log("Seeded initial revenue.");
    }
  }

  const workflowTemplateCount = await prisma.workflowTemplate.count();
  if (workflowTemplateCount < 30) {
    // Clear existing to avoid duplicates if we are re-seeding
    await prisma.workflowTemplate.deleteMany({});
    await prisma.workflowTemplate.createMany({
      data: [
        // Onboarding & Activation
        {
          name: "Welcome Sequence",
          description: "Automated welcome series for new signups + dashboard walkthrough.",
          category: "ONBOARDING",
          nodes: JSON.stringify([{ id: '1', type: 'custom', position: { x: 100, y: 100 }, data: { label: 'User Signed Up', type: 'Trigger', icon: 'Zap', color: 'bg-burgundy/10 text-burgundy' } }]),
          edges: "[]"
        },
        {
          name: "Product First Use Guide",
          description: "Step-by-step guide for first-time product usage via email or in-app.",
          category: "ONBOARDING",
          nodes: JSON.stringify([{ id: '1', type: 'custom', position: { x: 100, y: 100 }, data: { label: 'First Login', type: 'Trigger', icon: 'Zap', color: 'bg-burgundy/10 text-burgundy' } }]),
          edges: "[]"
        },
        {
          name: "Account Verification Reminder",
          description: "Automated reminder for users who haven't verified their account.",
          category: "ONBOARDING",
          nodes: JSON.stringify([{ id: '1', type: 'trigger', data: { label: 'Verification Pending' } }]),
          edges: "[]"
        },
        {
          name: "Profile Completion Nudge",
          description: "Encourage users to fill out missing profile fields.",
          category: "ONBOARDING",
          nodes: JSON.stringify([{ id: '1', type: 'trigger', data: { label: 'Profile Incomplete' } }]),
          edges: "[]"
        },
        {
          name: "First Feature Adoption",
          description: "Triggered when a core feature hasn't been used within the first week.",
          category: "ONBOARDING",
          nodes: JSON.stringify([{ id: '1', type: 'trigger', data: { label: 'Feature Not Used' } }]),
          edges: "[]"
        },
        // Engagement & Retention
        {
          name: "7-Day Inactivity Reminder",
          description: "Re-engage users who haven't logged in for 7 days.",
          category: "ENGAGEMENT",
          nodes: JSON.stringify([{ id: '1', type: 'trigger', data: { label: 'Inactivity: 7 Days' } }]),
          edges: "[]"
        },
        {
          name: "14-Day Inactivity Reminder",
          description: "Re-engage users who haven't logged in for 14 days.",
          category: "ENGAGEMENT",
          nodes: JSON.stringify([{ id: '1', type: 'trigger', data: { label: 'Inactivity: 14 Days' } }]),
          edges: "[]"
        },
        {
          name: "30-Day Inactivity Reminder",
          description: "Re-engage users who haven't logged in for 30 days.",
          category: "ENGAGEMENT",
          nodes: JSON.stringify([{ id: '1', type: 'trigger', data: { label: 'Inactivity: 30 Days' } }]),
          edges: "[]"
        },
        {
          name: "Content Consumption Follow-Up",
          description: "Follow up with users who didn't finish a webinar or course.",
          category: "ENGAGEMENT",
          nodes: JSON.stringify([{ id: '1', type: 'trigger', data: { label: 'Content Partially Consumed' } }]),
          edges: "[]"
        },
        {
          name: "Feature Adoption Encouragement",
          description: "Personalized usage tips for underutilized features.",
          category: "ENGAGEMENT",
          nodes: JSON.stringify([{ id: '1', type: 'trigger', data: { label: 'Feature Adoption Opportunity' } }]),
          edges: "[]"
        },
        {
          name: "Weekly Engagement Digest",
          description: "Automated summary of user activity and insights.",
          category: "ENGAGEMENT",
          nodes: JSON.stringify([{ id: '1', type: 'trigger', data: { label: 'Weekly Schedule' } }]),
          edges: "[]"
        },
        {
          name: "Re-engagement Campaign",
          description: "Win back long-term inactive users with special offers.",
          category: "ENGAGEMENT",
          nodes: JSON.stringify([{ id: '1', type: 'trigger', data: { label: 'Dormant User Detected' } }]),
          edges: "[]"
        },
        // Revenue & Upsell
        {
          name: "Trial Expiration Alert",
          description: "Notify users before their trial ends with an upgrade offer.",
          category: "REVENUE",
          nodes: JSON.stringify([{ id: '1', type: 'trigger', data: { label: 'Trial Ends Soon' } }]),
          edges: "[]"
        },
        {
          name: "Payment Failure Retry Sequence",
          description: "Automated support and retry flow for failed payments.",
          category: "REVENUE",
          nodes: JSON.stringify([{ id: '1', type: 'trigger', data: { label: 'Payment Failed' } }]),
          edges: "[]"
        },
        {
          name: "Cross-Sell Recommendation",
          description: "Suggest products based on user purchase history.",
          category: "REVENUE",
          nodes: JSON.stringify([{ id: '1', type: 'trigger', data: { label: 'Purchase Completed' } }]),
          edges: "[]"
        },
        {
          name: "Upsell / Upgrade Flow",
          description: "Targeted offers for higher-tier plans based on usage.",
          category: "REVENUE",
          nodes: JSON.stringify([{ id: '1', type: 'trigger', data: { label: 'Usage Threshold Reached' } }]),
          edges: "[]"
        },
        {
          name: "Subscription Renewal Reminder",
          description: "Remind users of upcoming subscription renewals.",
          category: "REVENUE",
          nodes: JSON.stringify([{ id: '1', type: 'trigger', data: { label: 'Renewal in 7 Days' } }]),
          edges: "[]"
        },
        // Customer Support & Feedback
        {
          name: "Support Ticket Follow-Up",
          description: "Automated follow-up for new or delayed support tickets.",
          category: "SUPPORT",
          nodes: JSON.stringify([{ id: '1', type: 'trigger', data: { label: 'Ticket Created' } }]),
          edges: "[]"
        },
        {
          name: "Post-Support Survey",
          description: "Collect NPS or satisfaction feedback after support resolution.",
          category: "SUPPORT",
          nodes: JSON.stringify([{ id: '1', type: 'trigger', data: { label: 'Ticket Resolved' } }]),
          edges: "[]"
        },
        {
          name: "Churn Prevention Win-Back",
          description: "Special offers for users who cancelled their subscription.",
          category: "SUPPORT",
          nodes: JSON.stringify([{ id: '1', type: 'trigger', data: { label: 'Subscription Cancelled' } }]),
          edges: "[]"
        },
        {
          name: "Feature Feedback Request",
          description: "Ask for feedback after a user uses a specific feature.",
          category: "SUPPORT",
          nodes: JSON.stringify([{ id: '1', type: 'trigger', data: { label: 'Feature Used' } }]),
          edges: "[]"
        },
        {
          name: "Service Announcement Alerts",
          description: "Automated alerts for maintenance or critical updates.",
          category: "SUPPORT",
          nodes: JSON.stringify([{ id: '1', type: 'trigger', data: { label: 'System Announcement' } }]),
          edges: "[]"
        },
        // Event-Driven
        {
          name: "Abandoned Cart Reminder",
          description: "Recover lost sales with automated cart reminders.",
          category: "EVENT_DRIVEN",
          nodes: JSON.stringify([{ id: '1', type: 'trigger', data: { label: 'Cart Abandoned' } }]),
          edges: "[]"
        },
        {
          name: "Event Registration Confirmation",
          description: "Onboarding and reminders for webinar/event signups.",
          category: "EVENT_DRIVEN",
          nodes: JSON.stringify([{ id: '1', type: 'trigger', data: { label: 'Event Registered' } }]),
          edges: "[]"
        },
        {
          name: "Milestone Achievement",
          description: "Celebrate user successes and usage milestones.",
          category: "EVENT_DRIVEN",
          nodes: JSON.stringify([{ id: '1', type: 'trigger', data: { label: 'Milestone Reached' } }]),
          edges: "[]"
        },
        {
          name: "Custom Trigger Event",
          description: "Automation based on custom user behavior events.",
          category: "EVENT_DRIVEN",
          nodes: JSON.stringify([{ id: '1', type: 'trigger', data: { label: 'Custom Event Fired' } }]),
          edges: "[]"
        },
        {
          name: "Birthday / Anniversary Email",
          description: "Personalized greetings for special user dates.",
          category: "EVENT_DRIVEN",
          nodes: JSON.stringify([{ id: '1', type: 'trigger', data: { label: 'Special Date' } }]),
          edges: "[]"
        },
        // AI Powered
        {
          name: "Predictive Churn Prevention",
          description: "AI-powered detection of users likely to churn.",
          category: "AI_POWERED",
          nodes: JSON.stringify([{ id: '1', type: 'trigger', data: { label: 'AI: High Churn Risk' } }]),
          edges: "[]"
        },
        {
          name: "AI Subject Line Optimization",
          description: "Automatically optimize email subject lines using AI.",
          category: "AI_POWERED",
          nodes: JSON.stringify([{ id: '1', type: 'trigger', data: { label: 'Campaign Started' } }]),
          edges: "[]"
        },
        {
          name: "Send-Time Personalization",
          description: "Deliver emails at the optimal time for each user.",
          category: "AI_POWERED",
          nodes: JSON.stringify([{ id: '1', type: 'trigger', data: { label: 'AI: Optimal Time Window' } }]),
          edges: "[]"
        },
        {
          name: "Content Personalization Flow",
          description: "AI-driven content selection based on user interests.",
          category: "AI_POWERED",
          nodes: JSON.stringify([{ id: '1', type: 'trigger', data: { label: 'User Interest Detected' } }]),
          edges: "[]"
        },
        {
          name: "Engagement Score Automation",
          description: "Branch workflows based on AI engagement scores.",
          category: "AI_POWERED",
          nodes: JSON.stringify([{ id: '1', type: 'trigger', data: { label: 'Score Threshold Reached' } }]),
          edges: "[]"
        }
      ]
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
          { contactId: contact.id, action: "SUBSCRIBE", source: "FORM", ipAddress: "192.168.1.1", organizationId: org.id },
          { contactId: contact.id, action: "PREFERENCE_UPDATE", source: "PREFERENCE_CENTER", ipAddress: "192.168.1.1", organizationId: org.id },
        ]
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
        ]
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
        organizationId: org.id
      }
    });

    await prisma.approvalRequest.create({
      data: {
        campaignId: campaign.id,
        requesterId: "Editor in Chief",
        status: "PENDING",
        comments: "Please review the new layout."
      }
    });
    console.log("Seeded initial approval request.");
  }

  // Update Org/User with SSO/MFA data
  await prisma.organization.update({
    where: { id: org.id },
    data: {
      ssoEnabled: true,
      ssoDomain: "signal.app",
      ssoClientId: "client_123",
      ssoIssuer: "https://auth.signal.app"
    }
  });

  const adminUser = await prisma.user.findFirst({ where: { email: "admin@signal.app" } });
  if (adminUser) {
    await prisma.user.update({
      where: { id: adminUser.id },
      data: {
        mfaEnabled: true
      }
    });
  }
}

async function startServer() {
  try {
    await seed();
  } catch (err) {
    console.error("Database seeding failed. Ensure DATABASE_URL is correct.", err);
  }
  
  const app = express();
  const httpServer = http.createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const roomUsers = new Map<string, Map<string, any>>();

  io.on("connection", (socket) => {
    socket.on("join-room", ({ roomId, user }) => {
      socket.join(roomId);
      if (!roomUsers.has(roomId)) {
        roomUsers.set(roomId, new Map());
      }
      roomUsers.get(roomId)!.set(socket.id, user);
      
      io.to(roomId).emit("room-users", Array.from(roomUsers.get(roomId)!.values()));
    });

    socket.on("cursor-move", ({ roomId, position }) => {
      const user = roomUsers.get(roomId)?.get(socket.id);
      socket.to(roomId).emit("user-cursor-move", { socketId: socket.id, position, user });
    });

    socket.on("activity", ({ roomId, activity }) => {
      const user = roomUsers.get(roomId)?.get(socket.id);
      io.to(roomId).emit("user-activity", { socketId: socket.id, activity, user });
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

  const PORT = 3000;

  app.use(express.json());
  app.use(session({
    secret: process.env.SESSION_SECRET || "signal-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: { 
      secure: process.env.NODE_ENV === "production",
      sameSite: "none"
    }
  }));

  app.use(passport.initialize());
  app.use(passport.session());

  passport.serializeUser((user: any, done) => done(null, user.id));
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await prisma.user.findUnique({ where: { id } });
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // --- SOC2 Audit Logging Middleware ---
  app.use(async (req, res, next) => {
    const originalSend = res.send;
    const org = await prisma.organization.findFirst();
    
    res.send = function (body) {
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && res.statusCode < 400 && org) {
        // Log the action asynchronously
        const action = `${req.method} ${req.path}`;
        const userId = req.headers['x-user-id'] as string || 'system';
        
        prisma.auditLog.create({
          data: {
            action,
            entityType: req.path.split('/')[2] || 'unknown',
            entityId: req.params.id || 'bulk',
            userId,
            organizationId: org.id,
          }
        }).catch(err => console.error("Audit log failed:", err));
      }
      return originalSend.call(this, body);
    };
    next();
  });

  // --- Public API Gateway & Rate Limiting ---
  const publicApiGateway = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const apiKeyHeader = req.headers['x-api-key'] as string;
    if (!apiKeyHeader) return res.status(401).json({ error: "API key required" });

    const key = await prisma.apiKey.findUnique({
      where: { key: apiKeyHeader },
      include: { organization: true }
    });

    if (!key) return res.status(401).json({ error: "Invalid API key" });

    // Rate Limiting
    const { remaining, reset } = await redisService.rateLimit(`ratelimit:api:${key.id}`, 100, 60); // 100 req/min
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', reset);

    if (remaining === 0) {
      return res.status(429).json({ error: "Rate limit exceeded" });
    }

    // Attach org to request
    (req as any).organization = key.organization;
    (req as any).apiKey = key;

    // Update last used
    prisma.apiKey.update({
      where: { id: key.id },
      data: { lastUsedAt: new Date() }
    }).catch(() => {});

    next();
  };

  // --- Public API V1 Routes ---
  const publicRouter = express.Router();
  publicRouter.use(publicApiGateway);

  publicRouter.get("/contacts", async (req, res) => {
    const org = (req as any).organization;
    const cacheKey = `api:contacts:${org.id}`;
    
    const cached = await redisService.get<any[]>(cacheKey);
    if (cached) return res.json(cached);

    const contacts = await prisma.contact.findMany({ where: { organizationId: org.id } });
    await redisService.set(cacheKey, contacts, 300); // Cache for 5 mins
    res.json(contacts);
  });

  publicRouter.post("/contacts", async (req, res) => {
    const org = (req as any).organization;
    const { email, firstName, lastName } = req.body;
    const contact = await prisma.contact.upsert({
      where: { email_organizationId: { email, organizationId: org.id } },
      update: { firstName, lastName },
      create: { email, firstName, lastName, organizationId: org.id }
    });
    
    // Invalidate cache
    await redisService.del(`api:contacts:${org.id}`);
    
    res.json(contact);
  });

  publicRouter.get("/campaigns", async (req, res) => {
    const org = (req as any).organization;
    const cacheKey = `api:campaigns:${org.id}`;
    
    const cached = await redisService.get<any[]>(cacheKey);
    if (cached) return res.json(cached);

    const campaigns = await prisma.campaign.findMany({ where: { organizationId: org.id } });
    await redisService.set(cacheKey, campaigns, 300);
    res.json(campaigns);
  });

  publicRouter.get("/templates", async (req, res) => {
    const org = (req as any).organization;
    const templates = await prisma.template.findMany({ where: { organizationId: org.id } });
    res.json(templates);
  });

  publicRouter.get("/segments", async (req, res) => {
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
        type: "Bearer-like API Key"
      },
      rateLimit: "100 requests per minute"
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
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&family=JetBrains+Mono&family=Playfair+Display:ital,wght@0,900;1,900&display=swap" rel="stylesheet">
          <style>
              body { font-family: 'Inter', sans-serif; background-color: #F5F2EC; color: #1A1814; }
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
              <h2 class="text-sm font-extrabold uppercase tracking-widest mb-8 border-l-4 border-[#8B1A1A] pl-4">Authentication</h2>
              <div class="endpoint-card p-8">
                  <p class="mb-4">All requests must include your API key in the <code class="mono bg-black/5 px-2 py-1 rounded text-sm">x-api-key</code> header.</p>
                  <div class="mono bg-[#1A1814] text-white p-4 text-sm overflow-x-auto">
                      curl -H "x-api-key: YOUR_API_KEY" https://signal.app/api/v1/contacts
                  </div>
              </div>
          </section>

          <section class="mb-16">
              <h2 class="text-sm font-extrabold uppercase tracking-widest mb-8 border-l-4 border-[#8B1A1A] pl-4">Endpoints</h2>
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

  // --- API Keys Management ---
  app.get("/api/keys", async (req, res) => {
    const org = await prisma.organization.findFirst();
    const keys = await prisma.apiKey.findMany({ where: { organizationId: org?.id } });
    res.json(keys);
  });

  app.post("/api/keys", async (req, res) => {
    const { name, scopes } = req.body;
    const org = await prisma.organization.findFirst();
    if (!org) return res.status(404).json({ error: "Org not found" });

    const key = await prisma.apiKey.create({
      data: {
        name,
        key: `sig_${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`,
        scopes: JSON.stringify(scopes || []),
        organizationId: org.id
      }
    });
    res.json(key);
  });

  app.delete("/api/keys/:id", async (req, res) => {
    await prisma.apiKey.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  });

  // --- API Routes ---

  // Team Management
  app.get("/api/team", async (req, res) => {
    const org = await prisma.organization.findFirst();
    if (!org) return res.status(404).json({ error: "Org not found" });

    const users = await prisma.user.findMany({
      where: { organizationId: org.id },
      include: { customRole: true },
      orderBy: { createdAt: "asc" },
    });
    res.json(users);
  });

  app.post("/api/team/invite", async (req, res) => {
    const org = await prisma.organization.findFirst();
    if (!org) return res.status(404).json({ error: "Org not found" });

    const { email, name, role } = req.body;
    
    try {
      const newUser = await prisma.user.create({
        data: {
          email,
          name,
          role: role || "VIEWER",
          status: "PENDING",
          organizationId: org.id,
        },
      });
      console.log(`[EMAIL SIMULATION] Invitation sent to ${email}`);
      res.json(newUser);
    } catch (e) {
      res.status(400).json({ error: "User already exists or invalid data" });
    }
  });

  app.post("/api/team/:id/activate", async (req, res) => {
    const { id } = req.params;
    try {
      const user = await prisma.user.update({
        where: { id },
        data: { status: "ACTIVE" }
      });
      res.json(user);
    } catch (e) {
      res.status(400).json({ error: "Failed to activate user" });
    }
  });

  app.patch("/api/team/:id", async (req, res) => {
    const { id } = req.params;
    const { role, name } = req.body;

    try {
      const updatedUser = await prisma.user.update({
        where: { id },
        data: { role, name },
      });
      res.json(updatedUser);
    } catch (e) {
      res.status(400).json({ error: "Failed to update user" });
    }
  });

  app.delete("/api/team/:id", async (req, res) => {
    const { id } = req.params;
    
    // Prevent deleting the last owner (simplified check)
    const userToDelete = await prisma.user.findUnique({ where: { id } });
    if (userToDelete?.role === "OWNER") {
      const ownerCount = await prisma.user.count({ 
        where: { organizationId: userToDelete.organizationId, role: "OWNER" } 
      });
      if (ownerCount <= 1) {
        return res.status(400).json({ error: "Cannot delete the last owner" });
      }
    }

    try {
      await prisma.user.delete({ where: { id } });
      res.json({ success: true });
    } catch (e) {
      res.status(400).json({ error: "Failed to delete user" });
    }
  });

  // Auth / Org Context (Simulated for now)
  app.get("/api/me", async (req, res) => {
    const user = await prisma.user.findFirst({
      include: { organization: true },
    });
    res.json(user);
  });

  // Email Validation API
  app.post("/api/validate", async (req, res) => {
    const { email } = req.body;
    const org = await prisma.organization.findFirst();
    if (!org) return res.status(404).json({ error: "Org not found" });

    // Rate limiting: 10 req/sec
    const rateLimitKey = `rl:validate:${org.id}`;
    const { remaining, reset } = await redisService.rateLimit(rateLimitKey, 10, 1);
    
    res.set('X-RateLimit-Remaining', remaining.toString());
    res.set('X-RateLimit-Reset', reset.toString());

    if (remaining === 0) {
      return res.status(429).json({ error: "Too many requests" });
    }

    try {
      const result = await ValidationEngine.validate(email);
      
      await prisma.validationLog.create({
        data: {
          email,
          status: result.status,
          score: result.score,
          confidence: result.confidence,
          details: JSON.stringify(result.details),
          organizationId: org.id
        }
      });

      res.json(result);
    } catch (e) {
      res.status(500).json({ error: "Validation failed" });
    }
  });

  app.post("/api/validate-bulk", upload.single('file'), async (req, res) => {
    const org = await prisma.organization.findFirst();
    if (!org) return res.status(404).json({ error: "Org not found" });
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    try {
      const content = req.file.buffer.toString();
      const records = parse(content, { columns: true, skip_empty_lines: true });
      const emails = records.map((r: any) => r.email).filter(Boolean);

      const job = await prisma.bulkValidationJob.create({
        data: {
          name: req.file.originalname,
          organizationId: org.id,
          totalCount: emails.length
        }
      });

      if (validationQueue) {
        await validationQueue.add('process-bulk', { jobId: job.id, emails });
      } else {
        return res.status(503).json({ error: "Bulk validation service is unavailable (Redis not configured)" });
      }

      res.json({ jobId: job.id, message: "Bulk validation started" });
    } catch (e) {
      res.status(500).json({ error: "Failed to start bulk validation" });
    }
  });

  app.get("/api/validate-bulk/:id", async (req, res) => {
    const job = await prisma.bulkValidationJob.findUnique({
      where: { id: req.params.id },
      include: { results: { take: 100 } } // Limit results for status check
    });
    res.json(job);
  });

  app.get("/api/validation-logs", async (req, res) => {
    const org = await prisma.organization.findFirst();
    const logs = await prisma.validationLog.findMany({
      where: { organizationId: org?.id },
      orderBy: { createdAt: 'desc' },
      take: 100
    });
    res.json(logs);
  });
  app.get("/api/stats/summary", async (req, res) => {
    const org = await prisma.organization.findFirst();
    if (!org) return res.status(404).json({ error: "Org not found" });

    const totalSubscribers = await prisma.contact.count({ where: { organizationId: org.id } });
    const totalCampaigns = await prisma.campaign.count({ where: { organizationId: org.id } });
    const totalSent = await prisma.event.count({ where: { type: "SENT", contact: { organizationId: org.id } } });
    const totalOpens = await prisma.event.count({ where: { type: "OPEN", contact: { organizationId: org.id } } });

    res.json({ totalSubscribers, totalCampaigns, totalSent, totalOpens });
  });

  // Contacts
  app.get("/api/contacts", async (req, res) => {
    const org = await prisma.organization.findFirst();
    const contacts = await prisma.contact.findMany({
      where: { organizationId: org?.id },
      include: { tags: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(contacts);
  });

  app.post("/api/contacts", async (req, res) => {
    const org = await prisma.organization.findFirst();
    const { email, firstName, lastName, tags } = req.body;

    // Server-side email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    try {
      const contact = await prisma.contact.create({
        data: {
          email,
          firstName,
          lastName,
          organizationId: org!.id,
          tags: {
            connectOrCreate: (tags || "").split(",").map((t: string) => ({
              where: { name: t.trim() },
              create: { name: t.trim() },
            })),
          },
        },
      });
      res.json(contact);
    } catch (e) {
      res.status(400).json({ error: "Contact already exists" });
    }
  });

  // Campaigns
  app.get("/api/campaigns", async (req, res) => {
    const org = await prisma.organization.findFirst();
    const campaigns = await prisma.campaign.findMany({
      where: { organizationId: org?.id },
      include: { template: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(campaigns);
  });

  app.post("/api/campaigns", async (req, res) => {
    const org = await prisma.organization.findFirst();
    const { 
      name, subject, previewText, fromName, fromEmail, content, type, scheduledAt, timezone,
      subjectB, contentB, testPercentage, testDuration, winnerCriteria
    } = req.body;
    const campaign = await prisma.campaign.create({
      data: {
        name,
        subject,
        previewText,
        fromName,
        fromEmail,
        content,
        type,
        subjectB,
        contentB,
        testPercentage: testPercentage ? parseInt(testPercentage) : undefined,
        testDuration: testDuration ? parseInt(testDuration) : undefined,
        winnerCriteria,
        timezone: timezone || "UTC",
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        status: scheduledAt ? "SCHEDULED" : "DRAFT",
        organizationId: org!.id,
      },
    });
    res.json(campaign);
  });

  app.patch("/api/campaigns/:id/status", async (req, res) => {
    const { status } = req.body;
    const campaign = await prisma.campaign.update({
      where: { id: req.params.id },
      data: { 
        status,
        sentAt: status === "SENT" ? new Date() : undefined
      },
    });
    res.json(campaign);
  });

  app.get("/api/campaigns/:id/analytics", async (req, res) => {
    const campaign = await prisma.campaign.findUnique({
      where: { id: req.params.id },
    });
    if (!campaign) return res.status(404).json({ error: "Campaign not found" });

    // Mocking analytics data for the editorial feel
    const sent = 1240;
    const opened = Math.floor(sent * 0.248);
    const clicked = Math.floor(opened * 0.12);
    const unsubscribed = Math.floor(sent * 0.0012);
    const bounced = Math.floor(sent * 0.002);
    const conversions = Math.floor(clicked * 0.05);

    const timeSeries = [
      { timestamp: "08:00", opens: 120, clicks: 12 },
      { timestamp: "10:00", opens: 450, clicks: 45 },
      { timestamp: "12:00", opens: 890, clicks: 89 },
      { timestamp: "14:00", opens: 1100, clicks: 110 },
      { timestamp: "16:00", opens: 1240, clicks: 124 },
    ];

    const deviceData = [
      { name: "Mobile", value: 65 },
      { name: "Desktop", value: 30 },
      { name: "Tablet", value: 5 },
    ];

    res.json({
      campaign,
      stats: { sent, opened, clicked, unsubscribed, bounced, conversions },
      timeSeries,
      deviceData,
    });
  });

  // Templates
  app.get("/api/templates", async (req, res) => {
    const org = await prisma.organization.findFirst();
    const templates = await prisma.template.findMany({
      where: { organizationId: org?.id },
      orderBy: { createdAt: "desc" },
    });
    res.json(templates);
  });

  app.post("/api/templates", async (req, res) => {
    const org = await prisma.organization.findFirst();
    const { name, content, category } = req.body;
    const template = await prisma.template.create({
      data: {
        name,
        content,
        category,
        organizationId: org!.id,
      },
    });
    res.json(template);
  });

  app.delete("/api/templates/:id", async (req, res) => {
    await prisma.template.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true });
  });

  // Segments
  app.get("/api/segments", async (req, res) => {
    const org = await prisma.organization.findFirst();
    const segments = await prisma.segment.findMany({
      where: { organizationId: org?.id },
      orderBy: { createdAt: "desc" },
    });
    res.json(segments);
  });

  app.post("/api/segments", async (req, res) => {
    const org = await prisma.organization.findFirst();
    const { name, rules } = req.body;
    const segment = await prisma.segment.create({
      data: {
        name,
        rules: JSON.stringify(rules),
        organizationId: org!.id,
      },
    });
    res.json(segment);
  });

  app.delete("/api/segments/:id", async (req, res) => {
    await prisma.segment.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true });
  });

  // Custom Fields
  app.get("/api/custom-fields", async (req, res) => {
    const org = await prisma.organization.findFirst();
    const fields = await prisma.customFieldDefinition.findMany({
      where: { organizationId: org?.id },
      orderBy: { name: "asc" },
    });
    res.json(fields);
  });

  app.post("/api/custom-fields", async (req, res) => {
    const org = await prisma.organization.findFirst();
    const { name, key, type } = req.body;
    const field = await prisma.customFieldDefinition.create({
      data: {
        name,
        key,
        type,
        organizationId: org!.id,
      },
    });
    res.json(field);
  });

  app.delete("/api/custom-fields/:id", async (req, res) => {
    await prisma.customFieldDefinition.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true });
  });

  // Personalization Preview
  app.post("/api/personalize/preview", async (req, res) => {
    const { content, contactId } = req.body;
    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
    });

    if (!contact) return res.status(404).json({ error: "Contact not found" });

    let personalized = content;
    const fields = {
      first_name: contact.firstName || "",
      last_name: contact.lastName || "",
      email: contact.email,
      ...JSON.parse(contact.customFields),
    };

    // Simple token replacement
    Object.entries(fields).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, "g");
      personalized = personalized.replace(regex, String(value));
    });

    // Simple conditional blocks: {{#if key}} ... {{/if}}
    const ifRegex = /{{#if (\w+)}}([\s\S]*?){{\/if}}/g;
    personalized = personalized.replace(ifRegex, (match, key, body) => {
      return fields[key] ? body : "";
    });

    res.json({ content: personalized });
  });

  // Flows (Automations)
  app.get("/api/flows", async (req, res) => {
    const org = await prisma.organization.findFirst();
    const flows = await prisma.flow.findMany({
      where: { organizationId: org?.id },
      orderBy: { updatedAt: "desc" },
    });
    res.json(flows);
  });

  app.post("/api/flows", async (req, res) => {
    const org = await prisma.organization.findFirst();
    const { name, nodes, edges, status } = req.body;
    const flow = await prisma.flow.create({
      data: {
        name,
        nodes: nodes ? JSON.stringify(nodes) : "[]",
        edges: edges ? JSON.stringify(edges) : "[]",
        status: status || "DRAFT",
        organizationId: org!.id,
      },
    });
    res.json(flow);
  });

  app.get("/api/flows/:id", async (req, res) => {
    const flow = await prisma.flow.findUnique({
      where: { id: req.params.id },
    });
    res.json(flow);
  });

  app.patch("/api/flows/:id", async (req, res) => {
    const { name, nodes, edges, status } = req.body;
    const flow = await prisma.flow.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(nodes && { nodes: JSON.stringify(nodes) }),
        ...(edges && { edges: JSON.stringify(edges) }),
        ...(status && { status }),
      },
    });
    res.json(flow);
  });

  app.delete("/api/flows/:id", async (req, res) => {
    await prisma.flow.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true });
  });

  // Workflow Templates
  app.get("/api/workflow-templates", async (req, res) => {
    const templates = await prisma.workflowTemplate.findMany({
      orderBy: { category: "asc" },
    });
    res.json(templates);
  });

  app.post("/api/flows/from-template", async (req, res) => {
    const org = await prisma.organization.findFirst();
    const { templateId } = req.body;
    const template = await prisma.workflowTemplate.findUnique({ where: { id: templateId } });
    if (!template) return res.status(404).json({ error: "Template not found" });

    const flow = await prisma.flow.create({
      data: {
        name: `${template.name} (Copy)`,
        nodes: template.nodes,
        edges: template.edges,
        organizationId: org!.id,
        status: "DRAFT"
      }
    });
    res.json(flow);
  });

  // Events
  app.get("/api/events", async (req, res) => {
    const org = await prisma.organization.findFirst();
    const events = await prisma.event.findMany({
      where: { contact: { organizationId: org?.id } },
      include: { contact: true },
      orderBy: { timestamp: "desc" },
      take: 100,
    });
    res.json(events);
  });

  app.post("/api/events", async (req, res) => {
    const { type, metadata, contactId, campaignId } = req.body;
    
    // Bounce/Complaint Suppression Logic (Enterprise Deliverability)
    if (type === 'BOUNCE' || type === 'COMPLAINT') {
      await prisma.contact.update({
        where: { id: contactId },
        data: { status: type === 'BOUNCE' ? 'BOUNCED' : 'COMPLAINED' }
      });
    }

    const event = await prisma.event.create({
      data: {
        type,
        metadata: metadata ? JSON.stringify(metadata) : "{}",
        contactId,
        campaignId,
      },
    });
    res.json(event);
  });

  // Advanced Analytics
  app.get("/api/analytics/deliverability", async (req, res) => {
    res.json({
      inboxPlacement: 98.2,
      spamPlacement: 1.4,
      bounceRate: 0.4,
      timeSeries: [
        { date: '2024-01', inbox: 97.5, spam: 2.1, bounce: 0.4 },
        { date: '2024-02', inbox: 98.2, spam: 1.4, bounce: 0.4 },
      ]
    });
  });

  app.get("/api/analytics/funnel", async (req, res) => {
    res.json({
      steps: [
        { name: 'Sent', count: 10000, percentage: 100 },
        { name: 'Opened', count: 2840, percentage: 28.4 },
        { name: 'Clicked', count: 420, percentage: 4.2 },
        { name: 'Converted', count: 120, percentage: 1.2 },
      ]
    });
  });

  app.get("/api/analytics/cohorts", async (req, res) => {
    res.json({
      cohorts: [
        { month: 'Oct 2023', size: 1050, retention: [100, 82, 70, 62, 55, 50, 48, 45] },
        { month: 'Nov 2023', size: 1150, retention: [100, 84, 72, 65, 58, 52, 50] },
        { month: 'Dec 2023', size: 1300, retention: [100, 86, 75, 68, 62, 58] },
        { month: 'Jan 2024', size: 1200, retention: [100, 85, 72, 64, 58] },
        { month: 'Feb 2024', size: 1450, retention: [100, 88, 75, 68] },
        { month: 'Mar 2024', size: 1100, retention: [100, 82, 70] },
      ]
    });
  });

  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  // AI Assistant Endpoints
app.post("/api/ai/subject-lines", async (req, res) => {
  const { topic } = req.body;
  const lines = await geminiService.generateSubjectLines(topic);
  res.json(lines);
});

app.post("/api/ai/optimize-preview", async (req, res) => {
  const { subject, content } = req.body;
  const preview = await geminiService.optimizePreviewText(subject, content);
  res.json({ preview });
});

app.post("/api/ai/spam-check", async (req, res) => {
  const { subject, content } = req.body;
  const result = await geminiService.checkSpamScore(subject, content);
  res.json(result);
});

app.post("/api/ai/adjust-tone", async (req, res) => {
  const { content, tone } = req.body;
  const rewritten = await geminiService.adjustTone(content, tone);
  res.json({ content: rewritten });
});

app.post("/api/ai/translate", async (req, res) => {
  const { content, language } = req.body;
  const translated = await geminiService.translateContent(content, language);
  res.json({ content: translated });
});

app.post("/api/ai/predict-send-time", async (req, res) => {
  const { topic } = req.body;
  const prediction = await geminiService.predictBestSendTime(topic);
  res.json(prediction);
});

// A/B Testing Endpoints
app.get("/api/campaigns/:id/ab-results", async (req, res) => {
  const { id } = req.params;
  const campaign = await prisma.campaign.findUnique({ where: { id } });
  if (!campaign || campaign.type !== 'AB') return res.status(404).json({ error: "A/B campaign not found" });

  // Mock results
  res.json({
    variationA: { opens: 120, clicks: 45, rate: 24.5 },
    variationB: { opens: 145, clicks: 38, rate: 28.2 },
    winner: null
  });
});

app.post("/api/campaigns/:id/pick-winner", async (req, res) => {
  const { id } = req.params;
  const { winnerVariation } = req.body; // 'A' or 'B'
  const campaign = await prisma.campaign.update({
    where: { id },
    data: { status: 'SENT' }
  });
  
  // In a real app, we'd send the remaining emails with the winner variation
  res.json(campaign);
});

// Commerce & Products
app.get("/api/products", async (req, res) => {
  const org = await prisma.organization.findFirst();
  const products = await prisma.product.findMany({ where: { organizationId: org?.id } });
  res.json(products);
});

app.post("/api/products/sync", async (req, res) => {
  const org = await prisma.organization.findFirst();
  if (!org) return res.status(404).json({ error: "Org not found" });
  
  // Mock sync from Shopify/Woo
  const mockProducts = [
    { name: "Editorial Tote Bag", price: 25.00, source: "SHOPIFY", externalId: "sh_123" },
    { name: "SIGNAL Annual Subscription", price: 120.00, source: "CUSTOM", externalId: "sub_456" },
    { name: "Limited Edition Print", price: 45.00, source: "WOOCOMMERCE", externalId: "woo_789" }
  ];

  for (const p of mockProducts) {
    await prisma.product.upsert({
      where: { id: p.externalId }, // Using externalId as ID for mock
      update: { 
        name: p.name,
        price: p.price,
        source: p.source,
        externalId: p.externalId
      },
      create: { 
        name: p.name,
        price: p.price,
        source: p.source,
        externalId: p.externalId,
        organizationId: org.id, 
        id: p.externalId 
      }
    });
  }
  res.json({ status: "Synced", count: mockProducts.length });
});

// Revenue Attribution
app.get("/api/revenue/summary", async (req, res) => {
  const org = await prisma.organization.findFirst();
  const revenue = await prisma.revenue.aggregate({
    where: { organizationId: org?.id },
    _sum: { amount: true }
  });
  res.json({ totalRevenue: revenue._sum.amount || 0 });
});

app.get("/api/analytics/revenue/attribution", async (req, res) => {
  const { model = 'LAST_CLICK' } = req.query;
  const org = await prisma.organization.findFirst();
  if (!org) return res.status(404).json({ error: "Org not found" });

  const revenues = await prisma.revenue.findMany({
    where: { organizationId: org.id },
    include: { campaign: true, flow: true }
  });

  // In a real app, we'd query events for each revenue record.
  // For this demo, we'll return mock data based on the requested model.
  const attributionData = [
    { name: "Summer Sale", value: model === 'FIRST_CLICK' ? 4500 : 3200, color: "#8884d8" },
    { name: "Welcome Flow", value: model === 'LINEAR' ? 2800 : 1500, color: "#82ca9d" },
    { name: "Abandoned Cart", value: model === 'LAST_CLICK' ? 5200 : 3800, color: "#ffc658" },
    { name: "Product Launch", value: 2100, color: "#ff8042" },
  ];

  res.json(attributionData);
});

app.get("/api/analytics/cohorts", async (req, res) => {
  const org = await prisma.organization.findFirst();
  
  // Mock cohort data: Retention of users acquired in specific months
  const cohorts = [
    { month: 'Oct 2025', size: 1200, retention: [100, 85, 72, 65, 58] },
    { month: 'Nov 2025', size: 1500, retention: [100, 82, 68, 61] },
    { month: 'Dec 2025', size: 2100, retention: [100, 78, 65] },
    { month: 'Jan 2026', size: 1800, retention: [100, 88] },
    { month: 'Feb 2026', size: 2400, retention: [100] },
  ];
  
  res.json(cohorts);
});

app.get("/api/analytics/funnel", async (req, res) => {
  const org = await prisma.organization.findFirst();
  
  // Mock funnel data
  const funnel = [
    { step: 'Sent', count: 50000, percentage: 100 },
    { step: 'Opened', count: 12500, percentage: 25 },
    { step: 'Clicked', count: 3200, percentage: 6.4 },
    { step: 'Added to Cart', count: 850, percentage: 1.7 },
    { step: 'Purchased', count: 210, percentage: 0.42 },
  ];
  
  res.json(funnel);
});

// Team & Roles
app.get("/api/team", async (req, res) => {
  const org = await prisma.organization.findFirst();
  const users = await prisma.user.findMany({ 
    where: { organizationId: org?.id },
    include: { customRole: true }
  });
  res.json(users);
});

app.post("/api/team/invite", async (req, res) => {
  const { email, name, role, roleId } = req.body;
  const org = await prisma.organization.findFirst();
  if (!org) return res.status(404).json({ error: "Org not found" });

  const newUser = await prisma.user.create({
    data: { email, name, role, roleId, organizationId: org.id }
  });
  res.json(newUser);
});

app.get("/api/roles", async (req, res) => {
  const org = await prisma.organization.findFirst();
  const roles = await prisma.role.findMany({ where: { organizationId: org?.id } });
  res.json(roles);
});

app.post("/api/roles", async (req, res) => {
  const { name, permissions } = req.body;
  const org = await prisma.organization.findFirst();
  if (!org) return res.status(404).json({ error: "Org not found" });

  const role = await prisma.role.create({
    data: { name, permissions: JSON.stringify(permissions), organizationId: org.id }
  });
  res.json(role);
});

// Brands & Workspaces
app.get("/api/brands", async (req, res) => {
  const org = await prisma.organization.findFirst();
  const brands = await prisma.brand.findMany({ where: { organizationId: org?.id } });
  res.json(brands);
});

// Integrations
app.get("/api/integrations", async (req, res) => {
  const org = await prisma.organization.findFirst();
  const integrations = await prisma.integration.findMany({ where: { organizationId: org?.id } });
  res.json(integrations);
});

  // Approvals (Enterprise Governance)
  app.get("/api/approvals", async (req, res) => {
    const org = await prisma.organization.findFirst();
    const approvals = await prisma.approvalRequest.findMany({
      where: { 
        OR: [
          { template: { organizationId: org?.id } },
          { campaign: { organizationId: org?.id } }
        ]
      },
      include: { template: true, campaign: true },
      orderBy: { createdAt: "desc" }
    });
    res.json(approvals);
  });

  app.post("/api/approvals", async (req, res) => {
    const { templateId, campaignId, requesterId } = req.body;
    const approval = await prisma.approvalRequest.create({
      data: {
        templateId,
        campaignId,
        requesterId: requesterId || "system",
        status: "PENDING"
      }
    });
    
    // Update status of the entity
    if (templateId) {
      await prisma.template.update({ where: { id: templateId }, data: { status: "IN_REVIEW" } });
    }
    if (campaignId) {
      await prisma.campaign.update({ where: { id: campaignId }, data: { status: "IN_REVIEW" } });
    }
    
    res.json(approval);
  });

  app.patch("/api/approvals/:id", async (req, res) => {
    const { status, comments } = req.body;
    const approval = await prisma.approvalRequest.update({
      where: { id: req.params.id },
      data: { status, comments },
      include: { template: true, campaign: true }
    });
    
    const finalStatus = status === "APPROVED" ? "APPROVED" : "DRAFT";
    
    if (approval.templateId) {
      await prisma.template.update({ where: { id: approval.templateId }, data: { status: finalStatus } });
    }
    if (approval.campaignId) {
      await prisma.campaign.update({ where: { id: approval.campaignId }, data: { status: finalStatus } });
    }
    
    res.json(approval);
  });

  // Preference Center (Compliance)
  app.get("/api/contacts/:id/preferences", async (req, res) => {
    const contact = await prisma.contact.findUnique({
      where: { id: req.params.id },
      include: { listMemberships: { include: { list: true } } }
    });
    const allLists = await prisma.list.findMany({
      where: { organizationId: contact?.organizationId }
    });
    res.json({
      contact,
      memberships: contact?.listMemberships.map(m => m.listId),
      availableLists: allLists
    });
  });

  app.post("/api/contacts/:id/preferences", async (req, res) => {
    const { listIds, source, ipAddress, userAgent } = req.body;
    const contactId = req.params.id;
    const org = await prisma.organization.findFirst();
    
    // Clear existing
    await prisma.listMembership.deleteMany({ where: { contactId } });
    
    // Add new
    if (listIds && listIds.length > 0) {
      await prisma.listMembership.createMany({
        data: listIds.map((listId: string) => ({ contactId, listId }))
      });
    }

    // Log Consent
    await prisma.consentLog.create({
      data: {
        contactId,
        action: "PREFERENCE_UPDATE",
        source: source || "PREFERENCE_CENTER",
        ipAddress,
        userAgent,
        organizationId: org?.id || ""
      }
    });
    
    res.json({ success: true });
  });

  // GDPR Compliance Endpoints
  app.get("/api/compliance/consent-logs", async (req, res) => {
    const org = await prisma.organization.findFirst();
    const logs = await prisma.consentLog.findMany({
      where: { organizationId: org?.id },
      include: { contact: true },
      orderBy: { timestamp: "desc" }
    });
    res.json(logs);
  });

  app.get("/api/compliance/data-requests", async (req, res) => {
    const org = await prisma.organization.findFirst();
    const requests = await prisma.dataRequest.findMany({
      where: { organizationId: org?.id },
      include: { contact: true },
      orderBy: { createdAt: "desc" }
    });
    res.json(requests);
  });

  app.post("/api/compliance/data-requests", async (req, res) => {
    const { contactId, type } = req.body;
    const org = await prisma.organization.findFirst();
    const request = await prisma.dataRequest.create({
      data: { contactId, type, organizationId: org?.id || "" }
    });
    res.json(request);
  });

  app.patch("/api/compliance/data-requests/:id", async (req, res) => {
    const { status } = req.body;
    const request = await prisma.dataRequest.update({
      where: { id: req.params.id },
      data: { status }
    });
    res.json(request);
  });

  // API & Webhooks
app.get("/api/webhooks", async (req, res) => {
  const org = await prisma.organization.findFirst();
  const webhooks = await prisma.webhook.findMany({ where: { organizationId: org?.id } });
  res.json(webhooks);
});

// --- SSO (Enterprise) ---
app.get("/api/auth/sso/config", async (req, res) => {
  const org = await prisma.organization.findFirst();
  if (!org) return res.status(404).json({ error: "Organization not found" });
  res.json({
    ssoEnabled: org.ssoEnabled,
    ssoDomain: org.ssoDomain,
    ssoClientId: org.ssoClientId,
    ssoIssuer: org.ssoIssuer,
    // Don't send the secret to the client
  });
});

app.post("/api/auth/sso/config", async (req, res) => {
  const org = await prisma.organization.findFirst();
  if (!org) return res.status(404).json({ error: "Organization not found" });

  const { ssoEnabled, ssoDomain, ssoClientId, ssoClientSecret, ssoIssuer, ssoEntryPoint, ssoCert } = req.body;
  
  const updated = await prisma.organization.update({
    where: { id: org.id },
    data: {
      ssoEnabled,
      ssoDomain,
      ssoClientId,
      ssoClientSecret,
      ssoIssuer,
      ssoEntryPoint,
      ssoCert,
    },
  });

  res.json(updated);
});

app.get("/api/auth/sso/url", async (req, res) => {
  const { domain } = req.query;
  const org = await prisma.organization.findFirst({
    where: domain ? { ssoDomain: domain as string } : {}
  });

  if (!org || !org.ssoEnabled) {
    return res.status(400).json({ error: "SSO not enabled for this domain" });
  }

  const redirectUri = `${process.env.APP_URL || `http://localhost:3000`}/auth/sso/callback`;

  if (org.ssoIssuer) {
    const params = new URLSearchParams({
      client_id: org.ssoClientId || "",
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid profile email',
      state: org.id,
    });
    return res.json({ url: `${org.ssoIssuer}/authorize?${params.toString()}` });
  }

  // Fallback to mock if no issuer
  return res.json({ 
    url: `/auth/sso/mock-login?orgId=${org.id}`,
    isMock: true 
  });
});

app.get("/auth/sso/callback", async (req, res) => {
  const { code, state: orgId } = req.query;
  
  const org = await prisma.organization.findUnique({ where: { id: orgId as string } });
  if (!org) return res.status(404).send("Organization not found");

  // Simulate user info from IdP
  const email = "enterprise-user@signal.app";
  const name = "Enterprise User";

  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        name,
        organizationId: org.id,
        role: "EDITOR",
        status: "ACTIVE",
        ssoProvider: "OIDC",
        ssoId: `sso-${Date.now()}`
      }
    });
  }

  // Log the user in (Passport session)
  req.login(user, (err) => {
    if (err) return res.status(500).send("Login failed");
    
    res.send(`
      <html>
        <body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background: #F5F2EC; margin: 0;">
          <div style="text-align: center; padding: 40px; background: white; border: 1px solid #1A1814; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
            <h2 style="font-family: serif; margin-top: 0;">SSO Authentication Successful</h2>
            <p style="font-size: 14px; color: #666;">Your enterprise account has been linked successfully.</p>
            <div style="margin: 20px 0; color: #2D5A27; font-weight: bold;">✓ Verified</div>
            <p style="font-size: 10px; color: #999;">This window will close automatically.</p>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'SSO_AUTH_SUCCESS', user: ${JSON.stringify(user)} }, '*');
                setTimeout(() => window.close(), 2000);
              } else {
                window.location.href = '/';
              }
            </script>
          </div>
        </body>
      </html>
    `);
  });
});

app.get("/auth/sso/mock-login", (req, res) => {
  const { orgId } = req.query;
  res.send(`
    <html>
      <body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background: #F5F2EC; margin: 0;">
        <div style="text-align: center; padding: 40px; background: white; border: 1px solid #1A1814; max-width: 400px; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
          <div style="font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em; color: #8B1A1A; margin-bottom: 10px;">Enterprise Portal</div>
          <h2 style="font-family: serif; margin-bottom: 20px; font-size: 24px;">Sign in to SIGNAL</h2>
          <p style="font-size: 12px; color: #666; margin-bottom: 30px; line-height: 1.5;">This is a simulated SSO provider (Auth0/Okta) for demonstration purposes. In production, this would be your corporate login page.</p>
          <button onclick="window.location.href='/auth/sso/callback?code=mock_code&state=${orgId}'" 
                  style="background: #1A1814; color: white; border: none; padding: 14px 24px; cursor: pointer; font-weight: bold; width: 100%; text-transform: uppercase; letter-spacing: 0.05em; transition: opacity 0.2s;">
            Continue with Enterprise ID
          </button>
          <div style="margin-top: 20px; font-size: 10px; color: #999;">Secure Connection via OAuth 2.0</div>
        </div>
      </body>
    </html>
  `);
});

app.post("/api/me/mfa", async (req, res) => {
  const { enabled } = req.body;
  const user = await prisma.user.findFirst();
  if (!user) return res.status(404).json({ error: "User not found" });

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: { mfaEnabled: enabled }
  });
  res.json(updatedUser);
});

// --- Engagement Tracking ---

app.post("/api/engagement", async (req, res) => {
  const { campaignId, contactId, type, value, sectionId, metadata } = req.body;
  
  try {
    const event = await prisma.engagementEvent.create({
      data: {
        campaignId,
        contactId,
        type,
        value: parseFloat(value),
        sectionId,
        metadata: metadata ? JSON.stringify(metadata) : null,
      }
    });
    res.json(event);
  } catch (error) {
    console.error("Error creating engagement event:", error);
    res.status(500).json({ error: "Failed to record engagement" });
  }
});

app.get("/api/campaigns/:id/engagement", async (req, res) => {
  const { id } = req.params;
  
  try {
    const events = await prisma.engagementEvent.findMany({
      where: { campaignId: id },
      orderBy: { timestamp: 'asc' }
    });
    
    // Aggregate data for heatmap and metrics
    const totalReadTime = events
      .filter(e => e.type === 'read_time')
      .reduce((acc, e) => acc + e.value, 0);
      
    const avgScrollDepth = events
      .filter(e => e.type === 'scroll')
      .reduce((acc, e, _, arr) => acc + (e.value / arr.length), 0);
      
    const sectionEngagement = events.reduce((acc: any, e) => {
      if (e.sectionId) {
        if (!acc[e.sectionId]) acc[e.sectionId] = { readTime: 0, views: 0 };
        if (e.type === 'read_time') acc[e.sectionId].readTime += e.value;
        if (e.type === 'scroll') acc[e.sectionId].views += 1;
      }
      return acc;
    }, {});

    res.json({
      events,
      summary: {
        totalReadTime,
        avgScrollDepth,
        sectionEngagement
      }
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch engagement data" });
  }
});

// --- Asset Management ---

app.get("/api/assets", async (req, res) => {
  try {
    const assets = await prisma.asset.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(assets);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch assets" });
  }
});

app.post("/api/assets", async (req, res) => {
  const { name, url, type, metadata } = req.body;
  const org = await prisma.organization.findFirst();
  if (!org) return res.status(404).json({ error: "Organization not found" });

  try {
    const asset = await prisma.asset.create({
      data: {
        name,
        url,
        type,
        metadata: metadata ? JSON.stringify(metadata) : null,
        organizationId: org.id
      }
    });
    res.json(asset);
  } catch (error) {
    res.status(500).json({ error: "Failed to create asset" });
  }
});

app.delete("/api/assets/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.asset.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete asset" });
  }
});

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`SIGNAL Server running on http://localhost:${PORT}`);
});
}

startServer().catch(console.error);
