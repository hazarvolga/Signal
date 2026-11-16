UPDATE "FormMetric"
SET
  "views" = "submissions",
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "views" < "submissions";
