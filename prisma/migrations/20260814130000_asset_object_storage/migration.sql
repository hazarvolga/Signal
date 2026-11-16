ALTER TABLE "Asset"
ADD COLUMN "storageKey" TEXT,
ADD COLUMN "checksum" TEXT,
ADD COLUMN "scanStatus" TEXT NOT NULL DEFAULT 'LEGACY';

CREATE INDEX "Asset_organizationId_createdAt_id_idx"
ON "Asset"("organizationId", "createdAt", "id");

CREATE INDEX "Asset_organizationId_checksum_idx"
ON "Asset"("organizationId", "checksum");
