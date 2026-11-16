import {
  WorkflowValidationError,
  isKnownWorkflowNodeLabel,
} from "./graph";

type TemplateNodeData = Record<string, unknown> & {
  type?: unknown;
  label?: unknown;
  config?: unknown;
};

type TemplateNode = Record<string, unknown> & {
  id?: unknown;
  type?: unknown;
  position?: unknown;
  data?: TemplateNodeData;
};

const SIGNUP_LABELS = new Set(["User Signed Up", "Form Subscribed"]);

function parseTemplateNodes(rawNodes: unknown): unknown[] {
  let parsed = rawNodes;
  if (typeof rawNodes === "string") {
    try {
      parsed = JSON.parse(rawNodes);
    } catch {
      throw new WorkflowValidationError("template nodes must be valid JSON");
    }
  }
  if (!Array.isArray(parsed)) {
    throw new WorkflowValidationError("template nodes must be an array");
  }
  return parsed;
}

function normalizeNodeType(value: unknown): "Trigger" | "Action" | "Logic" | null {
  if (typeof value !== "string") return null;
  const normalized = value.toLowerCase();
  if (normalized === "trigger") return "Trigger";
  if (normalized === "action") return "Action";
  if (normalized === "logic") return "Logic";
  return null;
}

function eventNameFromLabel(label: string): string {
  const eventName = label
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
  return eventName || "TEMPLATE_EVENT";
}

function hasValidPosition(value: unknown): value is { x: number; y: number } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const position = value as Record<string, unknown>;
  return typeof position.x === "number" && typeof position.y === "number";
}

function normalizeTemplateNode(rawNode: unknown, index: number): TemplateNode {
  if (!rawNode || typeof rawNode !== "object" || Array.isArray(rawNode)) {
    throw new WorkflowValidationError("template contains a malformed node");
  }

  const node = rawNode as TemplateNode;
  const data = node.data;
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new WorkflowValidationError("template contains a malformed node");
  }

  const type = normalizeNodeType(data.type) ?? normalizeNodeType(node.type);
  if (!type || typeof data.label !== "string" || !data.label) {
    throw new WorkflowValidationError("template contains a malformed node");
  }

  const originalLabel = data.label;
  let label = originalLabel;
  let config =
    data.config && typeof data.config === "object" && !Array.isArray(data.config)
      ? { ...(data.config as Record<string, unknown>) }
      : {};

  if (!isKnownWorkflowNodeLabel(label) && type === "Trigger") {
    label = SIGNUP_LABELS.has(originalLabel) ? "On Signup" : "Custom Event";
    if (label === "Custom Event") {
      config = {
        ...config,
        eventName:
          typeof config.eventName === "string" && config.eventName
            ? config.eventName
            : eventNameFromLabel(originalLabel),
        templateLabel: originalLabel,
      };
    }
  }

  return {
    ...node,
    type: "custom",
    position: hasValidPosition(node.position)
      ? { ...node.position }
      : { x: 100, y: 100 + index * 160 },
    data: {
      ...data,
      type,
      label,
      config,
      icon: data.icon ?? (type === "Trigger" ? "Zap" : "Settings"),
      color: data.color ?? "bg-burgundy/10 text-burgundy",
    },
  };
}

export function normalizeWorkflowTemplateNodes(rawNodes: unknown): TemplateNode[] {
  return parseTemplateNodes(rawNodes).map(normalizeTemplateNode);
}

export function normalizeWorkflowTemplateSeedData<T extends { nodes: unknown }>(
  templates: readonly T[]
): Array<Omit<T, "nodes"> & { nodes: string }> {
  return templates.map((template) => ({
    ...template,
    nodes: JSON.stringify(normalizeWorkflowTemplateNodes(template.nodes)),
  }));
}
