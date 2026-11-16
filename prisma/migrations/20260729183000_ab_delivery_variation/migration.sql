ALTER TABLE "RecipientDelivery" ADD COLUMN "variationId" TEXT;

CREATE INDEX "RecipientDelivery_variationId_idx"
    ON "RecipientDelivery"("variationId");

ALTER TABLE "RecipientDelivery"
    ADD CONSTRAINT "RecipientDelivery_variationId_fkey"
    FOREIGN KEY ("variationId") REFERENCES "CampaignVariation"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Campaign"
    ADD COLUMN "abTestStartedAt" TIMESTAMP(3),
    ADD COLUMN "abFinalizedAt" TIMESTAMP(3),
    ADD COLUMN "abTestStatus" TEXT,
    ADD COLUMN "winnerVariationId" TEXT;

ALTER TABLE "CampaignDispatch"
    ADD COLUMN "phase" TEXT NOT NULL DEFAULT 'FULL',
    ADD COLUMN "winnerVariationId" TEXT;

CREATE INDEX "CampaignDispatch_campaignId_phase_idx"
    ON "CampaignDispatch"("campaignId", "phase");

CREATE INDEX "Event_campaignId_variationId_type_idx"
    ON "Event"("campaignId", "variationId", "type");

ALTER TABLE "Campaign"
    ADD CONSTRAINT "Campaign_winnerVariationId_fkey"
    FOREIGN KEY ("winnerVariationId") REFERENCES "CampaignVariation"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CampaignDispatch"
    ADD CONSTRAINT "CampaignDispatch_winnerVariationId_fkey"
    FOREIGN KEY ("winnerVariationId") REFERENCES "CampaignVariation"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "TrackingEventReceipt" (
    "id" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "destination" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "organizationId" TEXT NOT NULL,
    "recipientDeliveryId" TEXT NOT NULL,
    CONSTRAINT "TrackingEventReceipt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TrackingEventReceipt_tokenId_key"
    ON "TrackingEventReceipt"("tokenId");
CREATE INDEX "TrackingEventReceipt_organizationId_kind_occurredAt_idx"
    ON "TrackingEventReceipt"("organizationId", "kind", "occurredAt");
CREATE INDEX "TrackingEventReceipt_recipientDeliveryId_kind_idx"
    ON "TrackingEventReceipt"("recipientDeliveryId", "kind");

ALTER TABLE "TrackingEventReceipt"
    ADD CONSTRAINT "TrackingEventReceipt_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TrackingEventReceipt"
    ADD CONSTRAINT "TrackingEventReceipt_recipientDeliveryId_fkey"
    FOREIGN KEY ("recipientDeliveryId") REFERENCES "RecipientDelivery"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
