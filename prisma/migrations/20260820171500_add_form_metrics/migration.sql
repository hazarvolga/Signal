CREATE TABLE "FormMetric" (
  "id" TEXT NOT NULL,
  "formId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "views" INTEGER NOT NULL DEFAULT 0,
  "submissions" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FormMetric_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FormMetric_formId_key" ON "FormMetric"("formId");
CREATE INDEX "FormMetric_organizationId_idx" ON "FormMetric"("organizationId");
