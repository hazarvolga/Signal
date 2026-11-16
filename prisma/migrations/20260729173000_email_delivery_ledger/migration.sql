-- Consent must always be explicit for newly-created contacts.
ALTER TABLE "Contact" ALTER COLUMN "emailConsent" SET DEFAULT false;
ALTER TABLE "ConsentLog"
    ADD COLUMN "consentTextVersion" TEXT,
    ADD COLUMN "purpose" TEXT,
    ADD COLUMN "lawfulBasis" TEXT;
ALTER TABLE "DataRequest"
    ADD COLUMN "resultUrl" TEXT,
    ADD COLUMN "error" TEXT,
    ADD COLUMN "completedAt" TIMESTAMP(3),
    ADD COLUMN "expiresAt" TIMESTAMP(3);
ALTER TABLE "WebhookLog" ADD COLUMN "externalId" TEXT;
CREATE UNIQUE INDEX "WebhookLog_externalId_key" ON "WebhookLog"("externalId");

CREATE TABLE "CampaignAudience" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CampaignAudience_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CampaignDispatch" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "requestedById" TEXT,
    "totalRecipients" INTEGER NOT NULL DEFAULT 0,
    "acceptedCount" INTEGER NOT NULL DEFAULT 0,
    "deliveredCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "suppressedCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CampaignDispatch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RecipientDelivery" (
    "id" TEXT NOT NULL,
    "dispatchId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "provider" TEXT,
    "providerMessageId" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RecipientDelivery_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProviderEvent" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "organizationId" TEXT NOT NULL,
    "recipientDeliveryId" TEXT NOT NULL,
    CONSTRAINT "ProviderEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Suppression" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "contactId" TEXT,
    "email" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "providerEventId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Suppression_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CampaignAudience_campaignId_contactId_key"
    ON "CampaignAudience"("campaignId", "contactId");
CREATE INDEX "CampaignAudience_contactId_idx" ON "CampaignAudience"("contactId");

CREATE UNIQUE INDEX "CampaignDispatch_idempotencyKey_key"
    ON "CampaignDispatch"("idempotencyKey");
CREATE INDEX "CampaignDispatch_campaignId_status_idx"
    ON "CampaignDispatch"("campaignId", "status");
CREATE INDEX "CampaignDispatch_organizationId_status_idx"
    ON "CampaignDispatch"("organizationId", "status");

CREATE UNIQUE INDEX "RecipientDelivery_dispatchId_contactId_key"
    ON "RecipientDelivery"("dispatchId", "contactId");
CREATE UNIQUE INDEX "RecipientDelivery_provider_providerMessageId_key"
    ON "RecipientDelivery"("provider", "providerMessageId");
CREATE INDEX "RecipientDelivery_organizationId_status_idx"
    ON "RecipientDelivery"("organizationId", "status");
CREATE INDEX "RecipientDelivery_email_idx" ON "RecipientDelivery"("email");

CREATE UNIQUE INDEX "ProviderEvent_provider_eventId_key"
    ON "ProviderEvent"("provider", "eventId");
CREATE INDEX "ProviderEvent_provider_messageId_idx"
    ON "ProviderEvent"("provider", "messageId");
CREATE INDEX "ProviderEvent_organizationId_type_idx"
    ON "ProviderEvent"("organizationId", "type");

CREATE UNIQUE INDEX "Suppression_organizationId_email_key"
    ON "Suppression"("organizationId", "email");
CREATE INDEX "Suppression_organizationId_active_idx"
    ON "Suppression"("organizationId", "active");

ALTER TABLE "CampaignAudience"
    ADD CONSTRAINT "CampaignAudience_campaignId_fkey"
    FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CampaignAudience"
    ADD CONSTRAINT "CampaignAudience_contactId_fkey"
    FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CampaignDispatch"
    ADD CONSTRAINT "CampaignDispatch_campaignId_fkey"
    FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CampaignDispatch"
    ADD CONSTRAINT "CampaignDispatch_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RecipientDelivery"
    ADD CONSTRAINT "RecipientDelivery_dispatchId_fkey"
    FOREIGN KEY ("dispatchId") REFERENCES "CampaignDispatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RecipientDelivery"
    ADD CONSTRAINT "RecipientDelivery_contactId_fkey"
    FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RecipientDelivery"
    ADD CONSTRAINT "RecipientDelivery_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProviderEvent"
    ADD CONSTRAINT "ProviderEvent_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProviderEvent"
    ADD CONSTRAINT "ProviderEvent_recipientDeliveryId_fkey"
    FOREIGN KEY ("recipientDeliveryId") REFERENCES "RecipientDelivery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Suppression"
    ADD CONSTRAINT "Suppression_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Suppression"
    ADD CONSTRAINT "Suppression_contactId_fkey"
    FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
