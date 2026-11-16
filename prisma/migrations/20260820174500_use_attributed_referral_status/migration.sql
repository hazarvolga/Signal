ALTER TABLE "GrowthReferral"
  ALTER COLUMN "status" SET DEFAULT 'ATTRIBUTED';

UPDATE "GrowthReferral"
SET "status" = 'ATTRIBUTED'
WHERE "status" = 'VERIFIED';
