import { Router } from "express";
import { prisma } from "../services/prisma";
import { AppError } from "../middleware/errorHandler";
import type { RouteContext } from "./context";
import { requireAuth, requireRole } from "../middleware/auth";
import { getOrganizationId } from "../lib/authContext";
import { parseAndValidateWorkflowGraph } from "../services/workflow/graph";
import { normalizeWorkflowTemplateNodes } from "../services/workflow/templateGraph";
import { enqueueWorkflowEvent } from "../services/workflow/queue";
import { redisService } from "../services/redisService";

const FLOW_STATUSES = new Set(["DRAFT", "ACTIVE", "PAUSED"]);

function validatedGraphInput(
  nodes: unknown,
  edges: unknown,
  status: unknown
): { nodes: string; edges: string } {
  let parsedNodes: unknown;
  let parsedEdges: unknown;
  try {
    parsedNodes = typeof nodes === "string" ? JSON.parse(nodes) : (nodes ?? []);
    parsedEdges = typeof edges === "string" ? JSON.parse(edges) : (edges ?? []);
  } catch {
    throw new AppError("Flow nodes and edges must be valid JSON", 400);
  }
  if (
    status === "DRAFT" &&
    Array.isArray(parsedNodes) &&
    parsedNodes.length === 0 &&
    Array.isArray(parsedEdges) &&
    parsedEdges.length === 0
  ) {
    return { nodes: "[]", edges: "[]" };
  }
  let graph;
  try {
    graph = parseAndValidateWorkflowGraph(parsedNodes, parsedEdges, {
      allowIncomplete: status === "DRAFT",
    });
  } catch (error) {
    throw new AppError(error instanceof Error ? error.message : "Invalid workflow graph", 400);
  }
  return {
    nodes: JSON.stringify(graph.nodes),
    edges: JSON.stringify(graph.edges),
  };
}

export default function registerFlowRoutes(ctx: RouteContext): Router {
  const router = Router();
  router.use("/api/flows", requireAuth);
  router.use("/api/workflow-templates", requireAuth);
  router.use("/api/events", requireAuth);
  router.use("/api/analytics", requireAuth);
  router.use("/api/stats", requireAuth);

  router.get("/api/flows", async (req, res, next) => {
    try {
      const flows = await prisma.flow.findMany({
        where: { organizationId: getOrganizationId(req) },
        orderBy: { updatedAt: "desc" },
      });
      res.json(flows);
    } catch (err) {
      next(err);
    }
  });

  router.post("/api/flows", requireRole("EDITOR", "ADMIN", "OWNER"), async (req, res, next) => {
    try {
      const { name, nodes, edges, status, scheduledAt } = req.body;
      const requestedStatus = status || "DRAFT";
      if (
        typeof name !== "string" ||
        !name.trim() ||
        name.length > 200 ||
        !FLOW_STATUSES.has(requestedStatus)
      ) {
        throw new AppError("Invalid flow name or status", 400);
      }
      const graph = validatedGraphInput(nodes, edges, requestedStatus);
      const flow = await prisma.flow.create({
        data: {
          name: name.trim(),
          nodes: graph.nodes,
          edges: graph.edges,
          status: requestedStatus,
          scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
          organizationId: getOrganizationId(req),
        },
      });
      res.json(flow);
    } catch (err) {
      next(err);
    }
  });

  router.get("/api/flows/:id", async (req, res, next) => {
    try {
      const flow = await prisma.flow.findFirst({
        where: { id: req.params.id, organizationId: getOrganizationId(req) },
      });
      if (!flow) throw new AppError("Flow not found", 404);
      res.json(flow);
    } catch (err) {
      next(err);
    }
  });

  router.patch(
    "/api/flows/:id",
    requireRole("EDITOR", "ADMIN", "OWNER"),
    async (req, res, next) => {
      try {
        const { name, nodes, edges, status, scheduledAt } = req.body;
        const existingFlow = await prisma.flow.findFirst({
          where: { id: req.params.id, organizationId: getOrganizationId(req) },
          select: { id: true, nodes: true, edges: true, status: true },
        });
        if (!existingFlow) throw new AppError("Flow not found", 404);
        const requestedStatus = status ?? existingFlow.status;
        if (!FLOW_STATUSES.has(requestedStatus)) {
          throw new AppError("Invalid flow status", 400);
        }
        if (name !== undefined && (typeof name !== "string" || !name.trim() || name.length > 200)) {
          throw new AppError("Invalid flow name", 400);
        }
        const graph = validatedGraphInput(
          nodes ?? existingFlow.nodes,
          edges ?? existingFlow.edges,
          requestedStatus
        );
        const flow = await prisma.flow.update({
          where: { id: existingFlow.id },
          data: {
            ...(name && { name: name.trim() }),
            nodes: graph.nodes,
            edges: graph.edges,
            status: requestedStatus,
            ...(scheduledAt !== undefined && {
              scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
            }),
          },
        });
        res.json(flow);
      } catch (err) {
        next(err);
      }
    }
  );

  router.delete(
    "/api/flows/:id",
    requireRole("EDITOR", "ADMIN", "OWNER"),
    async (req, res, next) => {
      try {
        const result = await prisma.flow.deleteMany({
          where: { id: req.params.id, organizationId: getOrganizationId(req) },
        });
        if (result.count === 0) throw new AppError("Flow not found", 404);
        res.json({ success: true });
      } catch (err) {
        next(err);
      }
    }
  );

  router.get("/api/flows/:id/analytics", async (req, res, next) => {
    try {
      const flow = await prisma.flow.findFirst({
        where: { id: req.params.id, organizationId: getOrganizationId(req) },
      });
      if (!flow) throw new AppError("Flow not found", 404);

      const graph = parseAndValidateWorkflowGraph(flow.nodes, flow.edges, {
        allowIncomplete: flow.status !== "ACTIVE",
      });
      const [runCounts, nodeCounts] = await Promise.all([
        prisma.flowExecution.groupBy({
          by: ["status"],
          where: { flowId: flow.id, organizationId: getOrganizationId(req) },
          _count: { _all: true },
        }),
        prisma.flowNodeExecution.groupBy({
          by: ["nodeId", "status"],
          where: {
            organizationId: getOrganizationId(req),
            execution: { flowId: flow.id },
          },
          _count: { _all: true },
        }),
      ]);
      const analytics: Record<string, unknown> = {};
      for (const node of graph.nodes) {
        const counts = nodeCounts.filter((entry) => entry.nodeId === node.id);
        const count = (status: string) =>
          counts.find((entry) => entry.status === status)?._count._all ?? 0;
        const processed = counts.reduce((sum, entry) => sum + entry._count._all, 0);
        analytics[node.id] = {
          processed,
          completed: count("COMPLETED"),
          waiting: count("WAITING"),
          retrying: count("RETRY"),
          failed: count("FAILED"),
          dataStatus: processed > 0 ? "LIVE" : "NO_EXECUTIONS",
        };
      }
      analytics._summary = Object.fromEntries(
        runCounts.map((entry) => [entry.status.toLowerCase(), entry._count._all])
      );

      res.json(analytics);
    } catch (err) {
      next(err);
    }
  });

  router.get("/api/flows/:id/executions", async (req, res, next) => {
    try {
      const organizationId = getOrganizationId(req);
      const flow = await prisma.flow.findFirst({
        where: { id: req.params.id, organizationId },
        select: { id: true },
      });
      if (!flow) throw new AppError("Flow not found", 404);
      const executions = await prisma.flowExecution.findMany({
        where: { flowId: flow.id, organizationId },
        orderBy: { createdAt: "desc" },
        take: 100,
        include: { nodeExecutions: { orderBy: { createdAt: "asc" } } },
      });
      res.json(executions);
    } catch (err) {
      next(err);
    }
  });

  router.get("/api/workflow-templates", async (req, res, next) => {
    try {
      const templates = await prisma.workflowTemplate.findMany({
        where: {
          OR: [{ organizationId: null }, { organizationId: getOrganizationId(req) }],
        },
        orderBy: { category: "asc" },
      });
      res.json(templates);
    } catch (err) {
      next(err);
    }
  });

  router.post(
    "/api/flows/from-template",
    requireRole("EDITOR", "ADMIN", "OWNER"),
    async (req, res, next) => {
      try {
        const orgId = getOrganizationId(req);
        const { templateId } = req.body;
        const template = await prisma.workflowTemplate.findFirst({
          where: {
            id: templateId,
            OR: [{ organizationId: null }, { organizationId: orgId }],
          },
        });
        if (!template) throw new AppError("Template not found", 404);
        const normalizedNodes = normalizeWorkflowTemplateNodes(template.nodes);
        const graph = validatedGraphInput(normalizedNodes, template.edges, "DRAFT");

        const flow = await prisma.flow.create({
          data: {
            name: `${template.name} (Copy)`,
            nodes: graph.nodes,
            edges: graph.edges,
            organizationId: orgId,
            status: "DRAFT",
          },
        });
        res.json(flow);
      } catch (err) {
        next(err);
      }
    }
  );

  router.get("/api/events", async (req, res, next) => {
    try {
      const events = await prisma.event.findMany({
        where: { contact: { organizationId: getOrganizationId(req) } },
        include: { contact: true },
        orderBy: { timestamp: "desc" },
        take: 100,
      });
      res.json(events);
    } catch (err) {
      next(err);
    }
  });

  router.post("/api/events", requireRole("EDITOR", "ADMIN", "OWNER"), async (req, res, next) => {
    try {
      const { type, metadata, contactId, campaignId, variationId } = req.body;
      const orgId = getOrganizationId(req);
      const contact = await prisma.contact.findFirst({
        where: { id: contactId, organizationId: orgId },
        select: { id: true },
      });
      if (!contact) throw new AppError("Contact not found", 404);
      if (campaignId) {
        const campaign = await prisma.campaign.findFirst({
          where: { id: campaignId, organizationId: orgId },
          select: { id: true },
        });
        if (!campaign) throw new AppError("Campaign not found", 404);
      }

      if (type === "BOUNCE" || type === "COMPLAINT") {
        await prisma.contact.update({
          where: { id: contactId },
          data: { status: type === "BOUNCE" ? "BOUNCED" : "COMPLAINED" },
        });
      }

      const event = await ctx.createEventAndBroadcast({
        type,
        metadata,
        contactId,
        campaignId,
        variationId,
      });

      res.json(event);
    } catch (err) {
      next(err);
    }
  });

  router.post(
    "/api/events/behavioral",
    requireRole("EDITOR", "ADMIN", "OWNER"),
    async (req, res, next) => {
      try {
        const orgId = getOrganizationId(req);
        const { email, name, properties } = req.body;

        let contact = await prisma.contact.findUnique({
          where: { email_organizationId: { email, organizationId: orgId } },
        });

        if (!contact) {
          contact = await prisma.contact.create({
            data: {
              email,
              organizationId: orgId,
              status: "UNSUBSCRIBED",
              emailConsent: false,
              source: "BEHAVIORAL_EVENT",
            },
          });
        }

        const event = await prisma.behavioralEvent.create({
          data: {
            name,
            properties: JSON.stringify(properties || {}),
            contactId: contact.id,
            organizationId: orgId,
          },
          include: { contact: true },
        });

        ctx.io.to(`${orgId}:dashboard-live`).emit("live-activity", {
          id: event.id,
          type: "BEHAVIORAL",
          eventName: event.name,
          contactName: event.contact
            ? `${event.contact.firstName} ${event.contact.lastName}`
            : "Unknown",
          timestamp: event.timestamp,
          properties: properties || {},
        });

        await enqueueWorkflowEvent({
          eventId: event.id,
          organizationId: orgId,
          contactId: contact.id,
          eventType: "BEHAVIORAL",
          eventName: event.name,
          metadata: properties || {},
        });

        res.json(event);
      } catch (err) {
        next(err);
      }
    }
  );

  router.post("/api/amp/submit", async (req, res, _next) => {
    const { campaignId, contactId, type, ...data } = req.body;

    const origin = req.headers.origin || (req.query.__amp_source_origin as string);
    res.setHeader("Access-Control-Allow-Origin", origin || "*");
    res.setHeader("AMP-Access-Control-Allow-Source-Origin", origin || "*");
    res.setHeader("Access-Control-Expose-Headers", "AMP-Access-Control-Allow-Source-Origin");

    if (!campaignId || !contactId || !type) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    try {
      const [campaign, contact] = await Promise.all([
        prisma.campaign.findUnique({
          where: { id: campaignId },
          select: { id: true, organizationId: true },
        }),
        prisma.contact.findUnique({
          where: { id: contactId },
          select: { id: true, organizationId: true },
        }),
      ]);

      if (!campaign || !contact || campaign.organizationId !== contact.organizationId) {
        return res.status(404).json({ message: "Invalid campaign or contact recipient" });
      }

      const remoteAddress = req.ip || "unknown";
      const limit = await redisService.rateLimit(
        `ratelimit:amp-submit:${contactId}:${remoteAddress}`,
        30,
        60
      );
      if (!limit.allowed) {
        return res.status(429).json({ message: "Too many requests. Please wait." });
      }

      await ctx.createEventAndBroadcast({
        type: "AMP_INTERACTION",
        contactId,
        campaignId,
        metadata: JSON.stringify(data),
      });
      res.json({ message: "Success", data });
    } catch {
      res.status(500).json({ message: "Error saving response" });
    }
  });

  router.get("/api/analytics/deliverability", async (req, res, next) => {
    try {
      const orgId = getOrganizationId(req);
      const statusCounts = await prisma.recipientDelivery.groupBy({
        by: ["status"],
        where: { organizationId: orgId },
        _count: { _all: true },
      });
      const counts = Object.fromEntries(
        statusCounts.map(({ status, _count }) => [status, _count._all])
      );
      const delivered = counts.DELIVERED || 0;
      const bounces = counts.BOUNCED || 0;
      const complaints = counts.COMPLAINED || 0;
      const pendingProviderConfirmation = counts.ACCEPTED || 0;
      const finalized = delivered + bounces + complaints;
      const percentage = (value: number) =>
        finalized > 0 ? Number(((value / finalized) * 100).toFixed(1)) : 0;

      res.json({
        deliveryRate: percentage(delivered),
        complaintRate: percentage(complaints),
        bounceRate: percentage(bounces),
        pendingProviderConfirmation,
        measurementNote:
          "Provider delivery does not prove primary-inbox placement; inbox/spam placement requires a seed-testing provider.",
        timeSeries: [
          {
            date: "Current",
            delivered: percentage(delivered),
            complaints: percentage(complaints),
            bounce: percentage(bounces),
          },
        ],
      });
    } catch (err) {
      next(err);
    }
  });

  router.get("/api/analytics/funnel", async (req, res, next) => {
    try {
      const orgId = getOrganizationId(req);
      const [events, sentCount] = await Promise.all([
        prisma.event.findMany({
          where: { contact: { organizationId: orgId } },
          select: { type: true },
        }),
        prisma.recipientDelivery.count({
          where: {
            organizationId: orgId,
            status: { in: ["ACCEPTED", "DELIVERED", "BOUNCED", "COMPLAINED"] },
          },
        }),
      ]);
      const openCount = events.filter((e) => e.type === "OPEN" || e.type === "OPENED").length;
      const clickCount = events.filter((e) => e.type === "CLICK" || e.type === "CLICKED").length;
      const conversionCount = events.filter(
        (e) => e.type === "CONVERSION" || e.type === "PURCHASE"
      ).length;

      const base = sentCount || 1;

      res.json({
        steps: [
          { name: "Sent", count: sentCount, percentage: 100 },
          {
            name: "Opened",
            count: openCount,
            percentage: Number(((openCount / base) * 100).toFixed(1)),
          },
          {
            name: "Clicked",
            count: clickCount,
            percentage: Number(((clickCount / base) * 100).toFixed(1)),
          },
          {
            name: "Converted",
            count: conversionCount,
            percentage: Number(((conversionCount / base) * 100).toFixed(1)),
          },
        ],
      });
    } catch (err) {
      next(err);
    }
  });

  router.get("/api/analytics/cohorts", async (req, res, next) => {
    try {
      const orgId = getOrganizationId(req);
      const contacts = await prisma.contact.findMany({
        where: { organizationId: orgId },
        select: { id: true, createdAt: true, events: { select: { timestamp: true } } },
      });

      const cohortMap: Record<string, { size: number; activeByMonth: Set<string>[] }> = {};
      contacts.forEach((c) => {
        const month = c.createdAt.toISOString().slice(0, 7);
        cohortMap[month] ||= { size: 0, activeByMonth: [] };
        cohortMap[month].size += 1;
        const cohortStart = new Date(`${month}-01T00:00:00.000Z`);
        c.events.forEach(({ timestamp }) => {
          const monthOffset =
            (timestamp.getUTCFullYear() - cohortStart.getUTCFullYear()) * 12 +
            timestamp.getUTCMonth() -
            cohortStart.getUTCMonth();
          if (monthOffset >= 0 && monthOffset < 12) {
            cohortMap[month].activeByMonth[monthOffset] ||= new Set<string>();
            cohortMap[month].activeByMonth[monthOffset].add(c.id);
          }
        });
      });

      const cohorts = Object.entries(cohortMap).map(([month, cohort]) => ({
        month,
        size: cohort.size,
        retention: cohort.activeByMonth.map((active) =>
          Number((((active?.size || 0) / cohort.size) * 100).toFixed(1))
        ),
      }));

      res.json({ cohorts });
    } catch (err) {
      next(err);
    }
  });

  router.get("/api/stats/summary", async (req, res, next) => {
    try {
      const orgId = getOrganizationId(req);
      const [
        totalSubscribers,
        totalCampaigns,
        activeCampaigns,
        totalSent,
        totalBounced,
        totalOpens,
        clickedDeliveries,
        totalUnsubscribes,
        revenue,
      ] = await Promise.all([
        prisma.contact.count({
          where: {
            organizationId: orgId,
            status: "SUBSCRIBED",
            emailConsent: true,
          },
        }),
        prisma.campaign.count({ where: { organizationId: orgId } }),
        prisma.campaign.count({
          where: { organizationId: orgId, status: { in: ["SCHEDULED", "SENDING"] } },
        }),
        prisma.recipientDelivery.count({
          where: {
            organizationId: orgId,
            status: { in: ["ACCEPTED", "DELIVERED", "BOUNCED", "COMPLAINED"] },
          },
        }),
        prisma.recipientDelivery.count({
          where: { organizationId: orgId, status: "BOUNCED" },
        }),
        prisma.trackingEventReceipt.count({
          where: { kind: "OPEN", organizationId: orgId },
        }),
        prisma.trackingEventReceipt.findMany({
          where: { kind: "CLICK", organizationId: orgId },
          distinct: ["recipientDeliveryId"],
          select: { recipientDeliveryId: true },
        }),
        prisma.event.count({
          where: { type: "UNSUBSCRIBE", contact: { organizationId: orgId } },
        }),
        prisma.revenue.aggregate({
          where: { organizationId: orgId, campaignId: { not: null } },
          _sum: { amount: true },
        }),
      ]);
      const now = new Date();
      const currentMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

      const months: Array<{ label: string; start: Date; end: Date }> = [];
      for (let i = 5; i >= 0; i--) {
        const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
        const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i + 1, 1));
        const label = start.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
        months.push({ label, start, end });
      }

      const [orgContacts, unsubs] = await Promise.all([
        prisma.contact.findMany({
          where: { organizationId: orgId },
          select: { createdAt: true, status: true },
        }),
        prisma.event.findMany({
          where: { type: "UNSUBSCRIBE", contact: { organizationId: orgId } },
          select: { timestamp: true },
        }),
      ]);

      const growthData = months.map(({ label, start, end }) => {
        const subsUpToMonth = orgContacts.filter(
          (c) => c.createdAt < end && c.status === "SUBSCRIBED"
        ).length;
        const churnInMonth = unsubs.filter((u) => u.timestamp >= start && u.timestamp < end).length;
        return {
          month: label,
          date: start.toISOString(),
          subscribers: subsUpToMonth,
          churn: churnInMonth,
        };
      });

      const acquisitionThisMonth = orgContacts.filter(
        (c) => c.createdAt >= currentMonthStart
      ).length;
      const retentionRate =
        totalSubscribers > 0
          ? Math.max(
              0,
              Math.min(
                100,
                Number(
                  (((totalSubscribers - totalUnsubscribes) / totalSubscribers) * 100).toFixed(1)
                )
              )
            )
          : 0;

      const totalClicks = clickedDeliveries.length;
      const percentage = (value: number) =>
        totalSent > 0 ? Number(((value / totalSent) * 100).toFixed(1)) : 0;

      res.json({
        totalSubscribers,
        totalCampaigns,
        activeCampaigns,
        totalSent,
        totalOpens,
        avgOpenRate: percentage(totalOpens),
        avgClickRate: percentage(totalClicks),
        bounceRate: percentage(totalBounced),
        unsubscribeRate: percentage(totalUnsubscribes),
        revenueAttributed: revenue._sum.amount || 0,
        retentionRate,
        acquisitionThisMonth,
        growthData,
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
