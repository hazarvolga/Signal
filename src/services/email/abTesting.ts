import { createHash } from "crypto";
import { prisma } from "../prisma";

export interface WeightedVariation {
  id: string;
  weight: number;
}

export interface ABEvent {
  type: string;
  variationId: string | null;
  contactId: string;
}

export interface ABWinnerInput {
  sentAt: Date | null;
  testDurationHours: number;
  winnerCriteria: "OPEN_RATE" | "CLICK_RATE";
  variations: WeightedVariation[];
  events: ABEvent[];
  now: Date;
  minimumSamplePerVariation: number;
}

export interface ABVariationMetric {
  variationId: string;
  accepted: number;
  opens: number;
  clicks: number;
  rate: number;
}

export type ABWinnerResult =
  | { selected: true; winnerId: string; metrics: ABVariationMetric[] }
  | {
      selected: false;
      reason: "TEST_WINDOW_OPEN" | "INSUFFICIENT_SAMPLE" | "TIE" | "INVALID_VARIATIONS";
      metrics: ABVariationMetric[];
    };

function configuredMinimumSample(): number {
  const configured = Number(process.env.AB_MIN_SAMPLE_PER_VARIATION || 50);
  return Number.isFinite(configured) && configured >= 1
    ? Math.floor(configured)
    : 50;
}

function validatedVariations(variations: WeightedVariation[]): WeightedVariation[] {
  const sorted = [...variations].sort((left, right) => left.id.localeCompare(right.id));
  if (
    sorted.length < 2 ||
    sorted.some(({ id, weight }) => !id || !Number.isFinite(weight) || weight <= 0)
  ) {
    throw new Error("A/B campaigns require at least two positively weighted variations");
  }
  return sorted;
}

export function deterministicBucket(campaignId: string, contactId: string): number {
  const hex = createHash("sha256")
    .update(`${campaignId}:${contactId}`, "utf8")
    .digest("hex")
    .slice(0, 13);
  return Number.parseInt(hex, 16) / 0x10000000000000;
}

export function selectVariationForBucket(
  bucket: number,
  variations: WeightedVariation[]
): WeightedVariation {
  if (!Number.isFinite(bucket) || bucket < 0 || bucket >= 1) {
    throw new Error("A/B allocation bucket must be between 0 inclusive and 1 exclusive");
  }
  const sorted = validatedVariations(variations);
  const totalWeight = sorted.reduce((sum, variation) => sum + variation.weight, 0);
  let boundary = 0;
  for (const variation of sorted) {
    boundary += variation.weight / totalWeight;
    if (bucket < boundary) return variation;
  }
  return sorted[sorted.length - 1];
}

export function selectDeterministicVariation(
  campaignId: string,
  contactId: string,
  variations: WeightedVariation[]
): WeightedVariation {
  return selectVariationForBucket(
    deterministicBucket(campaignId, contactId),
    variations
  );
}

export function evaluateABWinner(input: ABWinnerInput): ABWinnerResult {
  let variations: WeightedVariation[];
  try {
    variations = validatedVariations(input.variations);
  } catch {
    return { selected: false, reason: "INVALID_VARIATIONS", metrics: [] };
  }

  const metrics = variations.map(({ id: variationId }) => {
    const events = input.events.filter((event) => event.variationId === variationId);
    const acceptedContacts = new Set(
      events
        .filter((event) => event.type === "ACCEPTED" || event.type === "DELIVERED")
        .map((event) => event.contactId)
    );
    const openContacts = new Set(
      events.filter((event) => event.type === "OPEN").map((event) => event.contactId)
    );
    const clickContacts = new Set(
      events.filter((event) => event.type === "CLICK").map((event) => event.contactId)
    );
    const qualifiedNumerator = [...(input.winnerCriteria === "CLICK_RATE"
      ? clickContacts
      : openContacts)].filter((contactId) => acceptedContacts.has(contactId)).length;
    return {
      variationId,
      accepted: acceptedContacts.size,
      opens: openContacts.size,
      clicks: clickContacts.size,
      rate: acceptedContacts.size > 0 ? qualifiedNumerator / acceptedContacts.size : 0,
    };
  });

  if (
    !input.sentAt ||
    input.now.getTime() <
      input.sentAt.getTime() + Math.max(1, input.testDurationHours) * 60 * 60 * 1000
  ) {
    return { selected: false, reason: "TEST_WINDOW_OPEN", metrics };
  }
  if (
    metrics.some(
      (metric) => metric.accepted < Math.max(1, input.minimumSamplePerVariation)
    )
  ) {
    return { selected: false, reason: "INSUFFICIENT_SAMPLE", metrics };
  }

  const ranked = [...metrics].sort(
    (left, right) =>
      right.rate - left.rate || left.variationId.localeCompare(right.variationId)
  );
  if (ranked[0].rate === ranked[1].rate) {
    return { selected: false, reason: "TIE", metrics };
  }
  return { selected: true, winnerId: ranked[0].variationId, metrics };
}

export async function evaluateAndPersistABWinner(
  campaignId: string,
  organizationId: string,
  now = new Date(),
  minimumSamplePerVariation = configuredMinimumSample()
): Promise<ABWinnerResult> {
  const result = await evaluateABCampaignWinner(
    campaignId,
    organizationId,
    now,
    minimumSamplePerVariation
  );
  if (!result.selected) return result;

  await prisma.$transaction([
    prisma.campaignVariation.updateMany({
      where: { campaignId },
      data: { isWinner: false },
    }),
    prisma.campaignVariation.update({
      where: { id: result.winnerId, campaignId },
      data: { isWinner: true },
    }),
    prisma.campaign.update({
      where: { id: campaignId },
      data: {
        winnerVariationId: result.winnerId,
        abTestStatus: "WINNER_SELECTED",
        abFinalizedAt: now,
      },
    }),
  ]);
  return result;
}

export async function evaluateABCampaignWinner(
  campaignId: string,
  organizationId: string,
  now = new Date(),
  minimumSamplePerVariation = configuredMinimumSample()
): Promise<ABWinnerResult> {
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, organizationId, type: "AB" },
    select: {
      id: true,
      abTestStartedAt: true,
      testDuration: true,
      winnerCriteria: true,
      variations: {
        select: { id: true, weight: true },
        orderBy: { id: "asc" },
      },
      events: {
        where: {
          type: { in: ["ACCEPTED", "DELIVERED", "OPEN", "CLICK"] },
          variationId: { not: null },
        },
        select: { type: true, variationId: true, contactId: true },
      },
    },
  });
  if (!campaign) throw new Error("A/B campaign not found");
  if (!["OPEN_RATE", "CLICK_RATE"].includes(campaign.winnerCriteria || "")) {
    return { selected: false, reason: "INVALID_VARIATIONS", metrics: [] };
  }

  const result = evaluateABWinner({
    sentAt: campaign.abTestStartedAt,
    testDurationHours: campaign.testDuration || 4,
    winnerCriteria: campaign.winnerCriteria as "OPEN_RATE" | "CLICK_RATE",
    variations: campaign.variations,
    events: campaign.events,
    now,
    minimumSamplePerVariation,
  });
  return result;
}
