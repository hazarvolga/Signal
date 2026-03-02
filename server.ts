import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "@prisma/client";
import { mjmlTemplates } from "./src/data/mjmlTemplates";
import { geminiService } from "./src/services/geminiService";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

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
          nodes: JSON.stringify([{ id: '1', type: 'trigger', data: { label: 'User Signed Up' } }]),
          edges: "[]"
        },
        {
          name: "Product First Use Guide",
          description: "Step-by-step guide for first-time product usage via email or in-app.",
          category: "ONBOARDING",
          nodes: JSON.stringify([{ id: '1', type: 'trigger', data: { label: 'First Login' } }]),
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
}

async function startServer() {
  await seed();
  
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- API Routes ---

  // Auth / Org Context (Simulated for now)
  app.get("/api/me", async (req, res) => {
    const user = await prisma.user.findFirst({
      include: { organization: true },
    });
    res.json(user);
  });

  // Dashboard Summary
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

app.listen(PORT, "0.0.0.0", () => {
  console.log(`SIGNAL Server running on http://localhost:${PORT}`);
});
}

startServer().catch(console.error);
