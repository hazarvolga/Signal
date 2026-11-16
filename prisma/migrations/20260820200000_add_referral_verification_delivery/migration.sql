ALTER TABLE "GrowthReferral"
ADD COLUMN "verificationEmailStatus" TEXT NOT NULL DEFAULT 'PENDING',
ADD COLUMN "verificationEmailSentAt" TIMESTAMP(3),
ADD COLUMN "verificationEmailAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "verificationEmailLastError" TEXT;

CREATE INDEX "GrowthReferral_organizationId_verificationEmailStatus_idx"
ON "GrowthReferral"("organizationId", "verificationEmailStatus");
