import { Router } from "express";
import { prisma } from "../services/prisma";
import { geminiService } from "../services/geminiService";
import { AppError } from "../middleware/errorHandler";
import {
  validateBody,
  AISubjectLinesSchema,
  AIPreviewTextSchema,
  AISpamScoreSchema,
  AIPersonalizeSchema,
} from "../lib/schemas";
import type { RouteContext } from "./context";
import { requireAuth, requireRole } from "../middleware/auth";
import { getOrganizationId } from "../lib/authContext";
import { redisService } from "../services/redisService";
import { runWithAiUsageContext } from "../services/aiUsageContext";
import { getAiUsageSummary } from "../services/aiUsageLedger";

export default function registerAiRoutes(_ctx: RouteContext): Router {
  const router = Router();
  router.use("/api/ai", requireAuth);
  router.use("/api/ai", (req, _res, next) =>
    runWithAiUsageContext({ organizationId: getOrganizationId(req) }, next)
  );
  router.get("/api/ai/usage", requireRole("ADMIN", "OWNER"), async (req, res, next) => {
    try {
      res.json(await getAiUsageSummary(getOrganizationId(req)));
    } catch (error) {
      next(error);
    }
  });
  router.use("/api/ai", async (req, res, next) => {
    try {
      const dailyLimit = Math.max(1, Number(process.env.AI_DAILY_REQUEST_LIMIT || 500));
      const date = new Date().toISOString().slice(0, 10);
      const { allowed, remaining, reset } = await redisService.rateLimit(
        `ai-quota:${getOrganizationId(req)}:${date}`,
        dailyLimit,
        24 * 60 * 60
      );
      res.setHeader("X-AI-Quota-Remaining", remaining);
      res.setHeader("X-AI-Quota-Reset", reset);
      if (!allowed) {
        return res.status(429).json({ error: "Daily AI request quota exceeded" });
      }
      next();
    } catch (error) {
      next(error);
    }
  });

  // GAP-002: Validate input before sending to LLM
  router.post(
    "/api/ai/subject-lines",
    validateBody(AISubjectLinesSchema),
    async (req, res, next) => {
      try {
        const { topic } = req.body;
        const lines = await geminiService.generateSubjectLines(topic);
        res.json(lines);
      } catch (err) {
        next(err);
      }
    }
  );

  router.post("/api/ai/generate-image", async (req, res, next) => {
    try {
      const { prompt, aspectRatio = "1:1" } = req.body;
      if (typeof prompt !== "string" || prompt.trim().length < 3 || prompt.length > 2_000) {
        throw new AppError("Image prompt must be between 3 and 2000 characters", 400);
      }
      const dataUrl = await geminiService.generateImage(prompt.trim(), aspectRatio);
      res.json({ dataUrl });
    } catch (err) {
      next(err);
    }
  });

  router.post(
    "/api/ai/optimize-preview",
    validateBody(AIPreviewTextSchema),
    async (req, res, next) => {
      try {
        const { subject, content } = req.body;
        const preview = await geminiService.optimizePreviewText(subject, content);
        res.json({ preview });
      } catch (err) {
        next(err);
      }
    }
  );

  router.post("/api/ai/spam-check", validateBody(AISpamScoreSchema), async (req, res, next) => {
    try {
      const { subject, content } = req.body;
      const result = await geminiService.checkSpamScore(subject, content);
      res.json({
        ...result,
        method: "AI_CONTENT_HEURISTIC",
        disclaimer:
          "This is a content-risk estimate, not an inbox-placement or provider-deliverability test.",
      });
    } catch (err) {
      next(err);
    }
  });

  router.post("/api/ai/adjust-tone", async (req, res, next) => {
    try {
      const { content, tone } = req.body;
      const rewritten = await geminiService.adjustTone(content, tone);
      res.json({ content: rewritten });
    } catch (err) {
      next(err);
    }
  });

  router.post("/api/ai/predict-churn", async (req, res, next) => {
    try {
      const { contactId } = req.body;
      const orgId = getOrganizationId(req);
      const contact = await prisma.contact.findFirst({
        where: { id: contactId, organizationId: orgId },
        include: {
          events: { take: 50, orderBy: { timestamp: "desc" } },
          behavioralEvents: { take: 20, orderBy: { timestamp: "desc" } },
          revenue: { take: 10, orderBy: { timestamp: "desc" } },
        },
      });
      if (!contact) throw new AppError("Contact not found", 404);

      const avgEngagement = await prisma.contact.aggregate({
        where: { organizationId: orgId },
        _avg: { engagementScore: true },
      });

      const risk = await geminiService.predictChurnRisk(contact, {
        averageEngagementScore: avgEngagement._avg.engagementScore,
      });
      res.json(risk);
    } catch (err) {
      next(err);
    }
  });

  router.post("/api/ai/translate", async (req, res, next) => {
    try {
      const { content, language } = req.body;
      const translated = await geminiService.translateContent(content, language);
      res.json({ content: translated });
    } catch (err) {
      next(err);
    }
  });

  router.post("/api/ai/predict-send-time", async (req, res, next) => {
    try {
      const { topic, timezone } = req.body;

      const openEvents = await prisma.event.findMany({
        where: { type: "OPEN", contact: { organizationId: getOrganizationId(req) } },
        select: { timestamp: true },
      });

      const hourlyStats: Record<number, number> = {};
      openEvents.forEach((e) => {
        const hour = new Date(e.timestamp).getUTCHours();
        hourlyStats[hour] = (hourlyStats[hour] || 0) + 1;
      });

      const prediction = await geminiService.predictBestSendTime(topic, hourlyStats, timezone);
      res.json(prediction);
    } catch (err) {
      next(err);
    }
  });

  router.post("/api/ai/generate-content", async (req, res, next) => {
    try {
      const { brief, tone } = req.body;
      const result = await geminiService.generateFullContent(brief, tone);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  router.post("/api/ai/churn-prediction", async (req, res, next) => {
    try {
      const orgId = getOrganizationId(req);

      const atRiskContacts = await prisma.contact.findMany({
        where: {
          organizationId: orgId,
          status: "SUBSCRIBED",
          engagementScore: { lt: 40 },
        },
        take: 10,
        orderBy: { engagementScore: "asc" },
        include: { tags: true },
      });

      const predictions = await Promise.all(
        atRiskContacts.map(async (c) => {
          const risk = await geminiService.predictChurnRisk(c);
          return {
            name: `${c.firstName || ""} ${c.lastName || ""}`.trim() || c.email,
            email: c.email,
            score: c.engagementScore,
            prob: `${Math.round(risk.probability * 100)}%`,
            risk: risk.riskLevel,
            reasons: risk.reasons,
          };
        })
      );

      const stats = await prisma.contact.groupBy({
        by: ["status"],
        where: { organizationId: orgId },
        _count: true,
      });

      res.json({
        summary: {
          high: predictions.filter((p) => p.risk === "HIGH").length * 10,
          medium: predictions.filter((p) => p.risk === "MEDIUM").length * 15,
          low: stats.find((s) => s.status === "SUBSCRIBED")?._count || 0,
        },
        topAtRisk: predictions,
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
