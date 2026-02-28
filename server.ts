import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "@prisma/client";
import { mjmlTemplates } from "./src/data/mjmlTemplates";

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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`SIGNAL Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);
