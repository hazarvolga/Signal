CREATE TABLE "FlowExecution" (
    "id" TEXT NOT NULL,
    "flowId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "triggerEventId" TEXT NOT NULL,
    "triggerType" TEXT NOT NULL,
    "triggerName" TEXT,
    "triggerNodeId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "currentNodeId" TEXT,
    "stepCount" INTEGER NOT NULL DEFAULT 0,
    "maxSteps" INTEGER NOT NULL DEFAULT 100,
    "context" TEXT NOT NULL DEFAULT '{}',
    "lastError" TEXT,
    "resumeAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FlowExecution_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FlowNodeExecution" (
    "id" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "nodeType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "timeoutAt" TIMESTAMP(3),
    "resumeAt" TIMESTAMP(3),
    "output" TEXT,
    "lastError" TEXT,
    "actionCampaignId" TEXT,
    "campaignDispatchId" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FlowNodeExecution_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FlowExecution_idempotencyKey_key"
    ON "FlowExecution"("idempotencyKey");
CREATE UNIQUE INDEX "FlowExecution_flowId_contactId_triggerEventId_key"
    ON "FlowExecution"("flowId", "contactId", "triggerEventId");
CREATE INDEX "FlowExecution_organizationId_status_idx"
    ON "FlowExecution"("organizationId", "status");
CREATE INDEX "FlowExecution_flowId_status_idx"
    ON "FlowExecution"("flowId", "status");
CREATE INDEX "FlowExecution_status_resumeAt_idx"
    ON "FlowExecution"("status", "resumeAt");

CREATE UNIQUE INDEX "FlowNodeExecution_executionId_nodeId_key"
    ON "FlowNodeExecution"("executionId", "nodeId");
CREATE INDEX "FlowNodeExecution_organizationId_status_idx"
    ON "FlowNodeExecution"("organizationId", "status");
CREATE INDEX "FlowNodeExecution_status_resumeAt_idx"
    ON "FlowNodeExecution"("status", "resumeAt");

ALTER TABLE "FlowExecution"
    ADD CONSTRAINT "FlowExecution_flowId_fkey"
    FOREIGN KEY ("flowId") REFERENCES "Flow"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FlowExecution"
    ADD CONSTRAINT "FlowExecution_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FlowExecution"
    ADD CONSTRAINT "FlowExecution_contactId_fkey"
    FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FlowNodeExecution"
    ADD CONSTRAINT "FlowNodeExecution_executionId_fkey"
    FOREIGN KEY ("executionId") REFERENCES "FlowExecution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FlowNodeExecution"
    ADD CONSTRAINT "FlowNodeExecution_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
