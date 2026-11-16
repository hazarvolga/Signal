import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  contact: {
    findFirst: vi.fn(),
  },
  flow: {
    findMany: vi.fn(),
  },
  flowExecution: {
    findUnique: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    findMany: vi.fn(),
  },
  flowNodeExecution: {
    upsert: vi.fn(),
    update: vi.fn(),
  },
  revenue: {
    count: vi.fn(),
  },
  event: {
    findFirst: vi.fn(),
  },
  campaign: {
    findFirst: vi.fn(),
  },
  $transaction: vi.fn(),
}));

vi.mock("../../src/services/prisma", () => ({ prisma: prismaMock }));
vi.mock("../../src/services/email/deliveryQueue", () => ({
  queueCampaignDispatch: vi.fn(),
}));

import { processWorkflowExecution } from "../../src/services/workflow/executor";
import {
  findMatchingTrigger,
  parseAndValidateWorkflowGraph,
  WorkflowValidationError,
} from "../../src/services/workflow/graph";
import {
  enqueueRecoverableWorkflowExecutions,
  enqueueWorkflowEvent,
  workflowContinuationJobId,
  workflowJobId,
} from "../../src/services/workflow/queue";

const trigger = {
  id: "trigger",
  data: {
    type: "Trigger" as const,
    label: "Custom Event",
    config: { eventName: "CART_ABANDONED" },
  },
};
const email = {
  id: "email",
  data: {
    type: "Action" as const,
    label: "Send Email",
    config: { campaignId: "campaign-blueprint" },
  },
};
const baseGraph = {
  nodes: [trigger, email],
  edges: [{ source: "trigger", target: "email" }],
};

describe("workflow graph validation", () => {
  it("accepts supported trigger, Wait, If/Else and Send Email nodes", () => {
    const graph = parseAndValidateWorkflowGraph(
      [
        trigger,
        {
          id: "wait",
          data: {
            type: "Action",
            label: "Wait",
            config: { duration: 10, unit: "minutes" },
          },
        },
        {
          id: "condition",
          data: {
            type: "Logic",
            label: "If/Else",
            config: { conditionType: "tag_exists", checkTagId: "tag-1" },
          },
        },
        email,
        { ...email, id: "email-false" },
      ],
      [
        { source: "trigger", target: "wait" },
        { source: "wait", target: "condition" },
        {
          source: "condition",
          target: "email",
          sourceHandle: "true",
        },
        {
          source: "condition",
          target: "email-false",
          sourceHandle: "false",
        },
      ]
    );

    expect(graph.nodes).toHaveLength(5);
    expect(findMatchingTrigger(graph, "BEHAVIORAL", "CART_ABANDONED")?.id).toBe("trigger");
  });

  it("rejects cycles, unsupported nodes and direct-send configurations", () => {
    expect(() =>
      parseAndValidateWorkflowGraph(baseGraph.nodes, [
        ...baseGraph.edges,
        { source: "email", target: "trigger" },
      ])
    ).toThrow(/incoming|acyclic/);

    expect(() =>
      parseAndValidateWorkflowGraph(
        [
          trigger,
          {
            id: "script",
            data: { type: "Action", label: "Run JavaScript", config: {} },
          },
        ],
        [{ source: "trigger", target: "script" }]
      )
    ).toThrow(WorkflowValidationError);

    expect(() =>
      parseAndValidateWorkflowGraph(
        [
          trigger,
          {
            id: "unsafe-email",
            data: { type: "Action", label: "Send Email", config: {} },
          },
        ],
        [{ source: "trigger", target: "unsafe-email" }]
      )
    ).toThrow(/campaignId/);
  });
});

describe("workflow event queue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.contact.findFirst.mockResolvedValue({ id: "contact-1" });
    prismaMock.flow.findMany.mockResolvedValue([
      {
        id: "flow-1",
        nodes: JSON.stringify(baseGraph.nodes),
        edges: JSON.stringify(baseGraph.edges),
      },
    ]);
    prismaMock.flowExecution.findUnique.mockResolvedValue(null);
    prismaMock.flowExecution.create.mockResolvedValue({
      id: "execution-1",
      status: "QUEUED",
    });
  });

  it("creates one durable execution and queues a deterministic trigger job", async () => {
    const queue = { add: vi.fn().mockResolvedValue({}) };
    const result = await enqueueWorkflowEvent(
      {
        eventId: "event-1",
        organizationId: "org-1",
        contactId: "contact-1",
        eventType: "BEHAVIORAL",
        eventName: "CART_ABANDONED",
      },
      queue
    );

    expect(result).toEqual({ matched: 1, queued: 1 });
    expect(prismaMock.flowExecution.create).toHaveBeenCalledOnce();
    expect(queue.add).toHaveBeenCalledWith(
      "trigger",
      { kind: "trigger", executionId: "execution-1" },
      expect.objectContaining({
        jobId: workflowJobId("trigger", "execution-1"),
      })
    );
    const createData = prismaMock.flowExecution.create.mock.calls[0][0].data;
    expect(createData).toMatchObject({
      flowId: "flow-1",
      contactId: "contact-1",
      triggerEventId: "event-1",
    });
  });

  it("reuses the durable idempotent execution when the event is replayed", async () => {
    prismaMock.flowExecution.findUnique.mockResolvedValue({
      id: "execution-existing",
      status: "QUEUED",
    });
    const queue = { add: vi.fn().mockResolvedValue({}) };

    await enqueueWorkflowEvent(
      {
        eventId: "event-1",
        organizationId: "org-1",
        contactId: "contact-1",
        eventType: "BEHAVIORAL",
        eventName: "CART_ABANDONED",
      },
      queue
    );

    expect(prismaMock.flowExecution.create).not.toHaveBeenCalled();
    expect(queue.add).toHaveBeenCalledWith(
      "trigger",
      { kind: "trigger", executionId: "execution-existing" },
      expect.objectContaining({
        jobId: workflowJobId("trigger", "execution-existing"),
      })
    );
  });

  it("rejects a cross-tenant contact before reading active flows", async () => {
    prismaMock.contact.findFirst.mockResolvedValue(null);

    await expect(
      enqueueWorkflowEvent(
        {
          eventId: "event-1",
          organizationId: "org-1",
          contactId: "other-org-contact",
          eventType: "BEHAVIORAL",
          eventName: "CART_ABANDONED",
        },
        { add: vi.fn() }
      )
    ).rejects.toThrow(/outside the organization/);
    expect(prismaMock.flow.findMany).not.toHaveBeenCalled();
  });

  it("recreates delayed continuation jobs from durable WAITING state", async () => {
    const resumeAt = new Date("2026-07-29T12:05:00.000Z");
    prismaMock.flowExecution.findMany.mockResolvedValue([
      {
        id: "execution-waiting",
        status: "WAITING",
        resumeAt,
        startedAt: null,
      },
    ]);
    const queue = { add: vi.fn().mockResolvedValue({}) };

    const count = await enqueueRecoverableWorkflowExecutions(
      queue,
      new Date("2026-07-29T12:00:00.000Z")
    );

    expect(count).toBe(1);
    expect(queue.add).toHaveBeenCalledWith(
      "continue",
      { kind: "continue", executionId: "execution-waiting" },
      expect.objectContaining({
        delay: 300_000,
        jobId: expect.stringContaining("workflow-recovery-continue"),
      })
    );
  });

  it("uses a distinct continuation job ID for each durable wait", () => {
    const first = workflowContinuationJobId(
      "execution-1",
      new Date("2026-07-29T12:05:00.000Z")
    );
    const second = workflowContinuationJobId(
      "execution-1",
      new Date("2026-07-29T12:10:00.000Z")
    );

    expect(first).not.toBe(second);
  });
});

describe("durable wait execution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.flowExecution.update.mockResolvedValue({});
    prismaMock.flowExecution.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.flowNodeExecution.update.mockImplementation(async ({ where, data }) => ({
      id: where.id,
      executionId: "execution-1",
      organizationId: "org-1",
      nodeId: where.id.replace("run-", ""),
      nodeType: "test",
      status: data.status ?? "RUNNING",
      attempts: data.attempts ? 1 : 0,
      maxAttempts: 3,
      timeoutAt: null,
      resumeAt: data.resumeAt ?? null,
      output: data.output ?? null,
      lastError: null,
      actionCampaignId: null,
      campaignDispatchId: null,
      startedAt: null,
      completedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    prismaMock.$transaction.mockImplementation(async (operations) => Promise.all(operations));
  });

  it("stores WAITING state and creates a delayed continuation job", async () => {
    const waitGraph = {
      nodes: [
        trigger,
        {
          id: "wait",
          data: {
            type: "Action" as const,
            label: "Wait",
            config: { duration: 5, unit: "minutes" },
          },
        },
      ],
      edges: [{ source: "trigger", target: "wait" }],
    };
    prismaMock.flowExecution.findUnique.mockResolvedValue({
      id: "execution-1",
      flowId: "flow-1",
      organizationId: "org-1",
      contactId: "contact-1",
      triggerNodeId: "trigger",
      status: "QUEUED",
      currentNodeId: "trigger",
      stepCount: 0,
      maxSteps: 100,
      context: JSON.stringify({ graph: waitGraph }),
      startedAt: null,
      flow: {
        id: "flow-1",
        nodes: JSON.stringify(waitGraph.nodes),
        edges: JSON.stringify(waitGraph.edges),
        status: "ACTIVE",
      },
      contact: { id: "contact-1", organizationId: "org-1" },
    });
    prismaMock.flowNodeExecution.upsert.mockImplementation(async ({ create }) => ({
      id: `run-${create.nodeId}`,
      ...create,
      status: "PENDING",
      attempts: 0,
      maxAttempts: 3,
      timeoutAt: null,
      resumeAt: null,
      output: null,
      lastError: null,
      actionCampaignId: null,
      campaignDispatchId: null,
      startedAt: null,
      completedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    const queue = { add: vi.fn().mockResolvedValue({}) };
    const clock = new Date("2026-07-29T12:00:00.000Z");

    const result = await processWorkflowExecution("execution-1", {
      queue,
      now: () => clock,
    });

    expect(result.status).toBe("WAITING");
    expect(queue.add).toHaveBeenCalledWith(
      "continue",
      { kind: "continue", executionId: "execution-1" },
      expect.objectContaining({
        delay: 300_000,
        jobId: workflowContinuationJobId(
          "execution-1",
          new Date("2026-07-29T12:05:00.000Z")
        ),
      })
    );
    expect(prismaMock.flowExecution.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "WAITING",
          currentNodeId: "wait",
          resumeAt: new Date("2026-07-29T12:05:00.000Z"),
        }),
      })
    );
  });
});

describe("durable Send Email execution", () => {
  it("creates an explicit one-contact campaign audience and uses the delivery queue", async () => {
    vi.clearAllMocks();
    prismaMock.flowExecution.findUnique.mockResolvedValue({
      id: "execution-1",
      flowId: "flow-1",
      organizationId: "org-1",
      contactId: "contact-1",
      triggerNodeId: "trigger",
      status: "QUEUED",
      currentNodeId: "trigger",
      stepCount: 0,
      maxSteps: 100,
      context: JSON.stringify({ graph: baseGraph }),
      startedAt: null,
      flow: {
        id: "flow-1",
        nodes: JSON.stringify(baseGraph.nodes),
        edges: JSON.stringify(baseGraph.edges),
        status: "ACTIVE",
      },
      contact: { id: "contact-1", organizationId: "org-1" },
    });
    prismaMock.flowExecution.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.flowExecution.update.mockResolvedValue({});
    prismaMock.flowNodeExecution.upsert.mockImplementation(async ({ create }) => ({
      id: `run-${create.nodeId}`,
      ...create,
      status: "PENDING",
      attempts: 0,
      maxAttempts: 3,
      timeoutAt: null,
      resumeAt: null,
      output: null,
      lastError: null,
      actionCampaignId: null,
      campaignDispatchId: null,
      startedAt: null,
      completedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    prismaMock.flowNodeExecution.update.mockImplementation(async ({ where, data }) => ({
      id: where.id,
      executionId: "execution-1",
      organizationId: "org-1",
      nodeId: where.id.replace("run-", ""),
      nodeType: "test",
      status: data.status ?? "RUNNING",
      attempts: data.attempts ? 1 : 0,
      maxAttempts: 3,
      timeoutAt: null,
      resumeAt: null,
      output: data.output ?? null,
      lastError: null,
      actionCampaignId: data.actionCampaignId ?? null,
      campaignDispatchId: data.campaignDispatchId ?? null,
      startedAt: null,
      completedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    prismaMock.campaign.findFirst.mockResolvedValue({
      name: "Blueprint",
      subject: "Subject",
      previewText: null,
      fromName: "Signal",
      fromEmail: "sender@example.com",
      replyTo: null,
      content: "<p>Hello</p>",
      channel: "EMAIL",
      templateId: null,
    });
    const campaignCreate = vi.fn().mockResolvedValue({ id: "action-campaign-1" });
    const transactionNodeUpdate = vi.fn().mockResolvedValue({});
    prismaMock.$transaction.mockImplementation(async (callback) =>
      callback({
        campaign: { create: campaignCreate },
        flowNodeExecution: { update: transactionNodeUpdate },
      })
    );
    const queueDispatch = vi.fn().mockResolvedValue({
      dispatchId: "dispatch-1",
      created: true,
    });

    const result = await processWorkflowExecution("execution-1", {
      queue: { add: vi.fn() },
      queueDispatch,
    });

    expect(result.status).toBe("COMPLETED");
    expect(campaignCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org-1",
          audiences: { create: { contactId: "contact-1" } },
        }),
      })
    );
    expect(queueDispatch).toHaveBeenCalledWith({
      campaignId: "action-campaign-1",
      organizationId: "org-1",
      idempotencyKey: "workflow:execution-1:email",
    });
  });
});
