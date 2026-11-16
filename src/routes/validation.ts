import { Router } from "express";
import multer from "multer";
import { parse } from "csv-parse/sync";
import { prisma } from "../services/prisma";
import { redisService } from "../services/redisService";
import { ValidationEngine } from "../services/validation/engine";
import { AppError } from "../middleware/errorHandler";
import type { RouteContext } from "./context";
import { requireAuth, requireRole } from "../middleware/auth";
import { getOrganizationId } from "../lib/authContext";

const upload = multer({ storage: multer.memoryStorage() });

export default function registerValidationRoutes(ctx: RouteContext): Router {
  const router = Router();
  router.use("/api/validate", requireAuth);
  router.use("/api/validation-logs", requireAuth);

  router.post("/api/validate", async (req, res, next) => {
    try {
      const { email } = req.body;
      const orgId = getOrganizationId(req);

      const rateLimitKey = `rl:validate:${orgId}`;
      const { allowed, remaining, reset } = await redisService.rateLimit(rateLimitKey, 10, 1);

      res.set("X-RateLimit-Remaining", remaining.toString());
      res.set("X-RateLimit-Reset", reset.toString());

      if (!allowed) {
        throw new AppError("Too many requests", 429);
      }

      const result = await ValidationEngine.validate(email);

      await prisma.validationLog.create({
        data: {
          email,
          status: result.status,
          score: result.score,
          confidence: result.confidence,
          details: JSON.stringify(result.details),
          organizationId: orgId,
        },
      });

      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  router.post(
    "/api/validate-bulk",
    requireRole("EDITOR", "ADMIN", "OWNER"),
    upload.single("file"),
    async (req, res, next) => {
      try {
        const orgId = getOrganizationId(req);
        if (!req.file) throw new AppError("No file uploaded", 400);

        const content = req.file.buffer.toString();
        const records = parse(content, { columns: true, skip_empty_lines: true });
        const emails = records.map((r: any) => r.email).filter(Boolean);

        if (!ctx.validationQueue) {
          throw new AppError("Bulk validation service is unavailable (Redis not configured)", 503);
        }

        const job = await prisma.bulkValidationJob.create({
          data: {
            name: req.file.originalname,
            organizationId: orgId,
            totalCount: emails.length,
          },
        });

        await ctx.validationQueue.add("process-bulk", { jobId: job.id, emails });

        res.json({ jobId: job.id, message: "Bulk validation started" });
      } catch (err) {
        next(err);
      }
    }
  );

  router.get("/api/validate-bulk/:id", async (req, res, next) => {
    try {
      const job = await prisma.bulkValidationJob.findFirst({
        where: { id: req.params.id, organizationId: getOrganizationId(req) },
        include: { results: { take: 100 } },
      });
      res.json(job);
    } catch (err) {
      next(err);
    }
  });

  router.get("/api/validation-logs", async (req, res, next) => {
    try {
      const logs = await prisma.validationLog.findMany({
        where: { organizationId: getOrganizationId(req) },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
      res.json(logs);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
