CREATE TABLE "FormSubmission" (
  "id" TEXT NOT NULL,
  "formId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FormSubmission_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FormSubmission_formId_createdAt_idx"
  ON "FormSubmission"("formId", "createdAt");

CREATE INDEX "FormSubmission_organizationId_createdAt_idx"
  ON "FormSubmission"("organizationId", "createdAt");
