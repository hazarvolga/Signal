INSERT INTO "FormMetric" (
  "id",
  "formId",
  "organizationId",
  "views",
  "submissions",
  "createdAt",
  "updatedAt"
)
SELECT
  'fm_' || md5("formId"),
  "formId",
  "organizationId",
  0,
  COUNT(*)::INTEGER,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "FormSubmission"
GROUP BY "formId", "organizationId"
ON CONFLICT ("formId") DO UPDATE
SET
  "submissions" = EXCLUDED."submissions",
  "updatedAt" = CURRENT_TIMESTAMP;
