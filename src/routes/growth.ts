import { Router } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import type { RouteContext } from "./context";
import { requireAuth, requireRole } from "../middleware/auth";
import { getOrganizationId } from "../lib/authContext";
import { validateBody } from "../lib/schemas";
import { prisma } from "../services/prisma";
import crypto from "node:crypto";
import { redisService } from "../services/redisService";
import { verifyReferralToken } from "../lib/referralToken";
import {
  verifyReferralVerificationToken,
} from "../lib/referralVerificationToken";
import { enqueueReferralVerification } from "../services/email/referralVerificationQueue";

const RewardTierSchema = z.object({
  referrals: z.number().int().min(1).max(1_000_000),
  reward: z.string().trim().min(1).max(160),
  active: z.boolean(),
}).strict();

const ReferralAttributionSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(320),
}).strict();

async function materializeClaimsForReferrer(organizationId: string, referrerEmail: string) {
  const [referralCount, tiers, existingClaims] = await Promise.all([
    prisma.growthReferral.count({
      where: {
        organizationId,
        referrerEmail,
        status: { in: ["VERIFIED", "REWARDED"] },
      },
    }),
    prisma.growthRewardTier.findMany({ where: { organizationId, active: true } }),
    prisma.growthRewardClaim.findMany({ where: { organizationId, referrerEmail }, select: { rewardTierId: true } }),
  ]);
  const existingTierIds = new Set(existingClaims.map((claim) => claim.rewardTierId));
  const eligibleTiers = tiers.filter((tier) => tier.referrals <= referralCount && !existingTierIds.has(tier.id));
  if (!eligibleTiers.length) return;
  await prisma.growthRewardClaim.createMany({
    data: eligibleTiers.map((tier) => ({ organizationId, rewardTierId: tier.id, referrerEmail, referralCount })),
    skipDuplicates: true,
  });
}

async function materializeClaimsForTier(organizationId: string, rewardTierId: string, threshold: number) {
  const grouped = await prisma.growthReferral.groupBy({
    by: ["referrerEmail"],
    where: {
      organizationId,
      status: { in: ["VERIFIED", "REWARDED"] },
    },
    _count: { _all: true },
  });
  const eligible = grouped.filter((item) => item._count._all >= threshold);
  if (!eligible.length) return;
  await prisma.growthRewardClaim.createMany({
    data: eligible.map((item) => ({
      organizationId, rewardTierId, referrerEmail: item.referrerEmail, referralCount: item._count._all,
    })),
    skipDuplicates: true,
  });
}

export default function registerGrowthRoutes(_ctx: RouteContext): Router {
  const router = Router();

  const resolveReferral = async (token: string) => {
    const attribution = verifyReferralToken(token);
    if (!attribution) return null;
    const contact = await prisma.contact.findFirst({
      where: { id: attribution.contactId, organizationId: attribution.organizationId },
      select: { id: true, email: true, organizationId: true },
    });
    return contact ? { attribution, contact } : null;
  };

  router.get("/api/public/referrals/:token", async (req, res, next) => {
    try {
      const resolved = await resolveReferral(req.params.token);
      if (!resolved) {
        res.status(404).json({ error: "Referral link not found." });
        return;
      }
      const rewards = await prisma.growthRewardTier.findMany({
        where: { organizationId: resolved.contact.organizationId, active: true },
        orderBy: { referrals: "asc" },
        select: { id: true, referrals: true, reward: true },
      });
      const [referralCount, claims] = await Promise.all([
        prisma.growthReferral.count({
          where: { organizationId: resolved.contact.organizationId, referrerEmail: resolved.contact.email.toLowerCase() },
        }),
        prisma.growthRewardClaim.findMany({
          where: { organizationId: resolved.contact.organizationId, referrerEmail: resolved.contact.email.toLowerCase() },
          select: { id: true, rewardTierId: true, status: true, referralCount: true },
        }),
      ]);
      res.json({ rewards, progress: { referralCount, claims } });
    } catch (error) {
      next(error);
    }
  });

  router.post("/api/public/referrals/:token", validateBody(ReferralAttributionSchema), async (req, res, next) => {
    try {
      const resolved = await resolveReferral(req.params.token);
      if (!resolved) {
        res.status(404).json({ error: "Referral link not found." });
        return;
      }
      const referredEmail = req.body.email.toLowerCase();
      if (referredEmail === resolved.contact.email.toLowerCase()) {
        res.status(400).json({ error: "A subscriber cannot refer the same email address." });
        return;
      }

      const remoteAddress = req.ip || req.socket.remoteAddress || "unknown";
      const rateKey = crypto.createHash("sha256").update(`${req.params.token}:${remoteAddress}`).digest("hex");
      const limit = await redisService.rateLimit(`ratelimit:referral:${rateKey}`, 10, 3_600);
      if (!limit.allowed) {
        res.status(429).json({ error: "Too many referral attempts. Please try again later." });
        return;
      }

      const referral = await prisma.growthReferral.create({
        data: {
          organizationId: resolved.contact.organizationId,
          referrerEmail: resolved.contact.email.toLowerCase(),
          referredEmail,
          status: "ATTRIBUTED",
        },
      });
      let verificationQueued = true;
      try {
        await enqueueReferralVerification(referral.id);
      } catch {
        verificationQueued = false;
        await prisma.growthReferral.update({
          where: { id: referral.id },
          data: {
            verificationEmailStatus: "FAILED",
            verificationEmailLastError: "Verification queue unavailable",
          },
        });
      }
      res.status(201).json({
        success: true,
        referralId: referral.id,
        verificationRequired: true,
        verificationQueued,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        res.status(409).json({ error: "This email has already been attributed." });
        return;
      }
      next(error);
    }
  });

  router.post("/api/public/referrals/verify/:token", async (req, res, next) => {
    try {
      const verificationSecret = process.env.SESSION_SECRET || "";
      const payload = verifyReferralVerificationToken(req.params.token, verificationSecret);
      if (!payload) {
        res.status(400).json({ error: "Referral verification link is invalid or expired." });
        return;
      }

      const remoteAddress = req.ip || req.socket.remoteAddress || "unknown";
      const rateKey = crypto.createHash("sha256").update(`${payload.referralId}:${remoteAddress}`).digest("hex");
      const limit = await redisService.rateLimit(`ratelimit:referral-verification:${rateKey}`, 20, 3_600);
      if (!limit.allowed) {
        res.status(429).json({ error: "Too many verification attempts. Please try again later." });
        return;
      }

      const referral = await prisma.growthReferral.findUnique({ where: { id: payload.referralId } });
      if (!referral) {
        res.status(404).json({ error: "Referral verification record was not found." });
        return;
      }
      if (referral.status === "VERIFIED" || referral.status === "REWARDED") {
        res.json({ success: true, alreadyVerified: true });
        return;
      }
      if (referral.status !== "ATTRIBUTED") {
        res.status(409).json({ error: "Referral cannot be verified in its current state." });
        return;
      }

      const updated = await prisma.growthReferral.updateMany({
        where: { id: referral.id, status: "ATTRIBUTED" },
        data: { status: "VERIFIED", verifiedAt: new Date() },
      });
      if (updated.count === 0) {
        res.status(409).json({ error: "Referral verification state changed. Please retry." });
        return;
      }
      await materializeClaimsForReferrer(referral.organizationId, referral.referrerEmail);
      res.json({ success: true, alreadyVerified: false });
    } catch (error) {
      next(error);
    }
  });

  router.use("/api/growth", requireAuth);

  router.get("/api/growth", async (req, res, next) => {
    try {
      const organizationId = getOrganizationId(req);
      const [rewards, groupedReferrers, totalReferrals, claims, pendingVerifications] = await Promise.all([
        prisma.growthRewardTier.findMany({ where: { organizationId }, orderBy: { referrals: "asc" } }),
        prisma.growthReferral.groupBy({
          by: ["referrerEmail"],
          where: { organizationId },
          _count: { _all: true },
          _min: { createdAt: true },
          orderBy: { _count: { referrerEmail: "desc" } },
          take: 50,
        }),
        prisma.growthReferral.count({ where: { organizationId } }),
        prisma.growthRewardClaim.findMany({ where: { organizationId }, orderBy: { createdAt: "desc" }, take: 100 }),
        prisma.growthReferral.findMany({
          where: { organizationId, status: "ATTRIBUTED" },
          orderBy: { createdAt: "desc" },
          take: 100,
          select: {
            id: true,
            referredEmail: true,
            referrerEmail: true,
            verificationEmailStatus: true,
            verificationEmailAttempts: true,
            verificationEmailSentAt: true,
            verificationEmailLastError: true,
            createdAt: true,
          },
        }),
      ]);

      const rewardById = new Map(rewards.map((reward) => [reward.id, reward]));

      res.json({
        metrics: {
          totalReferrals,
          activeReferrers: groupedReferrers.length,
          rewardsClaimed: claims.filter((claim) => claim.status === "CLAIMED").length,
        },
        rewards,
        topReferrers: groupedReferrers.map((item) => ({
          email: item.referrerEmail,
          referrals: item._count._all,
          joined: item._min.createdAt?.toISOString() || "",
        })),
        claims: claims.map((claim) => ({
          ...claim,
          reward: rewardById.get(claim.rewardTierId)?.reward || "Archived reward",
          requiredReferrals: rewardById.get(claim.rewardTierId)?.referrals || 0,
        })),
        pendingVerifications,
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/api/growth/verification-health", async (req, res, next) => {
    try {
      const organizationId = getOrganizationId(req);
      const [grouped, recentFailures] = await Promise.all([
        prisma.growthReferral.groupBy({
          by: ["verificationEmailStatus"],
          where: { organizationId },
          _count: { _all: true },
        }),
        prisma.growthReferral.findMany({
          where: { organizationId, verificationEmailStatus: "FAILED" },
          orderBy: { updatedAt: "desc" },
          take: 5,
          select: {
            id: true,
            referredEmail: true,
            verificationEmailAttempts: true,
            verificationEmailLastError: true,
            updatedAt: true,
          },
        }),
      ]);
      const count = (status: string) => grouped.find((item) => item.verificationEmailStatus === status)?._count._all || 0;
      res.json({
        counts: { pending: count("PENDING"), accepted: count("ACCEPTED"), failed: count("FAILED") },
        recentFailures,
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/api/growth/rewards", requireRole("EDITOR", "ADMIN", "OWNER"), validateBody(RewardTierSchema), async (req, res, next) => {
    try {
      const tier = await prisma.growthRewardTier.create({ data: { ...req.body, organizationId: getOrganizationId(req) } });
      if (tier.active) await materializeClaimsForTier(tier.organizationId, tier.id, tier.referrals);
      res.status(201).json(tier);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        res.status(409).json({ error: "A reward tier already uses this referral threshold." });
        return;
      }
      next(error);
    }
  });

  router.put("/api/growth/rewards/:id", requireRole("EDITOR", "ADMIN", "OWNER"), validateBody(RewardTierSchema), async (req, res, next) => {
    try {
      const organizationId = getOrganizationId(req);
      const existing = await prisma.growthRewardTier.findFirst({ where: { id: req.params.id, organizationId } });
      if (!existing) {
        res.status(404).json({ error: "Reward tier not found." });
        return;
      }
      const tier = await prisma.growthRewardTier.update({ where: { id: existing.id }, data: req.body });
      if (tier.active) await materializeClaimsForTier(tier.organizationId, tier.id, tier.referrals);
      res.json(tier);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        res.status(409).json({ error: "A reward tier already uses this referral threshold." });
        return;
      }
      next(error);
    }
  });

  router.post("/api/growth/claims/:id/claim", requireRole("ADMIN", "OWNER"), async (req, res, next) => {
    try {
      const organizationId = getOrganizationId(req);
      const existing = await prisma.growthRewardClaim.findFirst({ where: { id: req.params.id, organizationId } });
      if (!existing) {
        res.status(404).json({ error: "Reward claim not found." });
        return;
      }
      if (existing.status === "CLAIMED") {
        res.json(existing);
        return;
      }
      const claim = await prisma.growthRewardClaim.update({
        where: { id: existing.id },
        data: { status: "CLAIMED", claimedAt: new Date() },
      });
      res.json(claim);
    } catch (error) {
      next(error);
    }
  });

  router.post("/api/growth/referrals/:id/resend-verification", requireRole("ADMIN", "OWNER"), async (req, res, next) => {
    try {
      const organizationId = getOrganizationId(req);
      const referral = await prisma.growthReferral.findFirst({
        where: { id: req.params.id, organizationId, status: "ATTRIBUTED" },
      });
      if (!referral) {
        res.status(404).json({ error: "Pending referral verification was not found." });
        return;
      }
      await prisma.growthReferral.update({
        where: { id: referral.id },
        data: { verificationEmailStatus: "PENDING", verificationEmailLastError: null },
      });
      await enqueueReferralVerification(referral.id);
      res.status(202).json({ queued: true });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
