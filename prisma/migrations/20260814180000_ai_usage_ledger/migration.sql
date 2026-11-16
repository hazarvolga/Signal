CREATE TABLE "AiUsageLedger" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "pricingVersion" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "imageCount" INTEGER NOT NULL DEFAULT 0,
    "estimatedCostMicros" BIGINT NOT NULL DEFAULT 0,
    "reservedCostMicros" BIGINT NOT NULL DEFAULT 0,
    "latencyMs" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'STARTED',
    "errorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "AiUsageLedger_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AiUsageLedger_organizationId_createdAt_idx"
ON "AiUsageLedger"("organizationId", "createdAt");

CREATE INDEX "AiUsageLedger_organizationId_status_createdAt_idx"
ON "AiUsageLedger"("organizationId", "status", "createdAt");

ALTER TABLE "AiUsageLedger"
ADD CONSTRAINT "AiUsageLedger_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
