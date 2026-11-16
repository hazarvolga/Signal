if (process.env.AI_LEDGER_ALLOW_FIXTURE !== "true") {
  throw new Error("Refusing to create AI ledger fixtures without AI_LEDGER_ALLOW_FIXTURE=true");
}

const { PrismaClient } = await import("@prisma/client");
const prisma = new PrismaClient();
const organizationId = "ai-ledger-smoke-org";
process.env.AI_TEXT_REQUEST_RESERVATION_USD = "0.0005";
process.env.AI_RESERVATION_TTL_MINUTES = "15";

try {
  const databaseRows = await prisma.$queryRawUnsafe("SELECT current_database() AS name");
  const databaseName = String(databaseRows[0]?.name || "");
  if (!/(test|ci|smoke|load|dr)/i.test(databaseName)) {
    throw new Error(`Refusing to create AI ledger fixtures in non-test database: ${databaseName}`);
  }

  await prisma.aiUsageLedger.deleteMany({ where: { organizationId } });
  await prisma.organization.deleteMany({ where: { id: organizationId } });
  await prisma.organization.create({
    data: { id: organizationId, name: "AI Ledger Smoke", slug: "ai-ledger-smoke" },
  });

  const { AI_PRICING_VERSION, reserveAiUsage, completeAiUsage, failAiUsage, getAiUsageSummary } =
    await import("../src/services/aiUsageLedger.ts");

  const reservation = await reserveAiUsage({
    organizationId,
    feature: "ci_smoke",
    model: "gemini-3-flash-preview",
    kind: "text",
  });
  await completeAiUsage({
    id: reservation.id,
    model: "gemini-3-flash-preview",
    usage: { promptTokenCount: 1_000, candidatesTokenCount: 500, totalTokenCount: 1_500 },
    startedAt: reservation.startedAt,
  });

  const ledger = await prisma.aiUsageLedger.findUniqueOrThrow({ where: { id: reservation.id } });
  if (
    ledger.status !== "SUCCEEDED" ||
    ledger.estimatedCostMicros !== 2_000n ||
    ledger.reservedCostMicros !== 0n ||
    ledger.totalTokens !== 1_500
  ) {
    throw new Error("AI ledger completion values do not match expected usage");
  }

  const summary = await getAiUsageSummary(organizationId);
  if (summary.usedMicros !== "2000" || summary.requests !== 1) {
    throw new Error("AI ledger monthly summary does not match completed usage");
  }

  const staleId = "ai-ledger-smoke-stale";
  await prisma.aiUsageLedger.create({
    data: {
      id: staleId,
      organizationId,
      feature: "ci_stale_reservation",
      provider: "GOOGLE_GEMINI",
      model: "gemini-3-flash-preview",
      pricingVersion: AI_PRICING_VERSION,
      reservedCostMicros: 1_000n,
      createdAt: new Date(Date.now() - 20 * 60_000),
    },
  });

  process.env.AI_MONTHLY_BUDGET_USD = "0.0025";
  const recoveredReservation = await reserveAiUsage({
    organizationId,
    feature: "ci_stale_recovery",
    model: "gemini-3-flash-preview",
    kind: "text",
  });
  const stale = await prisma.aiUsageLedger.findUniqueOrThrow({ where: { id: staleId } });
  if (
    stale.status !== "FAILED" ||
    stale.errorCode !== "STALE_RESERVATION" ||
    stale.reservedCostMicros !== 0n
  ) {
    throw new Error("Stale AI reservation was not recovered safely");
  }
  await failAiUsage(recoveredReservation.id, recoveredReservation.startedAt, new Error("Smoke cleanup"));

  process.env.AI_MONTHLY_BUDGET_USD = "0.001";
  let rejected = false;
  try {
    await reserveAiUsage({
      organizationId,
      feature: "ci_budget_rejection",
      model: "gemini-3-flash-preview",
      kind: "text",
    });
  } catch (error) {
    rejected = error instanceof Error && error.message === "Monthly AI budget exceeded";
  }
  if (!rejected) throw new Error("AI budget gate did not reject an over-budget reservation");

  console.log(
    "AI ledger smoke passed: 1500 tokens, cost=2000 micros, stale reservation recovered, over-budget request rejected"
  );
} finally {
  await prisma.aiUsageLedger.deleteMany({ where: { organizationId } }).catch(() => undefined);
  await prisma.organization.deleteMany({ where: { id: organizationId } }).catch(() => undefined);
  await prisma.$disconnect();
}
