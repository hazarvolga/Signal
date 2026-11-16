import {
  MAX_FLOW_EDGES,
  MAX_FLOW_NODES,
  MAX_WAIT_MS,
  type WorkflowEdge,
  type WorkflowGraph,
  type WorkflowNode,
} from "./types";

const KNOWN_NODE_LABELS = new Set([
  "On Signup",
  "Webhook",
  "Custom Event",
  "Scheduled",
  "Wait",
  "If/Else",
  "Send Email",
  "Add Tag",
  "A/B Test",
  "Multi-path Split",
]);
const EXECUTABLE_NODE_LABELS = new Set([
  "On Signup",
  "Webhook",
  "Custom Event",
  "Wait",
  "If/Else",
  "Send Email",
]);
const CONDITION_TYPES = new Set(["tag_exists", "has_purchased", "purchase_made", "email_open"]);

export function isKnownWorkflowNodeLabel(value: unknown): value is string {
  return typeof value === "string" && KNOWN_NODE_LABELS.has(value);
}

export class WorkflowValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkflowValidationError";
  }
}

function parseArray(value: unknown, field: string): unknown[] {
  let parsed = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      throw new WorkflowValidationError(`${field} must be valid JSON`);
    }
  }
  if (!Array.isArray(parsed)) {
    throw new WorkflowValidationError(`${field} must be an array`);
  }
  return parsed;
}

export function parseAndValidateWorkflowGraph(
  rawNodes: unknown,
  rawEdges: unknown,
  options: { allowIncomplete?: boolean } = {}
): WorkflowGraph {
  const nodes = parseArray(rawNodes ?? [], "nodes") as WorkflowNode[];
  const edges = parseArray(rawEdges ?? [], "edges") as WorkflowEdge[];

  if (nodes.length === 0 || nodes.length > MAX_FLOW_NODES) {
    throw new WorkflowValidationError(`flows require 1-${MAX_FLOW_NODES} nodes`);
  }
  if (edges.length > MAX_FLOW_EDGES) {
    throw new WorkflowValidationError(`flows support at most ${MAX_FLOW_EDGES} edges`);
  }

  const ids = new Set<string>();
  for (const node of nodes) {
    if (
      !node ||
      typeof node.id !== "string" ||
      !node.id ||
      !node.data ||
      !["Trigger", "Action", "Logic"].includes(node.data.type) ||
      !isKnownWorkflowNodeLabel(node.data.label)
    ) {
      throw new WorkflowValidationError("flow contains an unsupported or malformed node");
    }
    if (ids.has(node.id)) throw new WorkflowValidationError("flow node IDs must be unique");
    ids.add(node.id);
    if (!options.allowIncomplete && !EXECUTABLE_NODE_LABELS.has(node.data.label)) {
      throw new WorkflowValidationError(
        `${node.data.label} is not supported by the production executor`
      );
    }

    const config = node.data.config ?? {};
    if (node.data.label === "Wait" && !options.allowIncomplete) {
      validateWaitConfig(config);
    }
    if (node.data.label === "If/Else" && !options.allowIncomplete) {
      validateConditionConfig(config);
    }
    if (
      node.data.label === "Send Email" &&
      !options.allowIncomplete &&
      (typeof config.campaignId !== "string" || !config.campaignId)
    ) {
      throw new WorkflowValidationError(
        "Send Email requires a campaignId; direct email execution is prohibited"
      );
    }
    if (
      ["Webhook", "Custom Event"].includes(node.data.label) &&
      !options.allowIncomplete &&
      typeof config.eventName !== "string" &&
      typeof config.eventType !== "string"
    ) {
      throw new WorkflowValidationError(`${node.data.label} requires an eventName or eventType`);
    }
  }

  const triggers = nodes.filter((node) => node.data.type === "Trigger");
  if (triggers.length === 0) throw new WorkflowValidationError("flow requires a trigger node");

  const outgoing = new Map<string, WorkflowEdge[]>();
  for (const edge of edges) {
    if (
      !edge ||
      typeof edge.source !== "string" ||
      typeof edge.target !== "string" ||
      !ids.has(edge.source) ||
      !ids.has(edge.target) ||
      edge.source === edge.target
    ) {
      throw new WorkflowValidationError("flow contains a malformed edge");
    }
    const list = outgoing.get(edge.source) ?? [];
    list.push(edge);
    outgoing.set(edge.source, list);
    if (!options.allowIncomplete && triggers.some((trigger) => trigger.id === edge.target)) {
      throw new WorkflowValidationError("trigger nodes cannot have incoming edges");
    }
  }

  for (const node of nodes) {
    const nodeEdges = outgoing.get(node.id) ?? [];
    if (node.data.label === "If/Else" && !options.allowIncomplete) {
      const handles = new Set(nodeEdges.map((edge) => edge.sourceHandle));
      if (nodeEdges.length !== 2 || !handles.has("true") || !handles.has("false")) {
        throw new WorkflowValidationError("If/Else requires true and false edges");
      }
    } else if (!options.allowIncomplete && nodeEdges.length > 1) {
      throw new WorkflowValidationError("only If/Else nodes may have multiple outgoing edges");
    }
  }

  assertAcyclic(nodes, outgoing);
  if (!options.allowIncomplete) assertReachable(nodes, triggers, outgoing);
  return { nodes, edges };
}

function assertAcyclic(nodes: WorkflowNode[], outgoing: Map<string, WorkflowEdge[]>): void {
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (nodeId: string) => {
    if (visiting.has(nodeId)) throw new WorkflowValidationError("flow graph must be acyclic");
    if (visited.has(nodeId)) return;
    visiting.add(nodeId);
    for (const edge of outgoing.get(nodeId) ?? []) visit(edge.target);
    visiting.delete(nodeId);
    visited.add(nodeId);
  };
  for (const node of nodes) visit(node.id);
}

function assertReachable(
  nodes: WorkflowNode[],
  triggers: WorkflowNode[],
  outgoing: Map<string, WorkflowEdge[]>
): void {
  const reachable = new Set<string>();
  const visit = (nodeId: string) => {
    if (reachable.has(nodeId)) return;
    reachable.add(nodeId);
    for (const edge of outgoing.get(nodeId) ?? []) visit(edge.target);
  };
  for (const trigger of triggers) visit(trigger.id);
  if (nodes.some((node) => !reachable.has(node.id))) {
    throw new WorkflowValidationError("every node must be reachable from a trigger");
  }
}

function validateWaitConfig(config: Record<string, unknown>): void {
  if (config.waitType === "until") {
    const timestamp = new Date(String(config.waitUntil ?? "")).getTime();
    if (!Number.isFinite(timestamp)) {
      throw new WorkflowValidationError("Wait until requires a valid waitUntil");
    }
    if (timestamp - Date.now() > MAX_WAIT_MS) {
      throw new WorkflowValidationError("Wait exceeds the one-year safety limit");
    }
    return;
  }
  const duration = Number(config.duration);
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new WorkflowValidationError("Wait requires a positive duration");
  }
  if (!["minutes", "hours", "days", "weeks"].includes(String(config.unit ?? "days"))) {
    throw new WorkflowValidationError("Wait contains an unsupported unit");
  }
  const multipliers: Record<string, number> = {
    minutes: 60_000,
    hours: 3_600_000,
    days: 86_400_000,
    weeks: 604_800_000,
  };
  if (duration * multipliers[String(config.unit ?? "days")] > MAX_WAIT_MS) {
    throw new WorkflowValidationError("Wait exceeds the one-year safety limit");
  }
}

function validateConditionConfig(config: Record<string, unknown>): void {
  const condition = String(config.conditionType ?? config.condition ?? "");
  if (!CONDITION_TYPES.has(condition)) {
    throw new WorkflowValidationError("If/Else contains an unsupported condition");
  }
  if (condition === "tag_exists" && typeof (config.checkTagId ?? config.tagId) !== "string") {
    throw new WorkflowValidationError("tag_exists requires a tagId");
  }
}

export function nextNodeId(graph: WorkflowGraph, nodeId: string, branch?: boolean): string | null {
  const edges = graph.edges.filter((edge) => edge.source === nodeId);
  const edge =
    branch === undefined
      ? edges[0]
      : edges.find((candidate) => candidate.sourceHandle === String(branch));
  return edge?.target ?? null;
}

export function findMatchingTrigger(
  graph: WorkflowGraph,
  eventType: string,
  eventName?: string
): WorkflowNode | undefined {
  return graph.nodes.find((node) => {
    if (node.data.type !== "Trigger") return false;
    const config = node.data.config ?? {};
    const configuredName = config.eventName;
    const configuredType = config.eventType;
    if (typeof configuredName === "string") return configuredName === eventName;
    if (typeof configuredType === "string") return configuredType === eventType;
    if (node.data.label === "On Signup") {
      return eventType === "SIGNUP" || eventType === "CONTACT_CREATED";
    }
    return false;
  });
}

export function waitUntil(node: WorkflowNode, now = new Date()): Date {
  const config = node.data.config ?? {};
  if (config.waitType === "until") {
    const date = new Date(String(config.waitUntil));
    return date > now ? date : now;
  }
  const multipliers: Record<string, number> = {
    minutes: 60_000,
    hours: 3_600_000,
    days: 86_400_000,
    weeks: 604_800_000,
  };
  return new Date(
    now.getTime() + Number(config.duration) * multipliers[String(config.unit ?? "days")]
  );
}
