import React, { useState, useEffect, useCallback } from "react";
import {
  LayoutDashboard,
  Users,
  Mail,
  FileText,
  BarChart3,
  Settings,
  Plus,
  Send,
  Trash2,
  CheckCircle2,
  AlertCircle,
  MailOpen,
  MousePointer2,
  Sparkles,
  Split,
  Filter,
  Tag as TagIcon,
  MousePointerClick,
  Eye,
  ChevronRight,
  MoreHorizontal,
  Search,
  Bell,
  User as UserIcon,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Clock,
  Globe,
  Shield,
  ShieldCheck,
  Languages,
  Wand2,
  AlertTriangle,
  ShoppingBag,
  Smartphone,
  CreditCard,
  Users2,
  Link2,
  Activity,
  Package,
  Lock,
  ExternalLink,
  RefreshCw,
  Image as ImageIcon,
  Download,
  Loader2,
  Sun,
  Moon,
  Menu,
  MessageSquare,
  X,
  Play,
  GitBranch,
  Undo,
  Redo,
  LayoutTemplate,
  StepForward,
  RotateCcw,
  Trophy,
  Archive,
  FileEdit,
  Upload,
  Check,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import * as dagre from "dagre";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  Edge,
  Node,
  Handle,
  Position,
  Panel,
} from "reactflow";
import { api } from "../services/api";
import { Flow, Event, Campaign, Tag } from "../types";
import { format } from "date-fns";
import { cn } from "../lib/utils";
import { HelpTooltip } from "../components/HelpTooltip";

// --- Local Components ---

const SectionHeader = ({
  title,
  subtitle,
  action,
  guideKey,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  guideKey?: string;
}) => (
  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end border-b border-border-hairline pb-4 mb-8 gap-4">
    <div>
      <div className="flex items-center gap-3 mb-2">
        <h1 className="text-3xl sm:text-5xl font-serif font-bold text-ink leading-tight">
          {title}
        </h1>
        {guideKey && <HelpTooltip guideKey={guideKey} />}
      </div>
      {subtitle && (
        <p className="text-base sm:text-lg font-editorial italic text-ink/60">{subtitle}</p>
      )}
    </div>
    {action && <div className="flex shrink-0">{action}</div>}
  </div>
);

const iconMap: Record<string, any> = {
  Zap,
  Globe,
  Sparkles,
  Mail,
  Tag: TagIcon,
  Clock,
  Split,
  FileText,
  MousePointerClick,
  Eye,
  Users,
  Users2,
  GitBranch,
  Filter,
  Send,
  Bell,
  Activity,
};

const CustomNode = ({ data, selected }: any) => {
  if (!data) return null;
  const Icon = typeof data.icon === "string" ? iconMap[data.icon] || Zap : data.icon || Zap;
  const stats = data.stats;
  const isHeatmapOn = data.isHeatmapOn;
  const errors = data.errors;
  const isSimulationStep = data.isSimulationStep;
  const dropOff =
    stats && stats.entries > 0
      ? ((stats.entries - (stats.processed || 0)) / stats.entries) * 100
      : 0;
  const isBottleneck = isHeatmapOn && dropOff > 30;

  return (
    <div
      className={cn(
        "bg-bg border p-4 shadow-sm min-w-[200px] transition-all relative",
        selected ? "border-burgundy ring-1 ring-burgundy/20" : "border-ink/10",
        isBottleneck
          ? "ring-2 ring-burgundy animate-pulse border-burgundy shadow-lg shadow-burgundy/20"
          : "",
        errors && errors.length > 0 ? "border-burgundy ring-1 ring-burgundy/50" : "",
        isSimulationStep ? "ring-4 ring-brass border-brass shadow-xl scale-105 z-50" : ""
      )}
    >
      <Handle type="target" position={Position.Top} className="w-2 h-2 bg-burgundy border-none" />

      {errors && errors.length > 0 && (
        <div className="absolute -top-3 -right-3 bg-burgundy text-white p-1 rounded-full shadow-lg z-10">
          <AlertCircle size={12} />
        </div>
      )}

      {isBottleneck && (
        <div className="absolute -top-8 left-0 right-0 flex justify-center">
          <div className="bg-burgundy text-white text-[8px] font-black uppercase px-2 py-1 rounded-full flex items-center gap-1 shadow-lg">
            <AlertCircle size={10} />
            High Drop-off: {Math.round(dropOff)}%
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className={cn("p-2", data.color || "bg-ink/5 text-ink")}>
          <Icon size={16} />
        </div>
        <div className="flex-1">
          <p className="text-[8px] font-black uppercase tracking-widest text-ink/40">
            {data.type || "Node"}
          </p>
          <p className="text-xs font-bold font-serif">{data.label || "Untitled"}</p>
        </div>
      </div>

      {data.label === "If/Else" ? (
        <>
          <Handle
            type="source"
            position={Position.Bottom}
            id="true"
            className="w-2 h-2 bg-status-success border-none left-1/4"
          />
          <Handle
            type="source"
            position={Position.Bottom}
            id="false"
            className="w-2 h-2 bg-burgundy border-none left-3/4"
          />
          <div className="flex justify-between px-2 mt-1">
            <span className="text-[6px] font-black uppercase text-status-success">True</span>
            <span className="text-[6px] font-black uppercase text-burgundy">False</span>
          </div>
        </>
      ) : data.label === "A/B Test" ? (
        <>
          <Handle
            type="source"
            position={Position.Bottom}
            id="a"
            className="w-2 h-2 bg-brass border-none left-1/4"
          />
          <Handle
            type="source"
            position={Position.Bottom}
            id="b"
            className="w-2 h-2 bg-ink border-none left-3/4"
          />
          <div className="flex justify-between px-2 mt-1">
            <span className="text-[6px] font-black uppercase text-brass">Var A</span>
            <span className="text-[6px] font-black uppercase text-ink">Var B</span>
          </div>
        </>
      ) : data.label === "Multi-path Split" ? (
        <div className="relative h-4 mt-1">
          {(data.config?.paths || ["Path 1", "Path 2"]).map(
            (path: string, idx: number, arr: any[]) => (
              <React.Fragment key={idx}>
                <Handle
                  type="source"
                  position={Position.Bottom}
                  id={`path-${idx}`}
                  className="w-2 h-2 bg-brass border-none"
                  style={{ left: `${((idx + 1) / (arr.length + 1)) * 100}%` }}
                />
                <span
                  className="absolute text-[5px] font-black uppercase text-brass truncate w-10 text-center"
                  style={{
                    left: `${((idx + 1) / (arr.length + 1)) * 100}%`,
                    transform: "translateX(-50%)",
                    bottom: "-8px",
                  }}
                >
                  {path}
                </span>
              </React.Fragment>
            )
          )}
        </div>
      ) : (
        <Handle
          type="source"
          position={Position.Bottom}
          className="w-2 h-2 bg-burgundy border-none"
        />
      )}

      {isHeatmapOn && stats && (
        <div className="mt-2 space-y-1">
          <div className="flex justify-between items-center text-[7px] font-black uppercase">
            <span className="text-ink/40">Drop-off Rate</span>
            <span className={cn(dropOff > 30 ? "text-burgundy" : "text-ink/60")}>
              {Math.round(dropOff)}%
            </span>
          </div>
          <div className="h-1 bg-ink/5 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${dropOff}%` }}
              className={cn(
                "h-full transition-colors",
                dropOff > 50 ? "bg-burgundy" : dropOff > 20 ? "bg-brass" : "bg-status-success"
              )}
            />
          </div>
        </div>
      )}

      {stats && (
        <div className="mt-4 pt-3 border-t border-border-hairline grid grid-cols-2 gap-2">
          {data.type === "Trigger" && (
            <div className="col-span-2">
              <p className="text-[7px] font-black uppercase text-ink/40">Total Entries</p>
              <p className="text-sm font-serif font-bold text-ink">
                {stats.entries?.toLocaleString()}
              </p>
            </div>
          )}
          {data.type === "Action" && data.label === "Send Email" && (
            <>
              <div>
                <p className="text-[7px] font-black uppercase text-ink/40">Open Rate</p>
                <p className="text-xs font-serif font-bold text-status-success">{stats.openRate}</p>
              </div>
              <div>
                <p className="text-[7px] font-black uppercase text-ink/40">Click Rate</p>
                <p className="text-xs font-serif font-bold text-burgundy">{stats.clickRate}</p>
              </div>
            </>
          )}
          {data.type === "Logic" && (
            <>
              <div>
                <p className="text-[7px] font-black uppercase text-ink/40">True</p>
                <p className="text-xs font-serif font-bold text-status-success">
                  {stats.truePath?.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-[7px] font-black uppercase text-ink/40">False</p>
                <p className="text-xs font-serif font-bold text-burgundy">
                  {stats.falsePath?.toLocaleString()}
                </p>
              </div>
            </>
          )}
          {data.type === "Action" && data.label !== "Send Email" && (
            <div className="col-span-2">
              <p className="text-[7px] font-black uppercase text-ink/40">Processed</p>
              <p className="text-sm font-serif font-bold text-ink">
                {stats.processed?.toLocaleString()}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

import { useLanguage } from "../contexts/LanguageContext";

const automationNodeTypes = {
  custom: CustomNode,
  trigger: CustomNode,
  action: CustomNode,
  logic: CustomNode,
};

// --- Automations Page ---

export default function Automations() {
  const { t } = useLanguage();
  const [flows, setFlows] = useState<Flow[]>([]);
  const [activeFlow, setActiveFlow] = useState<Flow | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newFlowName, setNewFlowName] = useState("");
  const [events, setEvents] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [view, setView] = useState<"FLOWS" | "EVENTS" | "TEMPLATES">("FLOWS");

  // React Flow state
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(false);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [emailCampaigns, setEmailCampaigns] = useState<Campaign[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showFunnel, setShowFunnel] = useState(false);
  const [showSimulation, setShowSimulation] = useState(false);
  const [simulatedContact, setSimulatedContact] = useState({
    email: "test@example.com",
    tags: ["newsletter"],
    purchases: 0,
    lastOpen: null as string | null,
  });
  const [simulationPath, setSimulationPath] = useState<string[]>([]);
  const [simulationStep, setSimulationStep] = useState(-1);
  const [history, setHistory] = useState<{ nodes: Node[]; edges: Edge[] }[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Undo/Redo Logic
  const saveToHistory = useCallback(
    (currentNodes: Node[], currentEdges: Edge[]) => {
      setHistory((prev) => {
        const newHistory = prev.slice(0, historyIndex + 1);
        return [...newHistory, { nodes: currentNodes, edges: currentEdges }].slice(-20); // Keep last 20
      });
      setHistoryIndex((prev) => prev + 1);
    },
    [historyIndex]
  );

  const undo = () => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      setNodes(prevState.nodes);
      setEdges(prevState.edges);
      setHistoryIndex(historyIndex - 1);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setNodes(nextState.nodes);
      setEdges(nextState.edges);
      setHistoryIndex(historyIndex + 1);
    }
  };

  // Auto-layout Logic
  const onLayout = useCallback(() => {
    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: "TB", nodesep: 100, ranksep: 100 });
    g.setDefaultEdgeLabel(() => ({}));

    nodes.forEach((node) => {
      g.setNode(node.id, { width: 200, height: 100 });
    });

    edges.forEach((edge) => {
      g.setEdge(edge.source, edge.target);
    });

    dagre.layout(g);

    const layoutedNodes = nodes.map((node) => {
      const nodeWithPosition = g.node(node.id);
      return {
        ...node,
        position: {
          x: nodeWithPosition.x - 100,
          y: nodeWithPosition.y - 50,
        },
      };
    });

    setNodes(layoutedNodes);
    saveToHistory(layoutedNodes, edges);
  }, [nodes, edges, setNodes, saveToHistory]);

  useEffect(() => {
    if (activeFlow && historyIndex === -1) {
      try {
        const parsedNodes = activeFlow.nodes ? JSON.parse(activeFlow.nodes) : [];
        const parsedEdges = activeFlow.edges ? JSON.parse(activeFlow.edges) : [];
        setHistory([{ nodes: parsedNodes, edges: parsedEdges }]);
        setHistoryIndex(0);
      } catch (e) {
        console.error("Failed to initialize history", e);
        setHistory([{ nodes: [], edges: [] }]);
        setHistoryIndex(0);
      }
    }
  }, [activeFlow, historyIndex]);

  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        data: {
          ...node.data,
          isHeatmapOn: showHeatmap,
          isSimulationStep: simulationPath[simulationStep] === node.id,
        },
      }))
    );
  }, [showHeatmap, simulationPath, simulationStep, setNodes]);

  useEffect(() => {
    api.getFlows().then(setFlows);
    api.getEvents().then(setEvents);
    api.getWorkflowTemplates().then(setTemplates);
    api
      .getCampaigns()
      .then((campaigns) =>
        setEmailCampaigns(
          campaigns.filter(
            (campaign) =>
              campaign.channel === "EMAIL" && ["DRAFT", "ARCHIVED"].includes(campaign.status)
          )
        )
      );
    api.getTags().then((tags) => {
      if (Array.isArray(tags) && tags.length > 0) {
        setAvailableTags(tags);
      } else {
        setAvailableTags([]);
      }
    });
  }, []);

  const loadAnalytics = async (flowId: string) => {
    setIsAnalyticsLoading(true);
    try {
      const analytics = await api.getFlowAnalytics(flowId);

      setNodes((nds) =>
        nds.map((node) => ({
          ...node,
          data: {
            ...node.data,
            stats: analytics[node.id] || null,
          },
        }))
      );
    } catch (error) {
      console.error("Failed to load flow analytics", error);
    } finally {
      setIsAnalyticsLoading(false);
    }
  };

  const validateFlow = () => {
    const errors: string[] = [];
    const nodeErrors: Record<string, string[]> = {};

    // Helper to add node error
    const addNodeError = (nodeId: string, error: string) => {
      if (!nodeErrors[nodeId]) nodeErrors[nodeId] = [];
      nodeErrors[nodeId].push(error);
      errors.push(error);
    };

    // 1. Check for triggers
    const triggerNodes = nodes.filter((n) => n.data.type === "Trigger");
    if (triggerNodes.length === 0) {
      errors.push("At least one trigger node is required.");
    }

    // 2. Check for disconnected nodes
    nodes.forEach((node) => {
      if (node.data.type !== "Trigger") {
        const hasIncoming = edges.some((e) => e.target === node.id);
        if (!hasIncoming) {
          addNodeError(node.id, `Node "${node.data.label}" is not connected to the workflow.`);
        }
      }

      // Check for outgoing (unless it's an end node)
      const hasOutgoing = edges.some((e) => e.source === node.id);
      if (!hasOutgoing && node.data.type !== "Action") {
        // Actions can be end nodes
      }
    });

    // 3. Check for missing configuration
    nodes.forEach((node) => {
      const config = node.data.config;
      if (node.data.label === "Send Email" && !config?.campaignId) {
        addNodeError(node.id, `Email node is missing a campaign blueprint.`);
      }
      if (node.data.label === "Add Tag" && !config?.tagId) {
        addNodeError(node.id, `Tag node is missing a tag selection.`);
      }
      if (node.data.label === "Wait" && (!config?.duration || config.duration <= 0)) {
        addNodeError(node.id, `Delay node has an invalid duration.`);
      }
      if (node.data.label === "If/Else" && !node.data.config?.conditionType) {
        addNodeError(node.id, `Logic node is missing a condition.`);
      }
    });

    // Update nodes with error state
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        data: {
          ...node.data,
          errors: nodeErrors[node.id] || null,
        },
      }))
    );

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const onConnect = useCallback(
    (params: Connection) => {
      const newEdges = addEdge(params, edges);
      setEdges(newEdges);
      saveToHistory(nodes, newEdges);
    },
    [setEdges, edges, nodes, saveToHistory]
  );

  const onNodeDragStop = useCallback(() => {
    saveToHistory(nodes, edges);
  }, [nodes, edges, saveToHistory]);

  const onNodesDelete = useCallback(
    (deleted: Node[]) => {
      const newNodes = nodes.filter((n) => !deleted.find((d) => d.id === n.id));
      saveToHistory(newNodes, edges);
    },
    [nodes, edges, saveToHistory]
  );

  const onEdgesDelete = useCallback(
    (deleted: Edge[]) => {
      const newEdges = edges.filter((e) => !deleted.find((d) => d.id === e.id));
      saveToHistory(nodes, newEdges);
    },
    [nodes, edges, saveToHistory]
  );

  const handleCreateFlow = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const flow = await api.addFlow({ name: newFlowName, status: "DRAFT" });
      setFlows([flow, ...flows]);
      setIsCreating(false);
      setNewFlowName("");
      openFlow(flow);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Workflow creation failed.");
    }
  };

  const handleCreateFromTemplate = async (templateId: string) => {
    try {
      const flow = await api.createFlowFromTemplate(templateId);
      if ((flow as any).error) {
        alert("Error creating flow: " + (flow as any).error);
        return;
      }
      setFlows([flow, ...flows]);
      setView("FLOWS");
      openFlow(flow);
    } catch (error) {
      console.error("Failed to create flow from template", error);
      alert("Failed to create flow from template. Please try again.");
    }
  };

  const openFlow = (flow: Flow) => {
    setActiveFlow(flow);
    try {
      const parsedNodes = flow.nodes ? JSON.parse(flow.nodes) : [];
      setNodes(parsedNodes);
      setEdges(flow.edges ? JSON.parse(flow.edges) : []);

      // If the flow is active, load analytics
      if (flow.status === "ACTIVE") {
        loadAnalytics(flow.id);
      }
    } catch (e) {
      console.error("Failed to parse flow nodes/edges", e);
      setNodes([]);
      setEdges([]);
    }
  };

  const saveFlow = async () => {
    if (!activeFlow) return;
    try {
      const updated = await api.updateFlow(activeFlow.id, {
        nodes: JSON.stringify(nodes),
        edges: JSON.stringify(edges),
      });
      setFlows(flows.map((f) => (f.id === updated.id ? updated : f)));
      alert("Workflow saved.");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Workflow save failed.");
    }
  };

  const addNode = (type: string, label: string, iconName: string, color: string) => {
    const newNode: Node = {
      id: `node-${Date.now()}`,
      type: "custom",
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      data: { label, type, icon: iconName, color, stats: null, config: {} },
    };
    const newNodes = nodes.concat(newNode);
    setNodes(newNodes);
    saveToHistory(newNodes, edges);
  };

  const updateNodeConfig = (nodeId: string, config: any) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          const updatedNode = {
            ...node,
            data: {
              ...node.data,
              config: {
                ...node.data.config,
                ...config,
              },
            },
          };
          return updatedNode;
        }
        return node;
      })
    );

    // Save to history after state update
    setTimeout(() => {
      setNodes((nds) => {
        setEdges((eds) => {
          saveToHistory(nds, eds);
          return eds;
        });
        return nds;
      });
    }, 0);

    // Also update selectedNode to reflect changes in UI
    if (selectedNode?.id === nodeId) {
      setSelectedNode((prev: any) => ({
        ...prev,
        data: {
          ...prev.data,
          config: {
            ...prev.data.config,
            ...config,
          },
        },
      }));
    }
  };

  if (activeFlow) {
    return (
      <div className="h-[calc(100vh-120px)] flex flex-col -m-10">
        <div className="bg-surface border-b border-border-hairline p-6 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button onClick={() => setActiveFlow(null)} className="text-ink/40 hover:text-burgundy">
              <ChevronRight className="rotate-180" size={20} />
            </button>
            <div>
              <h2 className="font-serif text-2xl font-bold">{activeFlow.name}</h2>
              <p className="text-[10px] font-mono text-ink/40 uppercase">
                Status: {activeFlow.status}
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex items-center gap-1 mr-4 border-r border-border-hairline pr-4">
              <button
                onClick={undo}
                disabled={historyIndex <= 0}
                className="p-2 text-ink/40 hover:text-ink disabled:opacity-20 transition-colors"
                title="Undo"
              >
                <Undo size={16} />
              </button>
              <button
                onClick={redo}
                disabled={historyIndex >= history.length - 1}
                className="p-2 text-ink/40 hover:text-ink disabled:opacity-20 transition-colors"
                title="Redo"
              >
                <Redo size={16} />
              </button>
              <button
                onClick={onLayout}
                className="p-2 text-ink/40 hover:text-brass transition-colors"
                title="Auto-layout"
              >
                <LayoutTemplate size={16} />
              </button>
            </div>
            <button
              onClick={() => setShowHeatmap(!showHeatmap)}
              className={cn(
                "flex items-center gap-2 px-3 py-1 border text-[10px] font-bold uppercase transition-colors",
                showHeatmap
                  ? "bg-brass text-white border-brass"
                  : "bg-surface text-ink border-border-hairline hover:border-ink"
              )}
            >
              <Zap size={14} />
              {showHeatmap ? "Heatmap On" : "Heatmap Off"}
            </button>
            <button
              onClick={() => setShowFunnel(!showFunnel)}
              className={cn(
                "flex items-center gap-2 px-3 py-1 border text-[10px] font-bold uppercase transition-colors",
                showFunnel
                  ? "bg-ink text-bg border-ink"
                  : "bg-surface text-ink border-border-hairline hover:border-ink"
              )}
            >
              <BarChart3 size={14} />
              {showFunnel ? "Close Funnel" : "Funnel View"}
            </button>
            <button
              onClick={() => setShowSimulation(true)}
              className="flex items-center gap-2 px-3 py-1 bg-surface border border-border-hairline hover:border-ink text-[10px] font-bold uppercase transition-colors"
            >
              <Play size={14} />
              Simulate
            </button>
            <div className="relative group">
              <button
                className={cn(
                  "flex items-center gap-2 px-3 py-1 border text-[10px] font-bold uppercase transition-colors",
                  activeFlow.scheduledAt
                    ? "bg-emerald-500 text-white border-emerald-500"
                    : "bg-surface text-ink border-border-hairline hover:border-ink"
                )}
              >
                <Clock size={14} />
                {activeFlow.scheduledAt
                  ? `Scheduled: ${new Date(activeFlow.scheduledAt).toLocaleDateString()}`
                  : "Schedule Start"}
              </button>
              <div className="absolute right-0 top-full mt-2 w-64 bg-surface border border-border-hairline p-4 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[60]">
                <p className="text-[10px] font-black uppercase tracking-widest text-ink/40 mb-3">
                  Workflow Schedule
                </p>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase">Start Date & Time</label>
                    <input
                      type="datetime-local"
                      className="w-full bg-bg border border-border-hairline p-2 text-xs"
                      value={activeFlow.scheduledAt || ""}
                      onChange={(e) => {
                        const updated = { ...activeFlow, scheduledAt: e.target.value };
                        setActiveFlow(updated);
                        api.updateFlow(activeFlow.id, { scheduledAt: e.target.value });
                        setFlows(flows.map((f) => (f.id === activeFlow.id ? updated : f)));
                      }}
                    />
                  </div>
                  {activeFlow.scheduledAt && (
                    <button
                      onClick={() => {
                        const updated = { ...activeFlow, scheduledAt: undefined };
                        setActiveFlow(updated);
                        api.updateFlow(activeFlow.id, { scheduledAt: null as any });
                        setFlows(flows.map((f) => (f.id === activeFlow.id ? updated : f)));
                      }}
                      className="w-full py-2 text-[9px] font-bold uppercase text-burgundy hover:bg-burgundy/5"
                    >
                      Remove Schedule
                    </button>
                  )}
                </div>
              </div>
            </div>
            {validationErrors.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-1 bg-burgundy/10 border border-burgundy/20 text-burgundy text-[10px] font-bold uppercase">
                <AlertCircle size={14} />
                {validationErrors.length} Errors
              </div>
            )}
            {activeFlow.status === "ACTIVE" && (
              <button
                onClick={() => loadAnalytics(activeFlow.id)}
                disabled={isAnalyticsLoading}
                className="btn-secondary flex items-center gap-2"
              >
                <RefreshCw size={14} className={cn(isAnalyticsLoading && "animate-spin")} />
                Refresh Stats
              </button>
            )}
            <button onClick={saveFlow} className="btn-secondary">
              Save Changes
            </button>
            <button
              onClick={async () => {
                if (!validateFlow()) {
                  alert("Please fix validation errors before activating the flow.");
                  return;
                }
                try {
                  const updated = await api.updateFlow(activeFlow.id, { status: "ACTIVE" });
                  setActiveFlow(updated);
                  setFlows(flows.map((f) => (f.id === updated.id ? updated : f)));
                  loadAnalytics(updated.id);
                } catch (error) {
                  alert(error instanceof Error ? error.message : "Workflow activation failed.");
                }
              }}
              className="btn-primary"
            >
              Activate Flow
            </button>
          </div>
        </div>

        {validationErrors.length > 0 && (
          <div className="bg-burgundy text-white px-6 py-3 flex flex-col gap-2">
            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
              <div className="flex items-center gap-4">
                <AlertCircle size={16} />
                <span>
                  Workflow has {validationErrors.length} validation errors that prevent activation
                </span>
              </div>
              <button onClick={() => setValidationErrors([])} className="hover:opacity-50">
                Dismiss
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-1 mt-2">
              {validationErrors.map((err, idx) => (
                <div key={idx} className="text-[9px] flex items-start gap-2 opacity-90">
                  <span className="mt-1 w-1 h-1 bg-white rounded-full flex-shrink-0" />
                  {err}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 relative flex">
          <div className="flex-1 relative">
            <ReactFlow
              nodes={nodes.map((n) => ({
                ...n,
                data: {
                  ...n.data,
                  isSimulated: simulationPath.includes(n.id),
                  isSimulationStep: simulationPath[simulationStep] === n.id,
                },
              }))}
              edges={edges.map((e) => ({
                ...e,
                animated: simulationPath.includes(e.source) && simulationPath.includes(e.target),
              }))}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeDragStop={onNodeDragStop}
              onNodesDelete={onNodesDelete}
              onEdgesDelete={onEdgesDelete}
              onNodeClick={(_, node) => setSelectedNode(node)}
              onPaneClick={() => setSelectedNode(null)}
              nodeTypes={automationNodeTypes}
              fitView
            >
              <Background color="#D4CFC6" gap={20} />
              <Controls />
              <MiniMap
                nodeStrokeColor={(n: any) => n.data?.color?.split(" ")[1] || "#141414"}
                nodeColor={(n: any) => n.data?.color?.split(" ")[0] || "#f5f5f5"}
              />
              <Panel
                position="top-right"
                className="bg-bg border border-ink p-4 shadow-xl space-y-4 w-64"
              >
                <p className="text-[10px] font-black uppercase tracking-widest border-b border-border-hairline pb-2">
                  Workflow Components
                </p>

                <div className="space-y-4">
                  <div>
                    <p className="text-[8px] font-black uppercase text-ink/40 mb-2">Triggers</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() =>
                          addNode("Trigger", "On Signup", "Zap", "bg-burgundy/10 text-burgundy")
                        }
                        className="p-2 border border-border-hairline hover:border-burgundy text-[9px] font-bold uppercase text-left"
                      >
                        Signup
                      </button>
                      <button
                        onClick={() =>
                          addNode("Trigger", "Webhook", "Globe", "bg-burgundy/10 text-burgundy")
                        }
                        className="p-2 border border-border-hairline hover:border-burgundy text-[9px] font-bold uppercase text-left"
                      >
                        Webhook
                      </button>
                      <button
                        onClick={() =>
                          addNode(
                            "Trigger",
                            "Custom Event",
                            "Sparkles",
                            "bg-burgundy/10 text-burgundy"
                          )
                        }
                        className="p-2 border border-border-hairline hover:border-burgundy text-[9px] font-bold uppercase text-left"
                      >
                        Event
                      </button>
                    </div>
                  </div>

                  <div>
                    <p className="text-[8px] font-black uppercase text-ink/40 mb-2">Actions</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => addNode("Action", "Send Email", "Mail", "bg-ink/5 text-ink")}
                        className="p-2 border border-border-hairline hover:border-burgundy text-[9px] font-bold uppercase text-left"
                      >
                        Email
                      </button>
                      <button
                        onClick={() => addNode("Action", "Wait", "Clock", "bg-ink/5 text-ink")}
                        className="p-2 border border-border-hairline hover:border-burgundy text-[9px] font-bold uppercase text-left"
                      >
                        Delay
                      </button>
                    </div>
                  </div>

                  <div>
                    <p className="text-[8px] font-black uppercase text-ink/40 mb-2">Logic</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() =>
                          addNode("Logic", "If/Else", "Split", "bg-brass/10 text-brass")
                        }
                        className="p-2 border border-border-hairline hover:border-burgundy text-[9px] font-bold uppercase text-left"
                      >
                        Split
                      </button>
                    </div>
                  </div>
                </div>
              </Panel>
            </ReactFlow>
          </div>

          {/* Node Configuration Panel */}
          <AnimatePresence>
            {showFunnel && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-surface border-2 border-ink w-full max-w-4xl p-8 space-y-8"
                >
                  <div className="flex justify-between items-center border-b border-border-hairline pb-4">
                    <div className="flex items-center gap-3">
                      <BarChart3 className="text-burgundy" size={24} />
                      <h3 className="text-2xl font-serif font-black uppercase italic">
                        Journey Funnel Analysis
                      </h3>
                    </div>
                    <button onClick={() => setShowFunnel(false)} className="hover:opacity-50">
                      <X size={24} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                      <p className="text-[10px] font-black uppercase tracking-widest text-ink/40">
                        Step-by-Step Conversion
                      </p>
                      <div className="space-y-4">
                        {nodes
                          .filter((n) => n.data.stats)
                          .sort((a, b) => (b.data.stats.entries || 0) - (a.data.stats.entries || 0))
                          .slice(0, 6)
                          .map((node, idx, arr) => {
                            const stats = node.data.stats;
                            const dropOff =
                              stats.entries > 0
                                ? ((stats.entries - (stats.processed || 0)) / stats.entries) * 100
                                : 0;
                            const width = (stats.entries / arr[0].data.stats.entries) * 100;

                            return (
                              <div key={node.id} className="space-y-1">
                                <div className="flex justify-between items-end">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-mono text-ink/40">
                                      0{idx + 1}
                                    </span>
                                    <span className="text-xs font-bold uppercase">
                                      {node.data.label}
                                    </span>
                                  </div>
                                  <div className="text-right">
                                    <span className="text-xs font-serif font-bold">
                                      {stats.entries.toLocaleString()}
                                    </span>
                                    <span className="text-[8px] font-black uppercase text-ink/40 ml-2">
                                      Entries
                                    </span>
                                  </div>
                                </div>
                                <div className="relative h-6 bg-ink/5 overflow-hidden">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${width}%` }}
                                    className="h-full bg-brass/20 border-r-2 border-brass"
                                  />
                                  {idx > 0 && (
                                    <div className="absolute inset-y-0 left-0 flex items-center px-2">
                                      <span className="text-[8px] font-black uppercase text-burgundy">
                                        -{Math.round(dropOff)}% Drop
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>

                    <div className="space-y-6">
                      <p className="text-[10px] font-black uppercase tracking-widest text-ink/40">
                        Critical Bottlenecks
                      </p>
                      <div className="space-y-4">
                        {nodes
                          .filter((n) => n.data.stats)
                          .map((n) => ({
                            id: n.id,
                            label: n.data.label,
                            dropOff:
                              n.data.stats.entries > 0
                                ? ((n.data.stats.entries - (n.data.stats.processed || 0)) /
                                    n.data.stats.entries) *
                                  100
                                : 0,
                          }))
                          .sort((a, b) => b.dropOff - a.dropOff)
                          .filter((n) => n.dropOff > 20)
                          .slice(0, 4)
                          .map((b, idx) => (
                            <div
                              key={b.id}
                              className="p-4 border border-burgundy/20 bg-burgundy/5 space-y-2"
                            >
                              <div className="flex justify-between items-start">
                                <span className="text-[9px] font-black uppercase text-burgundy">
                                  Priority 0{idx + 1}
                                </span>
                                <AlertTriangle size={14} className="text-burgundy" />
                              </div>
                              <p className="text-sm font-serif font-bold">{b.label}</p>
                              <div className="flex justify-between items-center">
                                <span className="text-[8px] font-black uppercase text-ink/40">
                                  Drop-off Rate
                                </span>
                                <span className="text-xs font-bold text-burgundy">
                                  {Math.round(b.dropOff)}%
                                </span>
                              </div>
                            </div>
                          ))}

                        {nodes.filter(
                          (n) =>
                            n.data.stats &&
                            ((n.data.stats.entries - (n.data.stats.processed || 0)) /
                              n.data.stats.entries) *
                              100 >
                              20
                        ).length === 0 && (
                          <div className="p-8 border border-dashed border-border-hairline text-center">
                            <CheckCircle2
                              size={24}
                              className="mx-auto text-status-success mb-2 opacity-20"
                            />
                            <p className="text-[10px] font-black uppercase tracking-widest text-ink/20">
                              No major bottlenecks detected
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}

            {showSimulation && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-surface border-2 border-ink w-full max-w-md p-8 space-y-6"
                >
                  <div className="flex justify-between items-center border-b border-border-hairline pb-4">
                    <h3 className="text-xl font-serif font-black uppercase italic">
                      Simulate Journey
                    </h3>
                    <button
                      onClick={() => {
                        setShowSimulation(false);
                        setSimulationPath([]);
                      }}
                      className="hover:opacity-50"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-ink/40">
                        Test Contact Profile
                      </label>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold uppercase">
                            Tags (comma separated)
                          </label>
                          <input
                            type="text"
                            className="w-full p-2 border border-border-hairline text-xs font-mono"
                            value={simulatedContact.tags.join(", ")}
                            onChange={(e) =>
                              setSimulatedContact({
                                ...simulatedContact,
                                tags: e.target.value.split(",").map((t) => t.trim()),
                              })
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold uppercase">Purchases</label>
                          <input
                            type="number"
                            className="w-full p-2 border border-border-hairline text-xs font-mono"
                            value={simulatedContact.purchases}
                            onChange={(e) =>
                              setSimulatedContact({
                                ...simulatedContact,
                                purchases: parseInt(e.target.value),
                              })
                            }
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const path: string[] = [];
                          let currentNode = nodes.find((n) => n.data.type === "Trigger");

                          if (currentNode) {
                            path.push(currentNode.id);

                            for (let i = 0; i < 20; i++) {
                              const outgoingEdges = edges.filter(
                                (e) => e.source === currentNode?.id
                              );
                              if (outgoingEdges.length === 0) break;

                              if (currentNode?.data.label === "If/Else") {
                                const config = currentNode.data.config;
                                let result = false;
                                if (config?.condition === "tag_exists") {
                                  result = simulatedContact.tags.includes(config.tagId);
                                } else if (config?.condition === "has_purchased") {
                                  result = simulatedContact.purchases > 0;
                                }

                                const targetEdge = outgoingEdges.find(
                                  (e) => e.sourceHandle === (result ? "true" : "false")
                                );
                                if (targetEdge) {
                                  currentNode = nodes.find((n) => n.id === targetEdge.target);
                                } else {
                                  break;
                                }
                              } else if (currentNode?.data.label === "A/B Test") {
                                const result =
                                  Math.random() * 100 <
                                  (currentNode.data.config?.splitPercentage || 50)
                                    ? "a"
                                    : "b";
                                const targetEdge = outgoingEdges.find(
                                  (e) => e.sourceHandle === result
                                );
                                if (targetEdge) {
                                  currentNode = nodes.find((n) => n.id === targetEdge.target);
                                } else {
                                  break;
                                }
                              } else if (currentNode?.data.label === "Multi-path Split") {
                                const paths = currentNode.data.config?.paths || [
                                  "Path 1",
                                  "Path 2",
                                ];
                                const randomIdx = Math.floor(Math.random() * paths.length);
                                const targetEdge = outgoingEdges.find(
                                  (e) => e.sourceHandle === `path-${randomIdx}`
                                );
                                if (targetEdge) {
                                  currentNode = nodes.find((n) => n.id === targetEdge.target);
                                } else {
                                  currentNode = nodes.find((n) => n.id === outgoingEdges[0].target);
                                }
                              } else {
                                currentNode = nodes.find((n) => n.id === outgoingEdges[0].target);
                              }

                              if (currentNode) {
                                path.push(currentNode.id);
                              } else {
                                break;
                              }
                            }
                          }
                          setSimulationPath(path);
                          setSimulationStep(0);
                        }}
                        className="flex-1 py-3 bg-burgundy text-white text-xs font-black uppercase tracking-widest hover:bg-burgundy/90 transition-colors flex items-center justify-center gap-2"
                      >
                        <Play size={14} />
                        Start Simulation
                      </button>
                      {simulationPath.length > 0 && (
                        <button
                          onClick={() => {
                            if (simulationStep < simulationPath.length - 1) {
                              setSimulationStep((prev) => prev + 1);
                            } else {
                              setSimulationStep(0);
                            }
                          }}
                          className="p-3 bg-brass text-white hover:bg-brass/90 transition-colors"
                          title="Next Step"
                        >
                          <StepForward size={20} />
                        </button>
                      )}
                      {simulationPath.length > 0 && (
                        <button
                          onClick={() => {
                            setSimulationPath([]);
                            setSimulationStep(-1);
                          }}
                          className="p-3 bg-ink text-bg hover:bg-ink/90 transition-colors"
                          title="Reset"
                        >
                          <RotateCcw size={20} />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              </div>
            )}

            {selectedNode && (
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                className="w-80 bg-surface border-l border-border-hairline p-6 overflow-y-auto z-50"
              >
                <div className="flex justify-between items-center mb-8">
                  <h3 className="font-serif text-xl font-bold">{t("automations.configureNode")}</h3>
                  <button
                    onClick={() => setSelectedNode(null)}
                    className="text-ink/40 hover:text-burgundy"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-8">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-ink/40 mb-2">
                      Node Type
                    </p>
                    <div className="flex items-center gap-3 p-3 bg-bg border border-border-hairline">
                      <div className={cn("p-2", selectedNode.data.color)}>
                        {React.createElement(iconMap[selectedNode.data.icon] || Zap, { size: 16 })}
                      </div>
                      <div>
                        <p className="text-xs font-bold">{selectedNode.data.label}</p>
                        <p className="text-[8px] font-black uppercase text-ink/40">
                          {selectedNode.data.type}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-border-hairline">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-black uppercase tracking-widest text-ink/40">
                        Step Schedule
                      </p>
                      <button
                        onClick={() =>
                          updateNodeConfig(selectedNode.id, {
                            hasStepSchedule: !selectedNode.data.config?.hasStepSchedule,
                          })
                        }
                        className={cn(
                          "text-[8px] font-bold uppercase px-2 py-0.5 border transition-colors",
                          selectedNode.data.config?.hasStepSchedule
                            ? "bg-emerald-500 text-white border-emerald-500"
                            : "text-ink/40 border-border-hairline hover:border-ink"
                        )}
                      >
                        {selectedNode.data.config?.hasStepSchedule ? "Enabled" : "Disabled"}
                      </button>
                    </div>
                    {selectedNode.data.config?.hasStepSchedule && (
                      <div className="space-y-3 p-3 bg-emerald-50/50 border border-emerald-100">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold uppercase">Execution Time</label>
                          <select
                            className="w-full bg-surface border border-border-hairline p-2 text-xs"
                            value={selectedNode.data.config?.stepScheduleType || "delay"}
                            onChange={(e) =>
                              updateNodeConfig(selectedNode.id, {
                                stepScheduleType: e.target.value,
                              })
                            }
                          >
                            <option value="delay">Relative Delay</option>
                            <option value="fixed">Fixed Date/Time</option>
                          </select>
                        </div>
                        {selectedNode.data.config?.stepScheduleType === "fixed" ? (
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold uppercase">Run At</label>
                            <input
                              type="datetime-local"
                              className="w-full bg-surface border border-border-hairline p-2 text-xs"
                              value={selectedNode.data.config?.stepScheduledAt || ""}
                              onChange={(e) =>
                                updateNodeConfig(selectedNode.id, {
                                  stepScheduledAt: e.target.value,
                                })
                              }
                            />
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold uppercase">Delay</label>
                              <input
                                type="number"
                                className="w-full bg-surface border border-border-hairline p-2 text-xs"
                                value={selectedNode.data.config?.stepDelay || 0}
                                onChange={(e) =>
                                  updateNodeConfig(selectedNode.id, {
                                    stepDelay: parseInt(e.target.value),
                                  })
                                }
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold uppercase">Unit</label>
                              <select
                                className="w-full bg-surface border border-border-hairline p-2 text-xs"
                                value={selectedNode.data.config?.stepDelayUnit || "hours"}
                                onChange={(e) =>
                                  updateNodeConfig(selectedNode.id, {
                                    stepDelayUnit: e.target.value,
                                  })
                                }
                              >
                                <option value="minutes">Min</option>
                                <option value="hours">Hrs</option>
                                <option value="days">Days</option>
                              </select>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Specific Configuration Forms */}
                  {selectedNode.data.label === "Send Email" && (
                    <div className="space-y-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-ink/40">
                        Email Settings
                      </p>
                      <div className="space-y-2">
                        <label className="text-[9px] font-bold uppercase">
                          Select Campaign Blueprint
                        </label>
                        <select
                          className="w-full bg-bg border border-border-hairline p-2 text-xs"
                          value={selectedNode.data.config?.campaignId || ""}
                          onChange={(e) =>
                            updateNodeConfig(selectedNode.id, { campaignId: e.target.value })
                          }
                        >
                          <option value="">Choose a draft campaign...</option>
                          {emailCampaigns.map((campaign) => (
                            <option key={campaign.id} value={campaign.id}>
                              {campaign.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-bold uppercase">
                          Subject Override (Optional)
                        </label>
                        <input
                          type="text"
                          className="w-full bg-bg border border-border-hairline p-2 text-xs"
                          placeholder="Leave empty to use template subject"
                          value={selectedNode.data.config?.subject || ""}
                          onChange={(e) =>
                            updateNodeConfig(selectedNode.id, { subject: e.target.value })
                          }
                        />
                      </div>
                    </div>
                  )}

                  {selectedNode.data.label === "Scheduled" && (
                    <div className="space-y-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-ink/40">
                        Schedule Settings
                      </p>
                      <div className="space-y-2">
                        <label className="text-[9px] font-bold uppercase">Schedule Type</label>
                        <select
                          className="w-full bg-bg border border-border-hairline p-2 text-xs"
                          value={selectedNode.data.config?.scheduleType || "once"}
                          onChange={(e) =>
                            updateNodeConfig(selectedNode.id, { scheduleType: e.target.value })
                          }
                        >
                          <option value="once">One-time</option>
                          <option value="recurring">Recurring</option>
                        </select>
                      </div>
                      {selectedNode.data.config?.scheduleType === "once" ? (
                        <div className="space-y-2">
                          <label className="text-[9px] font-bold uppercase">Date & Time</label>
                          <input
                            type="datetime-local"
                            className="w-full bg-bg border border-border-hairline p-2 text-xs"
                            value={selectedNode.data.config?.scheduledAt || ""}
                            onChange={(e) =>
                              updateNodeConfig(selectedNode.id, { scheduledAt: e.target.value })
                            }
                          />
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <label className="text-[9px] font-bold uppercase">Frequency</label>
                          <select
                            className="w-full bg-bg border border-border-hairline p-2 text-xs"
                            value={selectedNode.data.config?.frequency || "daily"}
                            onChange={(e) =>
                              updateNodeConfig(selectedNode.id, { frequency: e.target.value })
                            }
                          >
                            <option value="hourly">Hourly</option>
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                          </select>
                        </div>
                      )}
                    </div>
                  )}

                  {selectedNode.data.label === "Wait" && (
                    <div className="space-y-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-ink/40">
                        Delay Settings
                      </p>
                      <div className="space-y-2">
                        <label className="text-[9px] font-bold uppercase">Wait Type</label>
                        <select
                          className="w-full bg-bg border border-border-hairline p-2 text-xs"
                          value={selectedNode.data.config?.waitType || "duration"}
                          onChange={(e) =>
                            updateNodeConfig(selectedNode.id, { waitType: e.target.value })
                          }
                        >
                          <option value="duration">Specific Duration</option>
                          <option value="until">Until Specific Date</option>
                        </select>
                      </div>

                      {selectedNode.data.config?.waitType === "until" ? (
                        <div className="space-y-2">
                          <label className="text-[9px] font-bold uppercase">Wait Until</label>
                          <input
                            type="datetime-local"
                            className="w-full bg-bg border border-border-hairline p-2 text-xs"
                            value={selectedNode.data.config?.waitUntil || ""}
                            onChange={(e) =>
                              updateNodeConfig(selectedNode.id, { waitUntil: e.target.value })
                            }
                          />
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[9px] font-bold uppercase">Duration</label>
                            <input
                              type="number"
                              className="w-full bg-bg border border-border-hairline p-2 text-xs"
                              value={selectedNode.data.config?.duration || 1}
                              onChange={(e) =>
                                updateNodeConfig(selectedNode.id, {
                                  duration: parseInt(e.target.value),
                                })
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[9px] font-bold uppercase">Unit</label>
                            <select
                              className="w-full bg-bg border border-border-hairline p-2 text-xs"
                              value={selectedNode.data.config?.unit || "days"}
                              onChange={(e) =>
                                updateNodeConfig(selectedNode.id, { unit: e.target.value })
                              }
                            >
                              <option value="minutes">Minutes</option>
                              <option value="hours">Hours</option>
                              <option value="days">Days</option>
                              <option value="weeks">Weeks</option>
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {selectedNode.data.label === "Add Tag" && (
                    <div className="space-y-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-ink/40">
                        Tag Settings
                      </p>
                      <div className="space-y-2">
                        <label className="text-[9px] font-bold uppercase">Select Tag</label>
                        <select
                          className="w-full bg-bg border border-border-hairline p-2 text-xs"
                          value={selectedNode.data.config?.tagId || ""}
                          onChange={(e) =>
                            updateNodeConfig(selectedNode.id, { tagId: e.target.value })
                          }
                        >
                          <option value="">Choose a tag...</option>
                          {availableTags.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {selectedNode.data.label === "If/Else" && (
                    <div className="space-y-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-ink/40">
                        Logic Settings
                      </p>
                      <div className="space-y-2">
                        <label className="text-[9px] font-bold uppercase">Condition Type</label>
                        <select
                          className="w-full bg-bg border border-border-hairline p-2 text-xs"
                          value={selectedNode.data.config?.conditionType || "email_open"}
                          onChange={(e) =>
                            updateNodeConfig(selectedNode.id, { conditionType: e.target.value })
                          }
                        >
                          <option value="email_open">Email Opened</option>
                          <option value="email_click">Link Clicked</option>
                          <option value="tag_exists">Has Tag</option>
                          <option value="purchase_made">Made Purchase</option>
                        </select>
                      </div>
                      {selectedNode.data.config?.conditionType === "tag_exists" && (
                        <div className="space-y-2">
                          <label className="text-[9px] font-bold uppercase">Tag to Check</label>
                          <select
                            className="w-full bg-bg border border-border-hairline p-2 text-xs"
                            value={selectedNode.data.config?.checkTagId || ""}
                            onChange={(e) =>
                              updateNodeConfig(selectedNode.id, { checkTagId: e.target.value })
                            }
                          >
                            <option value="">Choose a tag...</option>
                            {availableTags.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  )}

                  {selectedNode.data.label === "A/B Test" && (
                    <div className="space-y-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-ink/40">
                        A/B Test Settings
                      </p>
                      <div className="space-y-2">
                        <label className="text-[9px] font-bold uppercase">
                          Split Percentage (Var A)
                        </label>
                        <div className="flex items-center gap-4">
                          <input
                            type="range"
                            min="0"
                            max="100"
                            className="flex-1 accent-burgundy"
                            value={selectedNode.data.config?.splitPercentage || 50}
                            onChange={(e) =>
                              updateNodeConfig(selectedNode.id, {
                                splitPercentage: parseInt(e.target.value),
                              })
                            }
                          />
                          <span className="text-xs font-mono font-bold w-12">
                            {selectedNode.data.config?.splitPercentage || 50}%
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[9px] font-bold uppercase">Winner Criteria</label>
                        <select
                          className="w-full bg-bg border border-border-hairline p-2 text-xs"
                          value={selectedNode.data.config?.winnerCriteria || "OPEN_RATE"}
                          onChange={(e) =>
                            updateNodeConfig(selectedNode.id, { winnerCriteria: e.target.value })
                          }
                        >
                          <option value="OPEN_RATE">Highest Open Rate</option>
                          <option value="CLICK_RATE">Highest Click Rate</option>
                          <option value="REVENUE">Highest Revenue</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[9px] font-bold uppercase">
                          Test Duration (Hours)
                        </label>
                        <input
                          type="number"
                          className="w-full bg-bg border border-border-hairline p-2 text-xs"
                          value={selectedNode.data.config?.testDuration || 24}
                          onChange={(e) =>
                            updateNodeConfig(selectedNode.id, {
                              testDuration: parseInt(e.target.value),
                            })
                          }
                        />
                      </div>

                      <div className="p-3 bg-bg border border-border-hairline text-[10px] text-ink/60 italic">
                        Contacts will be randomly split between Path A and Path B. After the
                        duration, the winner will be determined based on the selected criteria.
                      </div>
                    </div>
                  )}

                  {selectedNode.data.label === "Multi-path Split" && (
                    <div className="space-y-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-ink/40">
                        Multi-path Settings
                      </p>
                      <div className="space-y-3">
                        <label className="text-[9px] font-bold uppercase">Paths</label>
                        {(selectedNode.data.config?.paths || ["Path 1", "Path 2"]).map(
                          (path: string, idx: number) => (
                            <div key={idx} className="flex gap-2">
                              <input
                                type="text"
                                className="flex-1 bg-bg border border-border-hairline p-2 text-xs"
                                value={path}
                                onChange={(e) => {
                                  const newPaths = [
                                    ...(selectedNode.data.config?.paths || ["Path 1", "Path 2"]),
                                  ];
                                  newPaths[idx] = e.target.value;
                                  updateNodeConfig(selectedNode.id, { paths: newPaths });
                                }}
                              />
                              <button
                                onClick={() => {
                                  const newPaths = (
                                    selectedNode.data.config?.paths || ["Path 1", "Path 2"]
                                  ).filter((_: any, i: number) => i !== idx);
                                  updateNodeConfig(selectedNode.id, { paths: newPaths });
                                }}
                                className="p-2 text-burgundy hover:bg-burgundy/5"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          )
                        )}
                        <button
                          onClick={() => {
                            const newPaths = [
                              ...(selectedNode.data.config?.paths || ["Path 1", "Path 2"]),
                              `Path ${(selectedNode.data.config?.paths || ["Path 1", "Path 2"]).length + 1}`,
                            ];
                            updateNodeConfig(selectedNode.id, { paths: newPaths });
                          }}
                          className="w-full py-2 border border-dashed border-border-hairline text-[9px] font-bold uppercase hover:border-ink"
                        >
                          + Add Path
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="pt-8 border-t border-border-hairline">
                    <button
                      onClick={() => {
                        setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
                        setSelectedNode(null);
                      }}
                      className="w-full py-3 border border-burgundy/20 text-burgundy text-[10px] font-black uppercase tracking-widest hover:bg-burgundy hover:text-white transition-all"
                    >
                      Delete Node
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-16">
      <SectionHeader
        title={t("automations.title")}
        subtitle={t("automations.subtitle")}
        guideKey="automation-flows"
        action={
          <div className="flex gap-4">
            <div className="flex bg-surface border border-border-hairline p-1">
              <button
                onClick={() => setView("FLOWS")}
                className={cn(
                  "px-4 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all",
                  view === "FLOWS" ? "bg-ink text-bg" : "text-ink/40 hover:text-ink"
                )}
              >
                {t("nav.automations")}
              </button>
              <button
                onClick={() => setView("TEMPLATES")}
                className={cn(
                  "px-4 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all",
                  view === "TEMPLATES" ? "bg-ink text-bg" : "text-ink/40 hover:text-ink"
                )}
              >
                {t("nav.templates")}
              </button>
              <button
                onClick={() => setView("EVENTS")}
                className={cn(
                  "px-4 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all",
                  view === "EVENTS" ? "bg-ink text-bg" : "text-ink/40 hover:text-ink"
                )}
              >
                {t("automations.events")}
              </button>
            </div>
            <button
              onClick={() => setIsCreating(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={16} /> {t("automations.createFlow")}
            </button>
          </div>
        }
      />

      {view === "FLOWS" && (
        <div className="newspaper-grid">
          {flows.map((flow) => {
            let parsedNodes: any[] = [];
            try {
              parsedNodes = JSON.parse(flow.nodes || "[]");
            } catch {}
            const triggerNodes = parsedNodes.filter((n: any) => n.data?.type === "Trigger");
            const actionNodes = parsedNodes.filter((n: any) => n.data?.type === "Action");
            const firstTrigger = triggerNodes[0];
            const TriggerIcon = firstTrigger ? iconMap[firstTrigger.data?.icon] || Zap : Zap;

            return (
              <div
                key={flow.id}
                className="col-span-12 lg:col-span-4 bg-surface border border-border-hairline p-8 group hover:border-burgundy transition-all cursor-pointer"
                onClick={() => openFlow(flow)}
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="w-12 h-12 bg-ink text-bg flex items-center justify-center">
                    <TriggerIcon size={24} />
                  </div>
                  <span
                    className={cn(
                      "px-2 py-0.5 text-[8px] font-black uppercase border",
                      flow.status === "ACTIVE"
                        ? "border-status-success text-status-success bg-status-success/5"
                        : "border-ink/20 text-ink/40"
                    )}
                  >
                    {flow.status}
                  </span>
                </div>
                <h3 className="font-serif text-xl font-bold group-hover:text-burgundy transition-colors leading-tight">
                  {flow.name}
                </h3>
                {firstTrigger?.data?.description && (
                  <p className="text-xs font-editorial italic text-ink/50 mt-2 line-clamp-2">
                    {firstTrigger.data.description}
                  </p>
                )}
                <p className="text-[10px] font-mono text-ink/40 uppercase mt-3">
                  Updated {format(new Date(flow.updatedAt), "MMM d, yyyy")}
                </p>
                <div className="mt-6 pt-4 border-t border-border-hairline flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <Activity size={10} className="text-ink/40" />
                      <span className="text-[9px] font-black uppercase text-ink/40">
                        {parsedNodes.length} Steps
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Mail size={10} className="text-ink/40" />
                      <span className="text-[9px] font-black uppercase text-ink/40">
                        {actionNodes.length} Actions
                      </span>
                    </div>
                  </div>
                  <ChevronRight
                    size={16}
                    className="text-ink/20 group-hover:text-burgundy group-hover:translate-x-1 transition-all"
                  />
                </div>
              </div>
            );
          })}

          {flows.length === 0 && (
            <div className="col-span-12 py-32 text-center border border-dashed border-border-hairline">
              <p className="font-editorial italic text-4xl text-ink/20">
                No automation workflows defined.
              </p>
            </div>
          )}
        </div>
      )}

      {view === "TEMPLATES" && (
        <div className="space-y-12">
          {["ONBOARDING", "ENGAGEMENT", "REVENUE", "SUPPORT", "EVENT_DRIVEN", "AI_POWERED"].map(
            (category) => {
              const categoryTemplates = templates.filter((t) => t.category === category);
              if (categoryTemplates.length === 0) return null;

              return (
                <div key={category} className="space-y-6">
                  <h3 className="text-sm font-black uppercase tracking-[0.2em] text-ink/40 border-b border-border-hairline pb-2">
                    {category.replace("_", " ")}
                  </h3>
                  <div className="grid grid-cols-12 gap-6">
                    {categoryTemplates.map((template) => (
                      <div
                        key={template.id}
                        className="col-span-12 lg:col-span-4 bg-surface border border-border-hairline p-8 space-y-6 group hover:border-burgundy transition-all"
                      >
                        <div className="flex justify-between items-start">
                          <div className="w-10 h-10 bg-bg border border-border-hairline flex items-center justify-center text-ink/20 group-hover:text-burgundy">
                            <FileText size={20} />
                          </div>
                          {category === "AI_POWERED" && (
                            <span className="px-2 py-0.5 bg-burgundy text-white text-[8px] font-black uppercase tracking-widest">
                              AI
                            </span>
                          )}
                        </div>
                        <div>
                          <h4 className="text-lg font-serif font-bold text-ink">{template.name}</h4>
                          <p className="text-xs font-editorial italic text-ink/60 mt-1">
                            {template.description}
                          </p>
                        </div>
                        <button
                          onClick={() => handleCreateFromTemplate(template.id)}
                          className="w-full py-2 border border-border-hairline text-[9px] font-black uppercase tracking-widest text-ink/40 group-hover:bg-ink group-hover:text-white group-hover:border-ink transition-all"
                        >
                          Use Template
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            }
          )}
        </div>
      )}

      {view === "EVENTS" && (
        <div className="space-y-8">
          <div className="newspaper-grid">
            <div className="col-span-12 lg:col-span-8">
              <div className="bg-surface border border-border-hairline p-8">
                <h3 className="font-sans font-black uppercase tracking-widest text-xs border-b border-ink pb-4 mb-8">
                  Real-time Event Stream
                </h3>
                <div className="space-y-4">
                  {events.map((event, i) => (
                    <div
                      key={event.id}
                      className="flex items-center gap-6 py-4 border-b border-border-hairline last:border-0"
                    >
                      <div className="w-10 h-10 bg-bg flex items-center justify-center text-burgundy">
                        {event.type === "CLICK" ? (
                          <MousePointerClick size={16} />
                        ) : event.type === "OPEN" ? (
                          <Eye size={16} />
                        ) : event.type === "PURCHASE" ? (
                          <Zap size={16} />
                        ) : (
                          <Globe size={16} />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <p className="text-sm font-bold">
                            {event.contact?.firstName} {event.contact?.lastName}
                          </p>
                          <p className="text-[10px] font-mono text-ink/40 uppercase">
                            {format(new Date(event.timestamp), "HH:mm:ss")}
                          </p>
                        </div>
                        <p className="text-xs text-ink/60">
                          <span className="font-black uppercase text-[10px] text-burgundy mr-2">
                            {event.type}
                          </span>
                          {JSON.parse(event.metadata).url || "Interaction detected"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="col-span-12 lg:col-span-4 space-y-8">
              <div className="bg-inverse text-on-inverse p-8 space-y-6">
                <h3 className="font-serif text-2xl font-bold">{t("automations.eventAnalytics")}</h3>
                <div className="space-y-4">
                  {[
                    { label: "Page Visits", value: "12.4k", delta: "+12%" },
                    { label: "Button Clicks", value: "3.8k", delta: "+5%" },
                    { label: "Purchases", value: "412", delta: "+18%" },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="flex justify-between items-end border-b border-white/10 pb-2"
                    >
                      <div>
                        <p className="text-[10px] font-black uppercase text-white/40">
                          {stat.label}
                        </p>
                        <p className="text-3xl font-serif font-bold">{stat.value}</p>
                      </div>
                      <p className="text-status-success text-xs font-mono">{stat.delta}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-surface border border-border-hairline p-8 space-y-4">
                <h4 className="font-serif text-xl font-bold">{t("automations.customEventsApi")}</h4>
                <p className="text-xs text-ink/60 leading-relaxed">
                  Track custom behavioral data using our SDK or Webhook endpoint.
                </p>
                <div className="bg-bg p-4 font-mono text-[10px] text-ink/60 overflow-x-auto">
                  <p className="text-burgundy">POST /api/events</p>
                  <p className="mt-2">{"{"}</p>
                  <p className="pl-4">"type": "PURCHASE",</p>
                  <p className="pl-4">"metadata": {'{ "amount": 99 }'}</p>
                  <p className="pl-4">"contactId": "..."</p>
                  <p>{"}"}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {isCreating && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-10 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-bg border border-ink w-full max-w-md p-8 shadow-2xl space-y-6"
            >
              <h2 className="font-serif text-2xl font-bold">
                {t("automations.newAutomationWorkflow")}
              </h2>
              <form onSubmit={handleCreateFlow} className="space-y-4">
                <div className="space-y-1">
                  <label className="metric-label">Workflow Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Welcome Series"
                    className="w-full bg-transparent border-b border-border-hairline py-1 font-sans font-bold text-sm outline-none focus:border-burgundy"
                    value={newFlowName}
                    onChange={(e) => setNewFlowName(e.target.value)}
                  />
                </div>
                <div className="pt-4 flex gap-4">
                  <button type="submit" className="btn-primary flex-1 py-3">
                    Create Workflow
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="flex-1 py-3 font-sans font-black uppercase tracking-widest text-[10px] border border-border-hairline"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
