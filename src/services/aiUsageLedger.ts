import { AppError } from "../middleware/errorHandler";
import { prisma } from "./prisma";
import { aiBudgetRejectionsTotal, aiEstimatedCostMicrosTotal, aiTokensTotal } from "./metrics";

export const AI_PRICING_VERSION = process.env.AI_PRICING_VERSION || "google-2026-08-14";

type UsageMetadata = {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
};

type PricingEnvironment = Record<string, string | undefined>;

const PRICING = {
  "gemini-3-flash-preview": {
    inputEnv: "AI_GEMINI_3_FLASH_INPUT_USD_PER_MILLION",
    inputDefault: 0.5,
    outputEnv: "AI_GEMINI_3_FLASH_OUTPUT_USD_PER_MILLION",
    outputDefault: 3,
    imageEnv: null,
    imageDefault: 0,
  },
  "gemini-2.5-flash-image": {
    inputEnv: "AI_GEMINI_2_5_FLASH_IMAGE_INPUT_USD_PER_MILLION",
    inputDefault: 0.3,
    outputEnv: null,
    outputDefault: 0,
    imageEnv: "AI_GEMINI_2_5_FLASH_IMAGE_USD_PER_IMAGE",
    imageDefault: 0.039,
  },
} as const;

function positivePrice(env: PricingEnvironment, name: string | null, fallback: number): number {
  if (!name || env[name] === undefined || env[name] === "") return fallback;
  const value = Number(env[name]);
  if (!Number.isFinite(value) || value < 0)
    throw new Error(`${name} must be a non-negative number`);
  return value;
}

export function parseUsdToMicros(value: string): bigint {
  if (!/^\d+(?:\.\d{1,6})?$/.test(value)) {
    throw new Error("USD budget must be a non-negative decimal with at most 6 places");
  }
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * 1_000_000n + BigInt(fraction.padEnd(6, "0"));
}

export function calculateAiCostMicros(
  model: keyof typeof PRICING,
  usage: UsageMetadata = {},
  imageCount = 0,
  env: PricingEnvironment = process.env
): bigint {
  const pricing = PRICING[model];
  const inputTokens = Math.max(0, usage.promptTokenCount || 0);
  const outputTokens = Math.max(0, usage.candidatesTokenCount || 0);
  const inputRate = positivePrice(env, pricing.inputEnv, pricing.inputDefault);
  const outputRate = positivePrice(env, pricing.outputEnv, pricing.outputDefault);
  const imageRate = positivePrice(env, pricing.imageEnv, pricing.imageDefault);
  return BigInt(
    Math.ceil(
      inputTokens * inputRate + outputTokens * outputRate + imageCount * imageRate * 1_000_000
    )
  );
}

function monthStart(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

function monthlyBudgetMicros(): bigint {
  return parseUsdToMicros(process.env.AI_MONTHLY_BUDGET_USD || "25");
}

function reservationMicros(kind: "text" | "image"): bigint {
  const variable =
    kind === "image" ? "AI_IMAGE_REQUEST_RESERVATION_USD" : "AI_TEXT_REQUEST_RESERVATION_USD";
  const fallback = kind === "image" ? "0.05" : "0.25";
  return parseUsdToMicros(process.env[variable] || fallback);
}

function reservationTtlMs(): number {
  const minutes = Number(process.env.AI_RESERVATION_TTL_MINUTES || 15);
  if (!Number.isInteger(minutes) || minutes < 5 || minutes > 1_440) {
    throw new Error("AI_RESERVATION_TTL_MINUTES must be an integer between 5 and 1440");
  }
  return minutes * 60_000;
}

export async function reserveAiUsage(input: {
  organizationId: string;
  feature: string;
  model: keyof typeof PRICING;
  kind: "text" | "image";
}): Promise<{ id: string; startedAt: number }> {
  const reservation = reservationMicros(input.kind);
  const budget = monthlyBudgetMicros();
  const ledger = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${input.organizationId}), hashtext('signal-ai-budget'))`;
    await tx.aiUsageLedger.updateMany({
      where: {
        organizationId: input.organizationId,
        status: "STARTED",
        createdAt: { lt: new Date(Date.now() - reservationTtlMs()) },
      },
      data: {
        status: "FAILED",
        errorCode: "STALE_RESERVATION",
        reservedCostMicros: 0n,
        completedAt: new Date(),
      },
    });
    const aggregate = await tx.aiUsageLedger.aggregate({
      where: {
        organizationId: input.organizationId,
        createdAt: { gte: monthStart() },
        status: { in: ["STARTED", "SUCCEEDED"] },
      },
      _sum: { estimatedCostMicros: true, reservedCostMicros: true },
    });
    const used =
      (aggregate._sum.estimatedCostMicros || 0n) + (aggregate._sum.reservedCostMicros || 0n);
    if (used + reservation > budget) {
      aiBudgetRejectionsTotal.inc();
      throw new AppError("Monthly AI budget exceeded", 429);
    }
    return tx.aiUsageLedger.create({
      data: {
        organizationId: input.organizationId,
        feature: input.feature,
        provider: "GOOGLE_GEMINI",
        model: input.model,
        pricingVersion: AI_PRICING_VERSION,
        reservedCostMicros: reservation,
      },
      select: { id: true },
    });
  });
  return { id: ledger.id, startedAt: Date.now() };
}

export async function completeAiUsage(input: {
  id: string;
  model: keyof typeof PRICING;
  usage?: UsageMetadata;
  imageCount?: number;
  startedAt: number;
}): Promise<void> {
  const usage = input.usage || {};
  const imageCount = Math.max(0, input.imageCount || 0);
  const inputTokens = Math.max(0, usage.promptTokenCount || 0);
  const outputTokens = Math.max(0, usage.candidatesTokenCount || 0);
  const totalTokens = Math.max(inputTokens + outputTokens, usage.totalTokenCount || 0);
  const cost = calculateAiCostMicros(input.model, usage, imageCount);
  await prisma.aiUsageLedger.update({
    where: { id: input.id },
    data: {
      inputTokens,
      outputTokens,
      totalTokens,
      imageCount,
      estimatedCostMicros: cost,
      reservedCostMicros: 0n,
      latencyMs: Math.max(0, Date.now() - input.startedAt),
      status: "SUCCEEDED",
      completedAt: new Date(),
    },
  });
  aiTokensTotal.inc(
    { provider: "GOOGLE_GEMINI", model: input.model, direction: "input" },
    inputTokens
  );
  aiTokensTotal.inc(
    { provider: "GOOGLE_GEMINI", model: input.model, direction: "output" },
    outputTokens
  );
  aiEstimatedCostMicrosTotal.inc({ provider: "GOOGLE_GEMINI", model: input.model }, Number(cost));
}

export async function failAiUsage(id: string, startedAt: number, error: unknown): Promise<void> {
  await prisma.aiUsageLedger.update({
    where: { id },
    data: {
      reservedCostMicros: 0n,
      latencyMs: Math.max(0, Date.now() - startedAt),
      status: "FAILED",
      errorCode: error instanceof Error ? error.name.slice(0, 100) : "UnknownError",
      completedAt: new Date(),
    },
  });
}

export async function getAiUsageSummary(organizationId: string): Promise<{
  month: string;
  budgetMicros: string;
  usedMicros: string;
  remainingMicros: string;
  requests: number;
}> {
  const start = monthStart();
  const [aggregate, requests] = await Promise.all([
    prisma.aiUsageLedger.aggregate({
      where: { organizationId, createdAt: { gte: start }, status: "SUCCEEDED" },
      _sum: { estimatedCostMicros: true },
    }),
    prisma.aiUsageLedger.count({
      where: { organizationId, createdAt: { gte: start }, status: "SUCCEEDED" },
    }),
  ]);
  const budget = monthlyBudgetMicros();
  const used = aggregate._sum.estimatedCostMicros || 0n;
  return {
    month: start.toISOString().slice(0, 7),
    budgetMicros: budget.toString(),
    usedMicros: used.toString(),
    remainingMicros: (budget > used ? budget - used : 0n).toString(),
    requests,
  };
}
