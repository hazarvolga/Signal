export const MAX_FLOW_NODES = 100;
export const MAX_FLOW_EDGES = 200;
export const MAX_FLOW_STEPS = 100;
export const MAX_WAIT_MS = 365 * 24 * 60 * 60 * 1_000;
export const WORKFLOW_STALE_MS = 5 * 60 * 1_000;

export interface WorkflowNode {
  id: string;
  data: {
    type: "Trigger" | "Action" | "Logic";
    label: string;
    config?: Record<string, unknown>;
  };
}

export interface WorkflowEdge {
  id?: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
}

export interface WorkflowGraph {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface WorkflowEventInput {
  eventId: string;
  organizationId: string;
  contactId: string;
  eventType: string;
  eventName?: string;
  metadata?: Record<string, unknown>;
}

export type WorkflowJob =
  { kind: "trigger"; executionId: string } | { kind: "continue"; executionId: string };

export interface QueueLike {
  add(name: string, data: WorkflowJob, options?: Record<string, unknown>): Promise<unknown>;
}
