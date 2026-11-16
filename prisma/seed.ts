import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Database seeding started...");

  await prisma.flow.deleteMany({});
  await prisma.workflowTemplate.deleteMany({});
  await prisma.tag.deleteMany({});
  await prisma.engagementEvent.deleteMany({});
  await prisma.behavioralEvent.deleteMany({});
  await prisma.consentLog.deleteMany({});
  await prisma.dataRequest.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.apiKey.deleteMany({});
  await prisma.campaign.deleteMany({});
  await prisma.contact.deleteMany({});
  await prisma.list.deleteMany({});
  await prisma.segment.deleteMany({});
  await prisma.form.deleteMany({});
  await prisma.template.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.organization.deleteMany({});

  // 2. Create Default Organization
  const org = await prisma.organization.create({
    data: {
      name: "SIGNAL Broadcast Studio",
      slug: "signal-studio",
      timezone: "Europe/Istanbul",
      logoUrl: "https://example.com/logo.png",
      address: "İstanbul, Türkiye",
    },
  });
  console.log(`✅ Organization created: ${org.name}`);

  // 3. Create Default Admin User
  const user = await prisma.user.create({
    data: {
      email: "admin@signal.local",
      name: "Signal System Admin",
      role: "ADMIN",
      organizationId: org.id,
    },
  });
  console.log(`✅ User created: ${user.email}`);

  // 4. Create Contact Lists
  const productReleaseList = await prisma.list.create({
    data: {
      name: "SIGNAL 2026 Product Subscribers",
      description: "Subscribed product engineering, growth and operations contacts",
      organizationId: org.id,
    },
  });

  const bimGroupList = await prisma.list.create({
    data: {
      name: "Engineering & Architecture Digest",
      description: "Technical product and design newsletter subscribers",
      organizationId: org.id,
    },
  });

  // 5. Create Real Contacts in Database
  const contactsData = [
    {
      email: "ahmet.yilmaz@example.com",
      firstName: "Ahmet",
      lastName: "Yılmaz",
      phone: "+905321002030",
      status: "SUBSCRIBED",
      emailConsent: true,
      tags: { create: [{ name: "Architect" }, { name: "SIGNAL 2026" }] },
      organizationId: org.id,
    },
    {
      email: "elif.kaya@example.com",
      firstName: "Elif",
      lastName: "Kaya",
      phone: "+905332003040",
      status: "SUBSCRIBED",
      emailConsent: true,
      tags: { create: [{ name: "Product Lead" }, { name: "VIP" }] },
      organizationId: org.id,
    },
    {
      email: "mehmet.demir@example.com",
      firstName: "Mehmet",
      lastName: "Demir",
      phone: "+905343004050",
      status: "SUBSCRIBED",
      emailConsent: true,
      tags: { create: [{ name: "Engineering Manager" }] },
      organizationId: org.id,
    },
    {
      email: "can.ozturk@example.com",
      firstName: "Can",
      lastName: "Öztürk",
      phone: "+905354005060",
      status: "SUBSCRIBED",
      emailConsent: true,
      tags: { create: [{ name: "Systems Coordinator" }] },
      organizationId: org.id,
    },
    {
      email: "selin.aksoy@example.com",
      firstName: "Selin",
      lastName: "Aksoy",
      phone: "+905365006070",
      status: "SUBSCRIBED",
      emailConsent: true,
      tags: { create: [{ name: "Product Designer" }] },
      organizationId: org.id,
    },
    {
      email: "deniz.ergin@example.com",
      firstName: "Deniz",
      lastName: "Ergin",
      phone: "+905376007080",
      status: "SUBSCRIBED",
      emailConsent: true,
      tags: { create: [{ name: "Platform Engineer" }, { name: "SIGNAL 2026" }] },
      organizationId: org.id,
    },
  ];

  const createdContacts = [];
  for (const c of contactsData) {
    const contact = await prisma.contact.create({
      data: c,
    });
    createdContacts.push(contact);
  }
  console.log(`✅ ${createdContacts.length} Real database contacts created.`);

  // 6. Create Segment
  const segment = await prisma.segment.create({
    data: {
      name: "SIGNAL 2026 Early Adopters",
      rules: JSON.stringify([{ field: "tags", operator: "contains", value: "SIGNAL 2026" }]),
      organizationId: org.id,
    },
  });

  // 7. Create Template
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; background-color: #1a1814; color: #ffffff; padding: 20px;">
      <div style="max-width: 600px; background: #26231e; margin: 0 auto; padding: 30px; border-top: 4px solid #8B1A1A;">
        <h1 style="color: #ffffff; font-size: 24px;">SIGNAL 2026 Release</h1>
        <p style="color: #d4cfc6; font-size: 16px; line-height: 1.6;">
          Self-hosted campaign orchestration, audience segmentation and durable delivery workflows in one workspace.
        </p>
        <div style="margin: 30px 0; text-align: center;">
          <a href="https://example.com" style="background-color: #8B1A1A; color: #ffffff; padding: 14px 28px; text-decoration: none; font-weight: bold; display: inline-block;">
            Explore SIGNAL 2026
          </a>
        </div>
        <p style="color: #888888; font-size: 12px;">© 2026 SIGNAL Broadcast Studio.</p>
      </div>
    </div>
  `;

  const template = await prisma.template.create({
    data: {
      name: "SIGNAL 2026 Product Release Template",
      category: "ANNOUNCEMENT",
      content: htmlContent,
      status: "APPROVED",
      organizationId: org.id,
    },
  });

  // 8. Create Demo Launch Campaign
  const campaign1 = await prisma.campaign.create({
    data: {
      name: "SIGNAL 2026 Self-Hosted Broadcast Platform Release",
      subject: "SIGNAL 2026 Release Notes & Architecture Walkthrough",
      previewText: "Durable BullMQ queues, MJML editor and multi-provider delivery.",
      fromName: "SIGNAL Editorial",
      fromEmail: "dispatch@signal.local",
      content: htmlContent,
      type: "REGULAR",
      status: "SENT",
      channel: "EMAIL",
      scheduledAt: new Date(Date.now() - 86400000), // Sent 1 day ago
      sentAt: new Date(Date.now() - 86400000),
      organizationId: org.id,
      templateId: template.id,
    },
  });

  const campaign2 = await prisma.campaign.create({
    data: {
      name: "SIGNAL 2026 Automation & Deliverability Workshop",
      subject: "Live Engineering Session: Email Deliverability & Workflows",
      previewText: "Registration is open for our upcoming technical workshop.",
      fromName: "SIGNAL Academy",
      fromEmail: "academy@signal.local",
      content: "SIGNAL 2026 workshop starts soon.",
      type: "REGULAR",
      status: "SCHEDULED",
      channel: "EMAIL",
      scheduledAt: new Date(Date.now() + 172800000), // Scheduled in 2 days
      organizationId: org.id,
    },
  });

  console.log(`✅ Real Campaigns created in DB: "${campaign1.name}" & "${campaign2.name}"`);

  // 9. Add Real Engagement Analytics Events in DB for Campaign 1
  const engagementEvents = [
    { campaignId: campaign1.id, contactId: createdContacts[0].id, type: "open", value: 1.0 },
    { campaignId: campaign1.id, contactId: createdContacts[0].id, type: "click", value: 1.0 },
    { campaignId: campaign1.id, contactId: createdContacts[0].id, type: "read_time", value: 45.0 },
    { campaignId: campaign1.id, contactId: createdContacts[1].id, type: "open", value: 1.0 },
    { campaignId: campaign1.id, contactId: createdContacts[1].id, type: "click", value: 1.0 },
    { campaignId: campaign1.id, contactId: createdContacts[1].id, type: "read_time", value: 60.0 },
    { campaignId: campaign1.id, contactId: createdContacts[2].id, type: "open", value: 1.0 },
    { campaignId: campaign1.id, contactId: createdContacts[2].id, type: "read_time", value: 30.0 },
  ];

  for (const evt of engagementEvents) {
    await prisma.engagementEvent.create({ data: evt });
  }
  console.log(`✅ ${engagementEvents.length} Real engagement events stored in DB.`);

  // 10. Create Real Forms / Landing Pages in DB
  const form1 = await prisma.form.create({
    data: {
      name: "SIGNAL 2026 Sandbox & Demo Request Form",
      config: JSON.stringify({
        type: "landing_page",
        status: "active",
        slug: "demo-2026",
        views: 1250,
        submissions: 180,
        conversionRate: 14.4,
        url: "/demo-2026",
        elements: [
          {
            id: "header",
            type: "text",
            content: "SIGNAL 2026 Sandbox Access Request",
            style: {
              fontSize: "30px",
              fontWeight: "bold",
              color: "#1A1814",
              textAlign: "center",
              marginBottom: "12px",
            },
          },
          {
            id: "subtitle",
            type: "text",
            content: "Yeni nesil BIM ve 3D Modelleme çözümlerini 30 gün boyunca ücretsiz deneyin.",
            style: {
              fontSize: "15px",
              color: "#56534E",
              textAlign: "center",
              marginBottom: "28px",
            },
          },
          {
            id: "name",
            type: "input",
            placeholder: "Adınız Soyadınız *",
            style: {
              width: "100%",
              padding: "14px 16px",
              marginBottom: "16px",
              border: "1px solid #D4CFC6",
              borderRadius: "4px",
              fontSize: "15px",
            },
          },
          {
            id: "email",
            type: "input",
            placeholder: "Kurumsal E-posta Adresiniz *",
            style: {
              width: "100%",
              padding: "14px 16px",
              marginBottom: "16px",
              border: "1px solid #D4CFC6",
              borderRadius: "4px",
              fontSize: "15px",
            },
          },
          {
            id: "company",
            type: "input",
            placeholder: "Firma / Kurum Adı *",
            style: {
              width: "100%",
              padding: "14px 16px",
              marginBottom: "16px",
              border: "1px solid #D4CFC6",
              borderRadius: "4px",
              fontSize: "15px",
            },
          },
          {
            id: "phone",
            type: "input",
            placeholder: "Telefon Numaranız (05XX XXX XX XX) *",
            style: {
              width: "100%",
              padding: "14px 16px",
              marginBottom: "24px",
              border: "1px solid #D4CFC6",
              borderRadius: "4px",
              fontSize: "15px",
            },
          },
          {
            id: "submit_btn",
            type: "button",
            content: "30 Günlük Ücretsiz Demoyu Başlat",
            style: {
              width: "100%",
              padding: "16px",
              backgroundColor: "#8B1A1A",
              color: "#ffffff",
              fontWeight: "bold",
              fontSize: "14px",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            },
          },
        ],
      }),
      organizationId: org.id,
    },
  });

  const form2 = await prisma.form.create({
    data: {
      name: "SIGNAL 2026 Early Access 20% Discount Pop-up",
      config: JSON.stringify({
        type: "popup",
        status: "active",
        views: 3480,
        submissions: 290,
        conversionRate: 8.3,
      }),
      organizationId: org.id,
    },
  });

  // --- DRAFT CAMPAIGNS (For Workflow Blueprints) ---
  const draftCampaign1 = await prisma.campaign.create({
    data: {
      name: "[Blueprint] Welcome Series - Email 1",
      subject: "Welcome to SIGNAL - Let's get started",
      previewText: "Your journey begins here.",
      fromName: "SIGNAL Team",
      fromEmail: "hello@signal.local",
      content: "<h1>Welcome to SIGNAL!</h1><p>We are excited to have you.</p>",
      type: "REGULAR",
      status: "DRAFT",
      channel: "EMAIL",
      organizationId: org.id,
      templateId: template.id,
    },
  });

  const draftCampaign2 = await prisma.campaign.create({
    data: {
      name: "[Blueprint] Abandoned Cart - Reminder",
      subject: "You left something behind...",
      previewText: "Complete your purchase today.",
      fromName: "SIGNAL Sales",
      fromEmail: "sales@signal.local",
      content: "<h1>Don't miss out!</h1><p>Your cart is waiting.</p>",
      type: "REGULAR",
      status: "DRAFT",
      channel: "EMAIL",
      organizationId: org.id,
      templateId: template.id,
    },
  });

  // --- WORKFLOW TEMPLATES ---
  const wt1 = await prisma.workflowTemplate.create({
    data: {
      name: "Welcome Series (3-Part)",
      category: "ONBOARDING",
      description: "A standard 3-part welcome series for new subscribers.",
      nodes: JSON.stringify([
        {
          id: "wt1-1",
          type: "custom",
          position: { x: 250, y: 50 },
          data: {
            label: "On Signup",
            type: "Trigger",
            category: "Trigger",
            icon: "Zap",
            description: "Triggered on signup",
          },
        },
        {
          id: "wt1-2",
          type: "custom",
          position: { x: 250, y: 180 },
          data: {
            label: "Send Email",
            type: "Action",
            category: "Action",
            icon: "Mail",
            description: "Welcome Email 1",
            config: { campaignId: draftCampaign1.id },
          },
        },
      ]),
      edges: JSON.stringify([{ id: "wt1-e1", source: "wt1-1", target: "wt1-2" }]),
      organizationId: org.id,
    },
  });

  const wt2 = await prisma.workflowTemplate.create({
    data: {
      name: "Abandoned Cart Recovery",
      category: "REVENUE",
      description: "Recover lost sales with this 2-step reminder flow.",
      nodes: JSON.stringify([
        {
          id: "wt2-1",
          type: "custom",
          position: { x: 250, y: 50 },
          data: {
            label: "Custom Event",
            type: "Trigger",
            category: "Trigger",
            icon: "ShoppingCart",
            description: "Cart Abandoned",
            config: { eventName: "CART_ABANDONED" },
          },
        },
        {
          id: "wt2-2",
          type: "custom",
          position: { x: 250, y: 180 },
          data: {
            label: "Send Email",
            type: "Action",
            category: "Action",
            icon: "Mail",
            description: "Reminder 1",
            config: { campaignId: draftCampaign2.id },
          },
        },
      ]),
      edges: JSON.stringify([{ id: "wt2-e1", source: "wt2-1", target: "wt2-2" }]),
      organizationId: org.id,
    },
  });

  console.log(`✅ Draft Campaigns for Blueprints seeded.`);
  console.log(`✅ WorkflowTemplates seeded.`);

  // ─── FLOW 4: Win-Back — Re-engage Inactive Contacts ───────────────────────────────────
  const flow4Nodes = [
    {
      id: "wb-1",
      type: "custom",
      position: { x: 250, y: 50 },
      data: {
        label: "Scheduled",
        type: "Trigger",
        category: "Trigger",
        icon: "Clock",
        description: "30+ days since last email open",
        config: { scheduleType: "recurring", intervalDays: 1 },
      },
    },
    {
      id: "wb-2",
      type: "custom",
      position: { x: 250, y: 180 },
      data: {
        label: "Send Email",
        type: "Action",
        category: "Action",
        icon: "Mail",
        description: "We Miss You — Re-engagement email with special offer",
        config: {},
      },
    },
    {
      id: "wb-3",
      type: "custom",
      position: { x: 250, y: 310 },
      data: {
        label: "Wait",
        type: "Logic",
        category: "Delay",
        icon: "Clock",
        description: "Wait 7 days",
        config: { duration: 7, unit: "days" },
      },
    },
    {
      id: "wb-4",
      type: "custom",
      position: { x: 250, y: 440 },
      data: {
        label: "If/Else",
        type: "Logic",
        category: "Condition",
        icon: "Split",
        description: "Did they open the email?",
        config: { conditionType: "EMAIL_OPENED" },
      },
    },
    {
      id: "wb-5",
      type: "custom",
      position: { x: 80, y: 580 },
      data: {
        label: "Add Tag",
        type: "Action",
        category: "Action",
        icon: "Tag",
        description: "Tag: Re-engaged",
        config: {},
      },
    },
    {
      id: "wb-6",
      type: "custom",
      position: { x: 420, y: 580 },
      data: {
        label: "Send Email",
        type: "Action",
        category: "Action",
        icon: "Mail",
        description: "Last chance — exclusive discount before we part ways",
        config: {},
      },
    },
    {
      id: "wb-7",
      type: "custom",
      position: { x: 420, y: 710 },
      data: {
        label: "Wait",
        type: "Logic",
        category: "Delay",
        icon: "Clock",
        description: "Wait 7 more days",
        config: { duration: 7, unit: "days" },
      },
    },
    {
      id: "wb-8",
      type: "custom",
      position: { x: 420, y: 840 },
      data: {
        label: "Add Tag",
        type: "Action",
        category: "Action",
        icon: "Tag",
        description: "Tag: Churned — move to inactive list",
        config: {},
      },
    },
  ];
  const flow4Edges = [
    { id: "wb-e1", source: "wb-1", target: "wb-2" },
    { id: "wb-e2", source: "wb-2", target: "wb-3" },
    { id: "wb-e3", source: "wb-3", target: "wb-4" },
    { id: "wb-e4", source: "wb-4", target: "wb-5", label: "Opened", sourceHandle: "true" },
    { id: "wb-e5", source: "wb-4", target: "wb-6", label: "Not Opened", sourceHandle: "false" },
    { id: "wb-e6", source: "wb-6", target: "wb-7" },
    { id: "wb-e7", source: "wb-7", target: "wb-8" },
  ];
  const flow4 = await prisma.flow.create({
    data: {
      name: "Win-Back — Re-engage Inactive Contacts",
      status: "ACTIVE",
      nodes: JSON.stringify(flow4Nodes),
      edges: JSON.stringify(flow4Edges),
      organizationId: org.id,
    },
  });

  // ─── FLOW 5: Webinar & Event — Full Registration Journey ───────────────────────────────────
  const flow5Nodes = [
    {
      id: "ev-1",
      type: "custom",
      position: { x: 250, y: 50 },
      data: {
        label: "Form Subscribed",
        type: "Trigger",
        category: "Trigger",
        icon: "Zap",
        description: "Contact registered via event registration form",
        config: {},
      },
    },
    {
      id: "ev-2",
      type: "custom",
      position: { x: 250, y: 180 },
      data: {
        label: "Send Email",
        type: "Action",
        category: "Action",
        icon: "Mail",
        description: "Confirmation email — You're registered! Add to calendar.",
        config: {},
      },
    },
    {
      id: "ev-3",
      type: "custom",
      position: { x: 250, y: 310 },
      data: {
        label: "Wait",
        type: "Logic",
        category: "Delay",
        icon: "Clock",
        description: "Wait until 3 days before event",
        config: { duration: 4, unit: "days" },
      },
    },
    {
      id: "ev-4",
      type: "custom",
      position: { x: 250, y: 440 },
      data: {
        label: "Send Email",
        type: "Action",
        category: "Action",
        icon: "Mail",
        description: "3-day reminder — event agenda & what to prepare",
        config: {},
      },
    },
    {
      id: "ev-5",
      type: "custom",
      position: { x: 250, y: 570 },
      data: {
        label: "Wait",
        type: "Logic",
        category: "Delay",
        icon: "Clock",
        description: "Wait until 1 day before event",
        config: { duration: 2, unit: "days" },
      },
    },
    {
      id: "ev-6",
      type: "custom",
      position: { x: 250, y: 700 },
      data: {
        label: "Send Email",
        type: "Action",
        category: "Action",
        icon: "Mail",
        description: "Last reminder — join link & session details",
        config: {},
      },
    },
    {
      id: "ev-7",
      type: "custom",
      position: { x: 250, y: 830 },
      data: {
        label: "Wait",
        type: "Logic",
        category: "Delay",
        icon: "Clock",
        description: "Wait 1 day after event ends",
        config: { duration: 1, unit: "days" },
      },
    },
    {
      id: "ev-8",
      type: "custom",
      position: { x: 250, y: 960 },
      data: {
        label: "Send Email",
        type: "Action",
        category: "Action",
        icon: "Mail",
        description: "Post-event: recording link, slides & next steps",
        config: {},
      },
    },
    {
      id: "ev-9",
      type: "custom",
      position: { x: 250, y: 1090 },
      data: {
        label: "Wait",
        type: "Logic",
        category: "Delay",
        icon: "Clock",
        description: "Wait 7 days",
        config: { duration: 7, unit: "days" },
      },
    },
    {
      id: "ev-10",
      type: "custom",
      position: { x: 250, y: 1220 },
      data: {
        label: "Send Email",
        type: "Action",
        category: "Action",
        icon: "Mail",
        description: "Sales follow-up — ready to take the next step?",
        config: {},
      },
    },
  ];
  const flow5Edges = [
    { id: "ev-e1", source: "ev-1", target: "ev-2" },
    { id: "ev-e2", source: "ev-2", target: "ev-3" },
    { id: "ev-e3", source: "ev-3", target: "ev-4" },
    { id: "ev-e4", source: "ev-4", target: "ev-5" },
    { id: "ev-e5", source: "ev-5", target: "ev-6" },
    { id: "ev-e6", source: "ev-6", target: "ev-7" },
    { id: "ev-e7", source: "ev-7", target: "ev-8" },
    { id: "ev-e8", source: "ev-8", target: "ev-9" },
    { id: "ev-e9", source: "ev-9", target: "ev-10" },
  ];
  const flow5 = await prisma.flow.create({
    data: {
      name: "Webinar & Event — Full Registration Journey",
      status: "ACTIVE",
      nodes: JSON.stringify(flow5Nodes),
      edges: JSON.stringify(flow5Edges),
      organizationId: org.id,
    },
  });

  // ─── FLOW 6: Upsell & Cross-sell — Active Customer Revenue Expansion ───────────────────────────────────
  const flow6Nodes = [
    {
      id: "up-1",
      type: "custom",
      position: { x: 250, y: 50 },
      data: {
        label: "Tag Added",
        type: "Trigger",
        category: "Trigger",
        icon: "Tag",
        description: "Trigger: Tag 'Active Customer' added to contact",
        config: {},
      },
    },
    {
      id: "up-2",
      type: "custom",
      position: { x: 250, y: 180 },
      data: {
        label: "Wait",
        type: "Logic",
        category: "Delay",
        icon: "Clock",
        description: "Wait 30 days — let onboarding complete",
        config: { duration: 30, unit: "days" },
      },
    },
    {
      id: "up-3",
      type: "custom",
      position: { x: 250, y: 310 },
      data: {
        label: "If/Else",
        type: "Logic",
        category: "Condition",
        icon: "Split",
        description: "Is contact on Individual plan?",
        config: { conditionType: "TAG_EXISTS", checkTag: "Individual Plan" },
      },
    },
    {
      id: "up-4",
      type: "custom",
      position: { x: 80, y: 450 },
      data: {
        label: "Send Email",
        type: "Action",
        category: "Action",
        icon: "Mail",
        description: "Upsell: Upgrade to Team Plan — collaborate with your team",
        config: {},
      },
    },
    {
      id: "up-5",
      type: "custom",
      position: { x: 420, y: 450 },
      data: {
        label: "Send Email",
        type: "Action",
        category: "Action",
        icon: "Mail",
        description: "Cross-sell: Unlock Enterprise features — advanced analytics & SSO",
        config: {},
      },
    },
    {
      id: "up-6",
      type: "custom",
      position: { x: 250, y: 590 },
      data: {
        label: "A/B Test",
        type: "Logic",
        category: "Condition",
        icon: "GitBranch",
        description: "A/B Test: Price-focused vs Value/ROI-focused CTA",
        config: { splitPercentage: 50, winnerCriteria: "CLICK_RATE", testDuration: 72 },
      },
    },
    {
      id: "up-7",
      type: "custom",
      position: { x: 100, y: 730 },
      data: {
        label: "Send Email",
        type: "Action",
        category: "Action",
        icon: "Mail",
        description: "Variant A: Save 30% — Limited time pricing offer",
        config: {},
      },
    },
    {
      id: "up-8",
      type: "custom",
      position: { x: 400, y: 730 },
      data: {
        label: "Send Email",
        type: "Action",
        category: "Action",
        icon: "Mail",
        description: "Variant B: 3x your team output — See the ROI",
        config: {},
      },
    },
    {
      id: "up-9",
      type: "custom",
      position: { x: 250, y: 870 },
      data: {
        label: "Wait",
        type: "Logic",
        category: "Delay",
        icon: "Clock",
        description: "Wait 14 days for test results",
        config: { duration: 14, unit: "days" },
      },
    },
    {
      id: "up-10",
      type: "custom",
      position: { x: 250, y: 1000 },
      data: {
        label: "Send Email",
        type: "Action",
        category: "Action",
        icon: "Mail",
        description: "Winner variant sent to remaining audience",
        config: {},
      },
    },
  ];
  const flow6Edges = [
    { id: "up-e1", source: "up-1", target: "up-2" },
    { id: "up-e2", source: "up-2", target: "up-3" },
    { id: "up-e3", source: "up-3", target: "up-4", label: "Individual", sourceHandle: "true" },
    { id: "up-e4", source: "up-3", target: "up-5", label: "Team/Other", sourceHandle: "false" },
    { id: "up-e5", source: "up-4", target: "up-6" },
    { id: "up-e6", source: "up-5", target: "up-6" },
    { id: "up-e7", source: "up-6", target: "up-7", sourceHandle: "a" },
    { id: "up-e8", source: "up-6", target: "up-8", sourceHandle: "b" },
    { id: "up-e9", source: "up-7", target: "up-9" },
    { id: "up-e10", source: "up-8", target: "up-9" },
    { id: "up-e11", source: "up-9", target: "up-10" },
  ];
  const flow6 = await prisma.flow.create({
    data: {
      name: "Upsell & Cross-sell — Active Customer Revenue Expansion",
      status: "ACTIVE",
      nodes: JSON.stringify(flow6Nodes),
      edges: JSON.stringify(flow6Edges),
      organizationId: org.id,
    },
  });

  // ─── FLOW 7: VIP High Engagement — Recognize & Reward Power Users ───────────────────────────────────
  const flow7Nodes = [
    {
      id: "vip-1",
      type: "custom",
      position: { x: 250, y: 50 },
      data: {
        label: "Custom Event",
        type: "Trigger",
        category: "Trigger",
        icon: "Sparkles",
        description: "Triggered when contact opens/clicks 3+ emails in 30 days",
        config: { eventName: "HIGH_ENGAGEMENT_THRESHOLD", threshold: 3, windowDays: 30 },
      },
    },
    {
      id: "vip-2",
      type: "custom",
      position: { x: 250, y: 180 },
      data: {
        label: "Add Tag",
        type: "Action",
        category: "Action",
        icon: "Tag",
        description: "Tag contact as VIP",
        config: { tagName: "VIP" },
      },
    },
    {
      id: "vip-3",
      type: "custom",
      position: { x: 250, y: 310 },
      data: {
        label: "Send Email",
        type: "Action",
        category: "Action",
        icon: "Mail",
        description: "Exclusive early access — you're our VIP",
        config: {},
      },
    },
    {
      id: "vip-4",
      type: "custom",
      position: { x: 250, y: 440 },
      data: {
        label: "Wait",
        type: "Logic",
        category: "Delay",
        icon: "Clock",
        description: "Wait 3 days",
        config: { duration: 3, unit: "days" },
      },
    },
    {
      id: "vip-5",
      type: "custom",
      position: { x: 250, y: 570 },
      data: {
        label: "Send Email",
        type: "Action",
        category: "Action",
        icon: "Mail",
        description: "Referral invite — share & earn rewards",
        config: {},
      },
    },
    {
      id: "vip-6",
      type: "custom",
      position: { x: 250, y: 700 },
      data: {
        label: "Wait",
        type: "Logic",
        category: "Delay",
        icon: "Clock",
        description: "Wait 7 days",
        config: { duration: 7, unit: "days" },
      },
    },
    {
      id: "vip-7",
      type: "custom",
      position: { x: 250, y: 830 },
      data: {
        label: "Send Email",
        type: "Action",
        category: "Action",
        icon: "Mail",
        description: "Account Manager introduction — personal touch",
        config: {},
      },
    },
  ];
  const flow7Edges = [
    { id: "vip-e1", source: "vip-1", target: "vip-2" },
    { id: "vip-e2", source: "vip-2", target: "vip-3" },
    { id: "vip-e3", source: "vip-3", target: "vip-4" },
    { id: "vip-e4", source: "vip-4", target: "vip-5" },
    { id: "vip-e5", source: "vip-5", target: "vip-6" },
    { id: "vip-e6", source: "vip-6", target: "vip-7" },
  ];
  const flow7 = await prisma.flow.create({
    data: {
      name: "VIP High Engagement — Recognize & Reward Power Users",
      status: "ACTIVE",
      nodes: JSON.stringify(flow7Nodes),
      edges: JSON.stringify(flow7Edges),
      organizationId: org.id,
    },
  });

  // ─── FLOW 8: Renewal & Expiry — License Retention Drip ───────────────────────────────────
  const flow8Nodes = [
    {
      id: "ren-1",
      type: "custom",
      position: { x: 250, y: 50 },
      data: {
        label: "Scheduled",
        type: "Trigger",
        category: "Trigger",
        icon: "Clock",
        description: "60 days before license/subscription expiry date",
        config: { scheduleType: "date_based", offsetDays: -60, field: "license_expiry_date" },
      },
    },
    {
      id: "ren-2",
      type: "custom",
      position: { x: 250, y: 180 },
      data: {
        label: "Send Email",
        type: "Action",
        category: "Action",
        icon: "Mail",
        description: "60-day notice — renew early & save 15%",
        config: {},
      },
    },
    {
      id: "ren-3",
      type: "custom",
      position: { x: 250, y: 310 },
      data: {
        label: "Wait",
        type: "Logic",
        category: "Delay",
        icon: "Clock",
        description: "Wait 30 days (30 days remaining)",
        config: { duration: 30, unit: "days" },
      },
    },
    {
      id: "ren-4",
      type: "custom",
      position: { x: 250, y: 440 },
      data: {
        label: "If/Else",
        type: "Logic",
        category: "Condition",
        icon: "Split",
        description: "Has contact renewed already?",
        config: { conditionType: "TAG_EXISTS", checkTag: "Renewed" },
      },
    },
    {
      id: "ren-5",
      type: "custom",
      position: { x: 80, y: 580 },
      data: {
        label: "Add Tag",
        type: "Action",
        category: "Action",
        icon: "Tag",
        description: "Tag: Renewed — exit flow",
        config: { tagName: "Renewed" },
      },
    },
    {
      id: "ren-6",
      type: "custom",
      position: { x: 420, y: 580 },
      data: {
        label: "Send Email",
        type: "Action",
        category: "Action",
        icon: "Mail",
        description: "30-day urgency — your subscription expires soon",
        config: {},
      },
    },
    {
      id: "ren-7",
      type: "custom",
      position: { x: 420, y: 710 },
      data: {
        label: "Wait",
        type: "Logic",
        category: "Delay",
        icon: "Clock",
        description: "Wait 23 days (7 days remaining)",
        config: { duration: 23, unit: "days" },
      },
    },
    {
      id: "ren-8",
      type: "custom",
      position: { x: 420, y: 840 },
      data: {
        label: "Send Email",
        type: "Action",
        category: "Action",
        icon: "Mail",
        description: "7-day critical alert — renew now to avoid interruption",
        config: {},
      },
    },
    {
      id: "ren-9",
      type: "custom",
      position: { x: 420, y: 970 },
      data: {
        label: "Wait",
        type: "Logic",
        category: "Delay",
        icon: "Clock",
        description: "Wait 7 days (expiry day)",
        config: { duration: 7, unit: "days" },
      },
    },
    {
      id: "ren-10",
      type: "custom",
      position: { x: 420, y: 1100 },
      data: {
        label: "Send Email",
        type: "Action",
        category: "Action",
        icon: "Mail",
        description: "License expired — reactivate now & recover your data",
        config: {},
      },
    },
    {
      id: "ren-11",
      type: "custom",
      position: { x: 420, y: 1230 },
      data: {
        label: "Wait",
        type: "Logic",
        category: "Delay",
        icon: "Clock",
        description: "Wait 7 days post-expiry",
        config: { duration: 7, unit: "days" },
      },
    },
    {
      id: "ren-12",
      type: "custom",
      position: { x: 420, y: 1360 },
      data: {
        label: "Send Email",
        type: "Action",
        category: "Action",
        icon: "Mail",
        description: "What you're missing — lost feature access summary",
        config: {},
      },
    },
  ];
  const flow8Edges = [
    { id: "ren-e1", source: "ren-1", target: "ren-2" },
    { id: "ren-e2", source: "ren-2", target: "ren-3" },
    { id: "ren-e3", source: "ren-3", target: "ren-4" },
    { id: "ren-e4", source: "ren-4", target: "ren-5", label: "Renewed", sourceHandle: "true" },
    { id: "ren-e5", source: "ren-4", target: "ren-6", label: "Not Renewed", sourceHandle: "false" },
    { id: "ren-e6", source: "ren-6", target: "ren-7" },
    { id: "ren-e7", source: "ren-7", target: "ren-8" },
    { id: "ren-e8", source: "ren-8", target: "ren-9" },
    { id: "ren-e9", source: "ren-9", target: "ren-10" },
    { id: "ren-e10", source: "ren-10", target: "ren-11" },
    { id: "ren-e11", source: "ren-11", target: "ren-12" },
  ];
  const flow8 = await prisma.flow.create({
    data: {
      name: "Renewal & Expiry — License Retention Drip",
      status: "ACTIVE",
      nodes: JSON.stringify(flow8Nodes),
      edges: JSON.stringify(flow8Edges),
      organizationId: org.id,
    },
  });

  // ─── FLOW 9: Product Activation — Recovery & Onboarding Assist ───────────────────────────────────
  const flow9Nodes = [
    {
      id: "act-1",
      type: "custom",
      position: { x: 250, y: 50 },
      data: {
        label: "Custom Event",
        type: "Trigger",
        category: "Trigger",
        icon: "Sparkles",
        description: "Triggered when product is downloaded but not activated",
        config: { eventName: "PRODUCT_DOWNLOADED" },
      },
    },
    {
      id: "act-2",
      type: "custom",
      position: { x: 250, y: 180 },
      data: {
        label: "Wait",
        type: "Logic",
        category: "Delay",
        icon: "Clock",
        description: "Wait 48 hours",
        config: { duration: 2, unit: "days" },
      },
    },
    {
      id: "act-3",
      type: "custom",
      position: { x: 250, y: 310 },
      data: {
        label: "If/Else",
        type: "Logic",
        category: "Condition",
        icon: "Split",
        description: "Has contact activated the product?",
        config: { conditionType: "TAG_EXISTS", checkTag: "Activated" },
      },
    },
    {
      id: "act-4",
      type: "custom",
      position: { x: 80, y: 450 },
      data: {
        label: "Send Email",
        type: "Action",
        category: "Action",
        icon: "Mail",
        description: "Activated! Here are your first 3 power tips",
        config: {},
      },
    },
    {
      id: "act-5",
      type: "custom",
      position: { x: 420, y: 450 },
      data: {
        label: "Send Email",
        type: "Action",
        category: "Action",
        icon: "Mail",
        description: "Need help getting started? Step-by-step activation guide",
        config: {},
      },
    },
    {
      id: "act-6",
      type: "custom",
      position: { x: 420, y: 580 },
      data: {
        label: "Wait",
        type: "Logic",
        category: "Delay",
        icon: "Clock",
        description: "Wait 3 days",
        config: { duration: 3, unit: "days" },
      },
    },
    {
      id: "act-7",
      type: "custom",
      position: { x: 420, y: 710 },
      data: {
        label: "If/Else",
        type: "Logic",
        category: "Condition",
        icon: "Split",
        description: "Still not activated?",
        config: { conditionType: "TAG_EXISTS", checkTag: "Activated" },
      },
    },
    {
      id: "act-8",
      type: "custom",
      position: { x: 250, y: 850 },
      data: {
        label: "Send Email",
        type: "Action",
        category: "Action",
        icon: "Mail",
        description: "Activated — Welcome aboard! Quick-start checklist",
        config: {},
      },
    },
    {
      id: "act-9",
      type: "custom",
      position: { x: 590, y: 850 },
      data: {
        label: "Send Email",
        type: "Action",
        category: "Action",
        icon: "Mail",
        description: "Book a free 15-min onboarding call with our team",
        config: {},
      },
    },
    {
      id: "act-10",
      type: "custom",
      position: { x: 590, y: 980 },
      data: {
        label: "Wait",
        type: "Logic",
        category: "Delay",
        icon: "Clock",
        description: "Wait 7 days",
        config: { duration: 7, unit: "days" },
      },
    },
    {
      id: "act-11",
      type: "custom",
      position: { x: 590, y: 1110 },
      data: {
        label: "Add Tag",
        type: "Action",
        category: "Action",
        icon: "Tag",
        description: "Tag: Stuck — escalate to sales team",
        config: { tagName: "Stuck" },
      },
    },
  ];
  const flow9Edges = [
    { id: "act-e1", source: "act-1", target: "act-2" },
    { id: "act-e2", source: "act-2", target: "act-3" },
    { id: "act-e3", source: "act-3", target: "act-4", label: "Activated", sourceHandle: "true" },
    { id: "act-e4", source: "act-3", target: "act-5", label: "Not Yet", sourceHandle: "false" },
    { id: "act-e5", source: "act-5", target: "act-6" },
    { id: "act-e6", source: "act-6", target: "act-7" },
    { id: "act-e7", source: "act-7", target: "act-8", label: "Activated", sourceHandle: "true" },
    {
      id: "act-e8",
      source: "act-7",
      target: "act-9",
      label: "Still Inactive",
      sourceHandle: "false",
    },
    { id: "act-e9", source: "act-9", target: "act-10" },
    { id: "act-e10", source: "act-10", target: "act-11" },
  ];
  const flow9 = await prisma.flow.create({
    data: {
      name: "Product Activation — Recovery & Onboarding Assist",
      status: "ACTIVE",
      nodes: JSON.stringify(flow9Nodes),
      edges: JSON.stringify(flow9Edges),
      organizationId: org.id,
    },
  });

  // ─── FLOW 10: Lead Scoring (MQL) & Handover ────────────────────────────
  const flow10Nodes = [
    {
      id: "ls-1",
      type: "custom",
      position: { x: 250, y: 50 },
      data: {
        label: "Custom Event",
        type: "Trigger",
        category: "Trigger",
        icon: "Activity",
        description: "Triggered when Lead Score hits 50 (MQL)",
        config: { eventName: "LEAD_SCORE_50" },
      },
    },
    {
      id: "ls-2",
      type: "custom",
      position: { x: 250, y: 180 },
      data: {
        label: "Add Tag",
        type: "Action",
        category: "Action",
        icon: "Tag",
        description: "Tag: MQL (Marketing Qualified Lead)",
      },
    },
    {
      id: "ls-3",
      type: "custom",
      position: { x: 250, y: 310 },
      data: {
        label: "Send Email",
        type: "Action",
        category: "Action",
        icon: "Mail",
        description: "Sales Outreach: Personalized Introduction",
      },
    },
  ];
  const flow10Edges = [
    { id: "ls-e1", source: "ls-1", target: "ls-2" },
    { id: "ls-e2", source: "ls-2", target: "ls-3" },
  ];
  const flow10 = await prisma.flow.create({
    data: {
      name: "Lead Scoring (MQL) & Sales Handover",
      status: "ACTIVE",
      nodes: JSON.stringify(flow10Nodes),
      edges: JSON.stringify(flow10Edges),
      organizationId: org.id,
    },
  });

  // ─── FLOW 11: GDPR Re-consent & Compliance ─────────────────────────────
  const flow11Nodes = [
    {
      id: "gdpr-1",
      type: "custom",
      position: { x: 250, y: 50 },
      data: {
        label: "Scheduled",
        type: "Trigger",
        category: "Trigger",
        icon: "Clock",
        description: "11 months since last consent",
      },
    },
    {
      id: "gdpr-2",
      type: "custom",
      position: { x: 250, y: 180 },
      data: {
        label: "Send Email",
        type: "Action",
        category: "Action",
        icon: "Mail",
        description: "Action Required: Update your communication preferences",
      },
    },
    {
      id: "gdpr-3",
      type: "custom",
      position: { x: 250, y: 310 },
      data: {
        label: "Wait",
        type: "Logic",
        category: "Delay",
        icon: "Clock",
        description: "Wait 14 days",
      },
    },
    {
      id: "gdpr-4",
      type: "custom",
      position: { x: 250, y: 440 },
      data: {
        label: "If/Else",
        type: "Logic",
        category: "Condition",
        icon: "Split",
        description: "Did they re-consent?",
      },
    },
    {
      id: "gdpr-5",
      type: "custom",
      position: { x: 80, y: 580 },
      data: {
        label: "Add Tag",
        type: "Action",
        category: "Action",
        icon: "Tag",
        description: "Tag: GDPR Consented",
      },
    },
    {
      id: "gdpr-6",
      type: "custom",
      position: { x: 420, y: 580 },
      data: {
        label: "Add Tag",
        type: "Action",
        category: "Action",
        icon: "Tag",
        description: "Tag: Pending Deletion (No Consent)",
      },
    },
  ];
  const flow11Edges = [
    { id: "gdpr-e1", source: "gdpr-1", target: "gdpr-2" },
    { id: "gdpr-e2", source: "gdpr-2", target: "gdpr-3" },
    { id: "gdpr-e3", source: "gdpr-3", target: "gdpr-4" },
    { id: "gdpr-e4", source: "gdpr-4", target: "gdpr-5", label: "Yes" },
    { id: "gdpr-e5", source: "gdpr-4", target: "gdpr-6", label: "No" },
  ];
  const flow11 = await prisma.flow.create({
    data: {
      name: "GDPR Re-consent & Compliance",
      status: "ACTIVE",
      nodes: JSON.stringify(flow11Nodes),
      edges: JSON.stringify(flow11Edges),
      organizationId: org.id,
    },
  });

  // ─── FLOW 12: Preference Center Opt-Down ───────────────────────────────
  const flow12Nodes = [
    {
      id: "pref-1",
      type: "custom",
      position: { x: 250, y: 50 },
      data: {
        label: "Custom Event",
        type: "Trigger",
        category: "Trigger",
        icon: "Filter",
        description: "Contact opted down in Preference Center",
      },
    },
    {
      id: "pref-2",
      type: "custom",
      position: { x: 250, y: 180 },
      data: {
        label: "Send Email",
        type: "Action",
        category: "Action",
        icon: "Mail",
        description: "Confirmed: We'll send you fewer emails",
      },
    },
  ];
  const flow12Edges = [{ id: "pref-e1", source: "pref-1", target: "pref-2" }];
  const flow12 = await prisma.flow.create({
    data: {
      name: "Preference Center Opt-Down Confirmation",
      status: "ACTIVE",
      nodes: JSON.stringify(flow12Nodes),
      edges: JSON.stringify(flow12Edges),
      organizationId: org.id,
    },
  });

  console.log(`✅ Real Forms created in DB: "${form1.name}" & "${form2.name}"`);
  console.log(`✅ 12 Real Working Automations in DB:`);
  console.log(`   4. ${flow4.name}`);
  console.log(`   5. ${flow5.name}`);
  console.log(`   6. ${flow6.name}`);
  console.log(`   7. ${flow7.name}`);
  console.log(`   8. ${flow8.name}`);
  console.log(`   9. ${flow9.name}`);
  console.log(`   10. ${flow10.name}`);
  console.log(`   11. ${flow11.name}`);
  console.log(`   12. ${flow12.name}`);
  console.log("🎉 Database seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
