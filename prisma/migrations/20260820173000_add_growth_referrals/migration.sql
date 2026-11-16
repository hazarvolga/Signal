CREATE TABLE "GrowthRewardTier" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "referrals" INTEGER NOT NULL,
  "reward" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GrowthRewardTier_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "GrowthReferral" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "referrerEmail" TEXT NOT NULL,
  "referredEmail" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'VERIFIED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GrowthReferral_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "GrowthRewardTier_organizationId_referrals_key" ON "GrowthRewardTier"("organizationId", "referrals");
CREATE INDEX "GrowthRewardTier_organizationId_active_idx" ON "GrowthRewardTier"("organizationId", "active");
CREATE UNIQUE INDEX "GrowthReferral_organizationId_referredEmail_key" ON "GrowthReferral"("organizationId", "referredEmail");
CREATE INDEX "GrowthReferral_organizationId_referrerEmail_idx" ON "GrowthReferral"("organizationId", "referrerEmail");
CREATE INDEX "GrowthReferral_organizationId_status_idx" ON "GrowthReferral"("organizationId", "status");
