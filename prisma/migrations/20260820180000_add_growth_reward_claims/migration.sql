CREATE TABLE "GrowthRewardClaim" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "rewardTierId" TEXT NOT NULL,
    "referrerEmail" TEXT NOT NULL,
    "referralCount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ELIGIBLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claimedAt" TIMESTAMP(3),

    CONSTRAINT "GrowthRewardClaim_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GrowthRewardClaim_organizationId_rewardTierId_referrerEmail_key"
ON "GrowthRewardClaim"("organizationId", "rewardTierId", "referrerEmail");

CREATE INDEX "GrowthRewardClaim_organizationId_status_idx"
ON "GrowthRewardClaim"("organizationId", "status");

CREATE INDEX "GrowthRewardClaim_organizationId_referrerEmail_idx"
ON "GrowthRewardClaim"("organizationId", "referrerEmail");

INSERT INTO "GrowthRewardClaim" (
    "id",
    "organizationId",
    "rewardTierId",
    "referrerEmail",
    "referralCount",
    "status",
    "createdAt"
)
SELECT
    'grc_' || md5(
        tier."organizationId" || ':' || tier."id" || ':' || referral."referrerEmail"
    ),
    tier."organizationId",
    tier."id",
    referral."referrerEmail",
    referral."referralCount",
    'ELIGIBLE',
    CURRENT_TIMESTAMP
FROM "GrowthRewardTier" AS tier
INNER JOIN (
    SELECT
        "organizationId",
        "referrerEmail",
        COUNT(*)::INTEGER AS "referralCount"
    FROM "GrowthReferral"
    WHERE "status" IN ('VERIFIED', 'REWARDED')
    GROUP BY "organizationId", "referrerEmail"
) AS referral
    ON referral."organizationId" = tier."organizationId"
WHERE tier."active" = true
  AND referral."referralCount" >= tier."referrals"
ON CONFLICT ("organizationId", "rewardTierId", "referrerEmail") DO NOTHING;
