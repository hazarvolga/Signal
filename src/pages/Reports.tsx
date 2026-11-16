import React, { useState, useEffect } from "react";
import { Link } from "react-router";
import {
  Eye,
  MousePointerClick,
  ShoppingBag,
  Users2,
  RefreshCw,
  CheckCircle2,
  ArrowUpRight,
  Sparkles,
  ExternalLink,
  Zap,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { api } from "../services/api";
import { Campaign, Flow } from "../types";
import { format } from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  Cell,
} from "recharts";
import ReactFlow, {
  Background,
  Controls,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  Edge,
  Node,
  Handle,
  Position,
} from "reactflow";
import { cn } from "../lib/utils";
import { HelpTooltip } from "../components/HelpTooltip";
import { StatusBadge } from "../components/ui/StatusBadge";

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

const FunnelStepNode = ({ data }: any) => {
  return (
    <div className="bg-surface border-2 border-ink p-4 min-w-[180px] shadow-[4px_4px_0px_0px_rgba(26,24,20,1)]">
      <Handle type="target" position={Position.Top} className="!bg-ink !w-2 !h-2" />
      <div className="space-y-2">
        <div className="flex justify-between items-center border-b border-ink/10 pb-1">
          <p className="text-[8px] font-black uppercase tracking-widest text-ink/40">
            Step {data.index + 1}
          </p>
          <div className="w-2 h-2 rounded-full bg-burgundy" />
        </div>
        <p className="text-xs font-bold uppercase">{data.step}</p>
        <div className="flex justify-between items-end">
          <p className="text-[10px] font-mono">{data.count.toLocaleString()}</p>
          <p className="text-[10px] font-black text-burgundy">{data.percentage}%</p>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-ink !w-2 !h-2" />
    </div>
  );
};

const funnelNodeTypes = {
  funnelStep: FunnelStepNode,
};

const FunnelBuilder = ({ initialSteps }: { initialSteps: any[] }) => {
  const steps = Array.isArray(initialSteps) ? initialSteps : [];
  const initialNodes: Node[] = steps.map((step, i) => ({
    id: `step-${i}`,
    type: "funnelStep",
    position: { x: 350, y: i * 150 },
    data: { ...step, index: i },
  }));

  const initialEdges: Edge[] = steps.slice(0, -1).map((_, i) => ({
    id: `edge-${i}`,
    source: `step-${i}`,
    target: `step-${i + 1}`,
    animated: true,
    style: { stroke: "#1A1814", strokeWidth: 2 },
  }));

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);

  const onConnect = (params: Connection) => setEdges((eds) => addEdge(params, eds));

  const onDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  };

  const onDrop = (event: React.DragEvent) => {
    event.preventDefault();
    if (!reactFlowInstance) return;

    const type = event.dataTransfer.getData("application/reactflow");
    const label = event.dataTransfer.getData("application/reactflow-label");

    if (typeof type === "undefined" || !type) return;

    const position = reactFlowInstance.screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });

    const newNode: Node = {
      id: `step-${nodes.length}-${Date.now()}`,
      type: "funnelStep",
      position,
      data: { step: label, count: 0, percentage: 0, index: nodes.length },
    };

    setNodes((nds) => nds.concat(newNode));
  };

  return (
    <div className="flex h-[700px] bg-bg border border-border-hairline relative group overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 bg-surface border-r border-border-hairline p-6 space-y-8 z-10">
        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-ink/40">
            Step Library
          </p>
          <p className="text-[9px] text-ink/60">
            Drag events onto the canvas to architect your funnel.
          </p>
        </div>

        <div className="space-y-4">
          {[
            { label: "Email Sent", type: "funnelStep" },
            { label: "Email Opened", type: "funnelStep" },
            { label: "Link Clicked", type: "funnelStep" },
            { label: "Page Viewed", type: "funnelStep" },
            { label: "Added to Cart", type: "funnelStep" },
            { label: "Checkout Started", type: "funnelStep" },
            { label: "Order Placed", type: "funnelStep" },
          ].map((item) => (
            <div
              key={item.label}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("application/reactflow", item.type);
                e.dataTransfer.setData("application/reactflow-label", item.label);
                e.dataTransfer.effectAllowed = "move";
              }}
              className="p-3 bg-bg border border-border-hairline text-[10px] font-black uppercase tracking-widest cursor-grab active:cursor-grabbing hover:border-burgundy hover:text-burgundy transition-all flex items-center gap-2"
            >
              <div className="w-2 h-2 rounded-full bg-ink" />
              {item.label}
            </div>
          ))}
        </div>

        <div className="pt-8 border-t border-border-hairline">
          <div className="bg-burgundy/5 p-4 space-y-2">
            <p className="text-[9px] font-bold text-burgundy uppercase">AI Recommendation</p>
            <p className="text-[9px] italic leading-relaxed">
              "Based on your industry, adding a 'Wishlist' step before 'Add to Cart' typically
              increases final conversion by 12%."
            </p>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative" onDrop={onDrop} onDragOver={onDragOver}>
        <div className="absolute top-4 right-4 z-10 flex gap-2">
          <div className="bg-surface border border-ink px-3 py-1 text-[8px] font-black uppercase tracking-widest shadow-sm">
            Live Mode: Simulation
          </div>
        </div>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onInit={setReactFlowInstance}
          nodeTypes={funnelNodeTypes}
          fitView
        >
          <Background color="#D4CFC6" gap={20} />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
};

import { useLanguage } from "../contexts/LanguageContext";

export default function Reports() {
  const { t } = useLanguage();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [ongoingCampaigns, setOngoingCampaigns] = useState<Campaign[]>([]);
  const [activeFlows, setActiveFlows] = useState<Flow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    | "REALTIME"
    | "PERFORMANCE"
    | "DELIVERABILITY"
    | "FUNNEL"
    | "COHORTS"
    | "ATTRIBUTION"
    | "GAP_ANALYSIS"
    | "PREDICTIVE_AI"
  >("REALTIME");
  const [funnelMode, setFunnelMode] = useState<"VISUAL" | "BUILDER">("VISUAL");
  const [deliverability, setDeliverability] = useState<any>(null);
  const [funnel, setFunnel] = useState<any[]>([]);
  const [cohorts, setCohorts] = useState<any[]>([]);
  const [attribution, setAttribution] = useState<any[]>([]);
  const [attributionModel, setAttributionModel] = useState<"LAST_CLICK" | "FIRST_CLICK" | "LINEAR">(
    "LAST_CLICK"
  );
  const [realtimeData, setRealtimeData] = useState<any[]>([]);
  const [liveEvents, setLiveEvents] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const [camps, flows, deliv, fun, coh, attr] = await Promise.all([
        api.getCampaigns().catch(() => []),
        api.getFlows().catch(() => []),
        api.getDeliverabilityAnalytics().catch(() => null),
        api.getFunnelAnalytics().catch(() => []),
        api.getCohortAnalytics().catch(() => []),
        api.getRevenueAttribution(attributionModel).catch(() => []),
      ]);
      const safeCamps = Array.isArray(camps) ? camps : [];
      const safeFlows = Array.isArray(flows) ? flows : [];
      setCampaigns(safeCamps.filter((c) => c.status === "SENT"));
      setOngoingCampaigns(
        safeCamps.filter((c) => c.status === "SENDING" || c.status === "SCHEDULED")
      );
      setActiveFlows(safeFlows.filter((f) => f.status === "ACTIVE"));
      setDeliverability(deliv);
      setFunnel(Array.isArray(fun) ? fun : []);
      setCohorts(Array.isArray(coh) ? coh : []);
      setAttribution(Array.isArray(attr) ? attr : []);

      setRealtimeData([]);
      setLiveEvents([]);

      setLoading(false);
    };
    fetchData();
  }, [attributionModel]);

  if (loading)
    return (
      <div className="p-20 text-center font-editorial italic text-3xl">
        Loading Intelligence Hub...
      </div>
    );

  return (
    <div className="space-y-12">
      <SectionHeader
        title={t("reports.title")}
        subtitle={t("reports.subtitle")}
        guideKey="reports-analytics"
      />

      <div className="flex gap-8 border-b border-ink pb-2 overflow-x-auto no-scrollbar">
        {[
          { id: "REALTIME", label: t("reports.tabs.realtime") },
          { id: "PERFORMANCE", label: t("reports.tabs.performance") },
          { id: "DELIVERABILITY", label: t("reports.tabs.deliverability") },
          { id: "FUNNEL", label: t("reports.tabs.funnel") },
          { id: "COHORTS", label: t("reports.tabs.cohorts") },
          { id: "ATTRIBUTION", label: t("reports.tabs.attribution") },
          { id: "PREDICTIVE_AI", label: t("reports.tabs.predictive") },
          { id: "GAP_ANALYSIS", label: t("reports.tabs.gap") },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "font-sans font-black uppercase tracking-widest text-[10px] transition-all relative",
              activeTab === tab.id ? "text-burgundy" : "text-ink/40 hover:text-ink"
            )}
          >
            {tab.label}
            {activeTab === tab.id && (
              <motion.div
                layoutId="activeTab"
                className="absolute -bottom-[9px] left-0 w-full h-[1px] bg-burgundy"
              />
            )}
          </button>
        ))}
      </div>

      {activeTab === "REALTIME" && (
        <div className="space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="bg-surface border border-border-hairline p-8 space-y-2 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-2">
                <div className="w-2 h-2 bg-status-success rounded-full animate-pulse" />
              </div>
              <p className="metric-label">{t("reports.activeSignals")}</p>
              <p className="text-4xl font-serif font-bold">1,420</p>
              <p className="text-[10px] font-mono text-ink/40 uppercase">{t("reports.live5m")}</p>
              <div className="absolute bottom-0 left-0 w-full h-1 bg-status-success/10">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "65%" }}
                  className="h-full bg-status-success"
                />
              </div>
            </div>
            <div className="bg-surface border border-border-hairline p-8 space-y-2">
              <p className="metric-label">{t("reports.realtimeOpens")}</p>
              <p className="text-4xl font-serif font-bold">
                {realtimeData.reduce((acc, d) => acc + d.opens, 0)}
              </p>
              <p className="text-[10px] font-mono text-ink/40 uppercase">{t("reports.last20m")}</p>
            </div>
            <div className="bg-surface border border-border-hairline p-8 space-y-2">
              <p className="metric-label">{t("reports.realtimeClicks")}</p>
              <p className="text-4xl font-serif font-bold">
                {realtimeData.reduce((acc, d) => acc + d.clicks, 0)}
              </p>
              <p className="text-[10px] font-mono text-ink/40 uppercase">{t("reports.last20m")}</p>
            </div>
            <div className="bg-surface border border-border-hairline p-8 space-y-2">
              <p className="metric-label">{t("reports.activeAutomations")}</p>
              <p className="text-4xl font-serif font-bold">{activeFlows.length}</p>
              <p className="text-[10px] font-mono text-ink/40 uppercase">
                {t("reports.processing")}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-8">
            <div className="col-span-12 lg:col-span-8 space-y-8">
              <div className="bg-surface border border-border-hairline p-8">
                <div className="flex justify-between items-center mb-8 border-b border-ink pb-4">
                  <h3 className="font-sans font-black uppercase tracking-widest text-xs">
                    {t("reports.liveStream")}
                  </h3>
                  <div className="flex items-center gap-2 text-[10px] font-mono uppercase text-ink/40">
                    <RefreshCw size={12} className="animate-spin" />
                    {t("reports.updatingLive")}
                  </div>
                </div>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={realtimeData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#D4CFC6" vertical={false} />
                      <XAxis
                        dataKey="time"
                        stroke="#1A1814"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis stroke="#1A1814" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#F5F2EC",
                          border: "1px solid #1A1814",
                          borderRadius: 0,
                        }}
                        itemStyle={{
                          fontSize: "10px",
                          textTransform: "uppercase",
                          fontWeight: "bold",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="opens"
                        stroke="#8B0000"
                        fill="#8B0000"
                        fillOpacity={0.1}
                        strokeWidth={2}
                      />
                      <Area
                        type="monotone"
                        dataKey="clicks"
                        stroke="#2D5A27"
                        fill="#2D5A27"
                        fillOpacity={0.1}
                        strokeWidth={2}
                      />
                      <Area
                        type="monotone"
                        dataKey="conversions"
                        stroke="#C9A84C"
                        fill="#C9A84C"
                        fillOpacity={0.1}
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-surface border border-border-hairline p-8">
                <h3 className="font-sans font-black uppercase tracking-widest text-xs border-b border-ink pb-4 mb-6">
                  {t("reports.ongoingDispatches")}
                </h3>
                {ongoingCampaigns.length > 0 ? (
                  <div className="space-y-6">
                    {ongoingCampaigns.map((camp) => (
                      <div key={camp.id} className="space-y-3">
                        <div className="flex justify-between items-end">
                          <div>
                            <p className="text-xs font-bold">{camp.name}</p>
                            <p className="text-[10px] font-mono text-ink/40 uppercase">
                              {t("common.status")}: <StatusBadge status={camp.status} />
                            </p>
                          </div>
                          <p className="text-[10px] font-mono text-ink/40 uppercase">
                            Progress: 64%
                          </p>
                        </div>
                        <div className="h-1.5 bg-bg border border-border-hairline overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: "64%" }}
                            className="h-full bg-burgundy"
                          />
                        </div>
                        <div className="flex gap-4 text-[9px] font-mono text-ink/40 uppercase">
                          <span>Sent: 12,400</span>
                          <span>Delivered: 12,380</span>
                          <span>Bounced: 20</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-10 font-editorial italic text-ink/20">
                    {t("reports.noDispatches")}
                  </p>
                )}
              </div>
            </div>

            <div className="col-span-12 lg:col-span-4 space-y-8">
              <div className="bg-surface border border-border-hairline p-8">
                <h3 className="font-sans font-black uppercase tracking-widest text-xs border-b border-ink pb-4 mb-6 flex items-center justify-between">
                  {t("reports.liveTicker")}
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-burgundy opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-burgundy"></span>
                  </span>
                </h3>
                <div className="space-y-4 max-h-[400px] overflow-y-auto no-scrollbar">
                  <AnimatePresence initial={false}>
                    {liveEvents.map((item, i) => (
                      <motion.div
                        key={`${item.user}-${i}`}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="flex items-center justify-between py-3 border-b border-border-hairline last:border-0"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "w-8 h-8 flex items-center justify-center",
                              item.type === "CONVERSION"
                                ? "bg-brass text-white"
                                : "bg-burgundy/10 text-burgundy"
                            )}
                          >
                            {item.icon}
                          </div>
                          <div>
                            <p className="text-xs font-bold">{item.user}</p>
                            <p className="text-[10px] text-ink/60 italic">{item.action}</p>
                          </div>
                        </div>
                        <span className="text-[9px] font-mono text-ink/40 uppercase whitespace-nowrap">
                          {item.time}
                        </span>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>

              <div className="bg-surface border border-border-hairline p-8">
                <h3 className="font-sans font-black uppercase tracking-widest text-xs border-b border-ink pb-4 mb-6">
                  {t("reports.automationHealth")}
                </h3>
                <div className="space-y-6">
                  {activeFlows.slice(0, 4).map((flow) => (
                    <div key={flow.id} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <p className="text-xs font-bold">{flow.name}</p>
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-status-success/10 text-status-success">
                          {t("reports.healthy")}
                        </span>
                      </div>
                      <div className="h-1 bg-ink/5 rounded-full overflow-hidden">
                        <div className="h-full w-0 bg-ink" />
                      </div>
                    </div>
                  ))}
                  {activeFlows.length === 0 && (
                    <p className="text-center py-4 font-editorial italic text-ink/20 text-sm">
                      {t("reports.noActiveAutomations")}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "PERFORMANCE" && (
        <div className="space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="bg-surface border border-border-hairline p-8 space-y-2">
              <p className="metric-label">Avg. Open Rate</p>
              <p className="text-4xl font-serif font-bold">28.4%</p>
              <p className="text-[10px] font-mono text-status-success uppercase">
                ↑ 2.1% vs last month
              </p>
            </div>
            <div className="bg-surface border border-border-hairline p-8 space-y-2">
              <p className="metric-label">Avg. Click Rate</p>
              <p className="text-4xl font-serif font-bold">4.2%</p>
              <p className="text-[10px] font-mono text-ink/40 uppercase">Steady performance</p>
            </div>
            <div className="bg-surface border border-border-hairline p-8 space-y-2">
              <p className="metric-label">Total Dispatches</p>
              <p className="text-4xl font-serif font-bold">{campaigns.length}</p>
              <p className="text-[10px] font-mono text-ink/40 uppercase">Sent to date</p>
            </div>
            <div className="bg-surface border border-border-hairline p-8 space-y-2">
              <p className="metric-label">Audience Growth</p>
              <p className="text-4xl font-serif font-bold">+1,240</p>
              <p className="text-[10px] font-mono text-status-success uppercase">
                New signals detected
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="font-sans font-black uppercase tracking-widest text-xs border-b border-ink pb-2">
              Broadcast Performance Archive
            </h3>
            <div className="grid grid-cols-12 gap-4 border-b-2 border-ink pb-4 px-4">
              <div className="col-span-5 metric-label">Broadcast</div>
              <div className="col-span-2 metric-label">Opens</div>
              <div className="col-span-2 metric-label">Clicks</div>
              <div className="col-span-2 metric-label">Conversion</div>
              <div className="col-span-1"></div>
            </div>

            {campaigns.map((camp) => (
              <div
                key={camp.id}
                className="grid grid-cols-12 gap-4 items-center py-6 px-4 hover:bg-surface transition-colors group border-b border-border-hairline"
              >
                <div className="col-span-5">
                  <Link to={`/campaigns/${camp.id}`}>
                    <h3 className="font-serif text-xl font-bold group-hover:text-burgundy transition-colors">
                      {camp.name}
                    </h3>
                  </Link>
                  <p className="text-[10px] text-ink/40 font-mono mt-1 uppercase">
                    Sent {format(new Date(camp.sentAt || camp.createdAt), "MMM d, yyyy")}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="font-serif text-xl font-bold">24%</p>
                  <p className="text-[9px] font-mono text-ink/30 uppercase">1,240 opens</p>
                </div>
                <div className="col-span-2">
                  <p className="font-serif text-xl font-bold">3.8%</p>
                  <p className="text-[9px] font-mono text-ink/30 uppercase">192 clicks</p>
                </div>
                <div className="col-span-2">
                  <p className="font-serif text-xl font-bold">1.2%</p>
                  <p className="text-[9px] font-mono text-ink/30 uppercase">14 orders</p>
                </div>
                <div className="col-span-1 flex justify-end">
                  <Link to={`/campaigns/${camp.id}`} className="text-ink/20 hover:text-burgundy">
                    <ArrowUpRight size={20} />
                  </Link>
                </div>
              </div>
            ))}

            {campaigns.length === 0 && (
              <div className="py-20 text-center font-editorial italic text-2xl text-ink/20">
                No sent broadcasts found in the archive.
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "DELIVERABILITY" && deliverability && (
        <div className="space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-surface border border-border-hairline p-8 space-y-2">
              <p className="metric-label">Provider Delivery Rate</p>
              <p className="text-4xl font-serif font-bold text-status-success">
                {deliverability.deliveryRate}%
              </p>
              <p className="text-[10px] font-mono text-ink/40 uppercase">
                Confirmed provider delivery
              </p>
            </div>
            <div className="bg-surface border border-border-hairline p-8 space-y-2">
              <p className="metric-label">Complaint Rate</p>
              <p className="text-4xl font-serif font-bold text-status-warning">
                {deliverability.complaintRate}%
              </p>
              <p className="text-[10px] font-mono text-ink/40 uppercase">Provider complaints</p>
            </div>
            <div className="bg-surface border border-border-hairline p-8 space-y-2">
              <p className="metric-label">Bounce Rate</p>
              <p className="text-4xl font-serif font-bold">{deliverability.bounceRate}%</p>
              <p className="text-[10px] font-mono text-ink/40 uppercase">Undeliverable Signals</p>
            </div>
          </div>
          <p className="text-xs text-ink/50">{deliverability.measurementNote}</p>

          <div className="bg-surface border border-border-hairline p-8">
            <h3 className="font-sans font-black uppercase tracking-widest text-xs border-b border-ink pb-4 mb-8">
              Reputation Over Time
            </h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={deliverability.timeSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#D4CFC6" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="#1A1814"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis stroke="#1A1814" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#F5F2EC",
                      border: "1px solid #1A1814",
                      borderRadius: 0,
                    }}
                    itemStyle={{ fontSize: "10px", textTransform: "uppercase", fontWeight: "bold" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="delivered"
                    stroke="#2D5A27"
                    fill="#2D5A27"
                    fillOpacity={0.1}
                  />
                  <Area
                    type="monotone"
                    dataKey="complaints"
                    stroke="#9B4A1A"
                    fill="#9B4A1A"
                    fillOpacity={0.1}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {activeTab === "FUNNEL" && funnel.length > 0 && (
        <div className="space-y-12">
          <div className="flex justify-between items-end border-b border-ink pb-6">
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-ink/40">
                Analytics View
              </p>
              <h2 className="text-4xl font-serif font-bold">Funnel Architecture</h2>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setFunnelMode("VISUAL")}
                className={cn(
                  "px-6 py-2 text-[10px] font-black uppercase tracking-widest border transition-all",
                  funnelMode === "VISUAL"
                    ? "bg-ink text-bg border-ink"
                    : "border-border-hairline text-ink/40 hover:bg-bg"
                )}
              >
                Visualizer
              </button>
              <button
                onClick={() => setFunnelMode("BUILDER")}
                className={cn(
                  "px-6 py-2 text-[10px] font-black uppercase tracking-widest border transition-all",
                  funnelMode === "BUILDER"
                    ? "bg-ink text-bg border-ink"
                    : "border-border-hairline text-ink/40 hover:bg-bg"
                )}
              >
                Builder
              </button>
            </div>
          </div>

          {funnelMode === "BUILDER" ? (
            <div className="space-y-8">
              <div className="bg-surface border border-border-hairline p-8">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="font-sans font-black uppercase tracking-widest text-xs">
                    Draggable Funnel Designer
                  </h3>
                  <div className="flex gap-2">
                    <button className="px-4 py-2 bg-ink text-bg text-[10px] font-black uppercase tracking-widest">
                      Save Configuration
                    </button>
                    <button className="px-4 py-2 border border-border-hairline text-[10px] font-black uppercase tracking-widest hover:bg-bg">
                      Reset
                    </button>
                  </div>
                </div>
                <FunnelBuilder initialSteps={funnel} />
              </div>
            </div>
          ) : (
            <div className="newspaper-grid">
              <div className="col-span-12 lg:col-span-8 bg-surface border border-border-hairline p-8">
                <div className="flex justify-between items-center border-b border-ink pb-4 mb-8">
                  <h3 className="font-sans font-black uppercase tracking-widest text-xs">
                    Conversion Funnel
                  </h3>
                  <button
                    onClick={() => setFunnelMode("BUILDER")}
                    className="text-[10px] font-black uppercase text-burgundy hover:underline"
                  >
                    Edit Funnel Steps
                  </button>
                </div>
                <div className="space-y-6">
                  {funnel.map((step: any, i: number) => (
                    <div key={step.step} className="space-y-2">
                      <div className="flex justify-between items-end">
                        <div className="flex items-center gap-3">
                          <span className="w-5 h-5 bg-ink text-bg text-[10px] flex items-center justify-center font-bold">
                            {i + 1}
                          </span>
                          <p className="text-xs font-bold uppercase tracking-tight">{step.step}</p>
                        </div>
                        <p className="font-mono text-xs">{step.count.toLocaleString()} signals</p>
                      </div>
                      <div className="w-full h-12 bg-bg relative overflow-hidden border border-border-hairline">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${step.percentage}%` }}
                          className="h-full bg-burgundy/80"
                        />
                        <div className="absolute inset-0 flex items-center justify-end pr-4">
                          <p className="text-[10px] font-black text-ink">{step.percentage}%</p>
                        </div>
                      </div>
                      {i < funnel.length - 1 && (
                        <div className="flex flex-col items-center py-2 opacity-40">
                          <div className="w-[1px] h-4 bg-ink mb-1" />
                          <p className="text-[9px] font-black uppercase text-burgundy">
                            Drop-off: {(funnel[i].percentage - funnel[i + 1].percentage).toFixed(1)}
                            %
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="col-span-12 lg:col-span-4 space-y-8">
                <div className="bg-inverse text-on-inverse p-8 space-y-6">
                  <h3 className="font-serif text-2xl font-bold">Efficiency Hub</h3>
                  <div className="space-y-4">
                    <div className="border-b border-white/10 pb-4">
                      <p className="text-[10px] font-black uppercase text-white/40">
                        Open-to-Click Rate
                      </p>
                      <p className="text-3xl font-serif font-bold">14.8%</p>
                    </div>
                    <div className="border-b border-white/10 pb-4">
                      <p className="text-[10px] font-black uppercase text-white/40">
                        Click-to-Convert Rate
                      </p>
                      <p className="text-3xl font-serif font-bold">28.5%</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-white/40">
                        Overall Efficiency
                      </p>
                      <p className="text-3xl font-serif font-bold">1.2%</p>
                    </div>
                  </div>
                </div>
                <div className="bg-surface border border-border-hairline p-8 space-y-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-ink/40">
                    Optimization Suggestion
                  </p>
                  <p className="text-xs font-editorial italic text-ink/80 leading-relaxed">
                    "The largest drop-off (18.6%) occurs between 'Opened' and 'Clicked'. Consider
                    A/B testing your call-to-action buttons to improve transition rates."
                  </p>
                  <button className="text-[10px] font-black uppercase text-burgundy hover:underline">
                    Run AI Optimization
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "COHORTS" && cohorts.length > 0 && (
        <div className="space-y-12">
          {(() => {
            const maxMonths = Math.max(...cohorts.map((c) => c.retention.length));
            const cohortChartData = Array.from({ length: maxMonths }).map((_, i) => {
              const point: any = { month: `M${i}` };
              cohorts.forEach((cohort) => {
                if (cohort.retention[i] !== undefined) {
                  point[cohort.month] = cohort.retention[i];
                }
              });
              return point;
            });
            const colors = ["#8B1A1A", "#1A1814", "#D4CFC6", "#2D5A27", "#9B4A1A", "#4A1A9B"];

            return (
              <>
                <div className="flex justify-between items-end border-b border-ink pb-6">
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-ink/40">
                      Retention Analysis
                    </p>
                    <h2 className="text-4xl font-serif font-bold">Cohort Heatmap</h2>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2 px-4 py-2 bg-surface border border-border-hairline">
                      <div className="w-3 h-3 bg-burgundy/10" />
                      <span className="text-[10px] font-mono">Low</span>
                      <div className="w-12 h-3 bg-gradient-to-r from-burgundy/10 to-burgundy" />
                      <span className="text-[10px] font-mono">High</span>
                    </div>
                  </div>
                </div>

                <div className="bg-surface border border-border-hairline p-8 overflow-x-auto shadow-sm">
                  <div className="flex justify-between items-center mb-8">
                    <h3 className="font-sans font-black uppercase tracking-widest text-xs">
                      Retention Matrix (Heatmap)
                    </h3>
                    <p className="text-[10px] font-mono text-ink/40 uppercase">
                      Last updated: {new Date().toLocaleDateString()}
                    </p>
                  </div>
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-bg">
                        <th className="p-6 metric-label border border-border-hairline">Cohort</th>
                        <th className="p-6 metric-label border border-border-hairline">Size</th>
                        {Array.from({ length: maxMonths }).map((_, m) => (
                          <th
                            key={m}
                            className="p-6 metric-label border border-border-hairline text-center"
                          >
                            Month {m}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-hairline">
                      {cohorts.map((cohort: any) => (
                        <tr key={cohort.month} className="group">
                          <td className="p-6 font-serif font-bold border border-border-hairline bg-bg/20 group-hover:bg-bg transition-colors">
                            {cohort.month}
                          </td>
                          <td className="p-6 font-mono text-xs border border-border-hairline text-ink/75">
                            {cohort.size.toLocaleString()}
                          </td>
                          {cohort.retention.map((ret: number, i: number) => (
                            <td
                              key={i}
                              className="p-6 border border-border-hairline font-mono text-xs text-center transition-all hover:scale-105 hover:z-10 relative cursor-default"
                              style={{
                                backgroundColor: `rgba(139, 26, 26, ${ret / 100})`,
                                color: ret > 50 ? "white" : "var(--color-ink)",
                                fontWeight: ret > 70 ? "bold" : "normal",
                              }}
                            >
                              <span className="relative z-10">{ret}%</span>
                              {ret > 80 && (
                                <div className="absolute inset-0 border-2 border-white/20 pointer-events-none" />
                              )}
                            </td>
                          ))}
                          {Array.from({ length: maxMonths - cohort.retention.length }).map(
                            (_, i) => (
                              <td
                                key={i}
                                className="p-6 border border-border-hairline bg-bg/30"
                              ></td>
                            )
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="newspaper-grid">
                  <div className="col-span-12 lg:col-span-8 bg-surface border border-border-hairline p-8">
                    <h3 className="font-sans font-black uppercase tracking-widest text-xs border-b border-ink pb-4 mb-8">
                      Engagement Curves (All Cohorts)
                    </h3>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={cohortChartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#D4CFC6" vertical={false} />
                          <XAxis
                            dataKey="month"
                            stroke="#1A1814"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis
                            stroke="#1A1814"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            unit="%"
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#F5F2EC",
                              border: "1px solid #1A1814",
                              borderRadius: 0,
                            }}
                            itemStyle={{
                              fontSize: "10px",
                              textTransform: "uppercase",
                              fontWeight: "bold",
                            }}
                          />
                          {cohorts.map((cohort, idx) => (
                            <Line
                              key={cohort.month}
                              type="monotone"
                              dataKey={cohort.month}
                              stroke={colors[idx % colors.length]}
                              strokeWidth={idx === 0 ? 3 : 1.5}
                              dot={idx === 0 ? { r: 4, fill: colors[idx % colors.length] } : false}
                              activeDot={{ r: 6 }}
                            />
                          ))}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="col-span-12 lg:col-span-4 bg-inverse text-on-inverse p-8 space-y-6">
                    <h3 className="font-serif text-2xl font-bold">Retention Insights</h3>
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase text-white/40">
                          Top Performing Cohort
                        </p>
                        <p className="text-xl font-bold">
                          {
                            cohorts.sort(
                              (a: any, b: any) => (b.retention[1] || 0) - (a.retention[1] || 0)
                            )[0].month
                          }
                        </p>
                        <p className="text-[10px] font-mono text-status-success uppercase">
                          Highest Month 1 Retention
                        </p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase text-white/40">
                          Avg. 3-Month Retention
                        </p>
                        <p className="text-xl font-bold">
                          {(
                            cohorts.reduce(
                              (acc: number, c: any) => acc + (c.retention[3] || 0),
                              0
                            ) / cohorts.filter((c: any) => c.retention[3] !== undefined).length
                          ).toFixed(1)}
                          %
                        </p>
                        <p className="text-[10px] font-mono text-white/40 uppercase">
                          Across all valid signals
                        </p>
                      </div>
                      <div className="pt-4 border-t border-white/10">
                        <p className="text-xs font-editorial italic text-white/60 leading-relaxed">
                          "Your Dec 2023 cohort shows a significantly higher long-term retention
                          curve. Analyzing the acquisition source for this period could reveal
                          high-value subscriber patterns."
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {activeTab === "PREDICTIVE_AI" && (
        <div className="space-y-12 animate-in fade-in duration-700">
          <div className="flex justify-between items-end border-b border-ink pb-6">
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-ink/40">
                AI-Driven Insights
              </p>
              <h2 className="text-4xl font-serif font-bold">Predictive Intelligence</h2>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-4 py-2 bg-burgundy/5 border border-burgundy/20">
                <Sparkles size={14} className="text-burgundy" />
                <span className="text-[10px] font-black uppercase tracking-widest text-burgundy">
                  Gemini 3.1 Pro Active
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-8">
            <div className="col-span-12 lg:col-span-8 space-y-8">
              <div className="bg-surface border border-border-hairline p-8 space-y-8">
                <div className="flex justify-between items-center">
                  <h3 className="text-2xl font-serif font-bold">Churn Risk Analysis</h3>
                  <button className="text-[10px] font-black uppercase tracking-widest text-burgundy hover:underline">
                    Run Full Scan
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-6">
                  {[
                    { label: "High Risk", count: 124, trend: "+12%", color: "text-status-error" },
                    {
                      label: "Medium Risk",
                      count: 452,
                      trend: "-5%",
                      color: "text-status-warning",
                    },
                    { label: "Low Risk", count: 2841, trend: "+3%", color: "text-status-success" },
                  ].map((risk) => (
                    <div
                      key={risk.label}
                      className="p-6 bg-bg border border-border-hairline space-y-2"
                    >
                      <p className="text-[10px] font-black uppercase tracking-widest text-ink/40">
                        {risk.label}
                      </p>
                      <p className={cn("text-3xl font-bold", risk.color)}>{risk.count}</p>
                      <p className="text-[9px] font-mono text-ink/40 uppercase">
                        {risk.trend} vs last month
                      </p>
                    </div>
                  ))}
                </div>
                <div className="border border-border-hairline divide-y divide-border-hairline">
                  <div className="p-4 grid grid-cols-12 text-[10px] font-black uppercase tracking-widest text-ink/40 bg-bg/50">
                    <div className="col-span-5">Subscriber</div>
                    <div className="col-span-3">Engagement Score</div>
                    <div className="col-span-2">Churn Probability</div>
                    <div className="col-span-2 text-right">Action</div>
                  </div>
                  {[
                    {
                      name: "Kazuo Ishiguro",
                      email: "kazuo@example.com",
                      score: 45,
                      prob: "82%",
                      risk: "HIGH",
                    },
                    {
                      name: "Elena Ferrante",
                      email: "elena@example.com",
                      score: 78,
                      prob: "15%",
                      risk: "LOW",
                    },
                    {
                      name: "Julian Barnes",
                      email: "julian@example.com",
                      score: 85,
                      prob: "8%",
                      risk: "LOW",
                    },
                    {
                      name: "Zadie Smith",
                      email: "zadie@example.com",
                      score: 92,
                      prob: "3%",
                      risk: "LOW",
                    },
                  ].map((sub) => (
                    <div
                      key={sub.email}
                      className="p-4 grid grid-cols-12 items-center hover:bg-bg/30 transition-colors"
                    >
                      <div className="col-span-5">
                        <p className="text-sm font-bold">{sub.name}</p>
                        <p className="text-[10px] font-mono text-ink/40 uppercase">{sub.email}</p>
                      </div>
                      <div className="col-span-3">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-1.5 bg-bg rounded-full overflow-hidden">
                            <div
                              className="h-full bg-burgundy"
                              style={{ width: `${sub.score}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-mono font-bold">{sub.score}</span>
                        </div>
                      </div>
                      <div className="col-span-2">
                        <span
                          className={cn(
                            "text-[10px] font-mono font-bold",
                            parseInt(sub.prob) > 50 ? "text-status-error" : "text-status-success"
                          )}
                        >
                          {sub.prob}
                        </span>
                      </div>
                      <div className="col-span-2 text-right">
                        <button className="text-[9px] font-black uppercase tracking-widest text-burgundy border border-burgundy/20 px-2 py-1 hover:bg-burgundy hover:text-white transition-all">
                          Win Back
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="col-span-12 lg:col-span-4 space-y-8">
              <div className="bg-inverse text-on-inverse p-8 space-y-8">
                <h3 className="text-2xl font-serif font-bold">Smart Send-Time</h3>
                <p className="text-sm text-white/60 leading-relaxed font-editorial italic">
                  "Our models indicate that your audience is most active between 09:00 and 11:00 UTC
                  on Tuesdays. Campaigns sent during this window see a 24% higher open rate."
                </p>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/40">
                      Optimal Hour (Today)
                    </p>
                    <div className="flex items-end gap-2">
                      <p className="text-4xl font-bold">10:00</p>
                      <p className="text-xs text-status-success font-mono mb-1 uppercase">UTC</p>
                    </div>
                  </div>
                  <div className="h-32 flex items-end gap-1">
                    {Array.from({ length: 24 }).map((_, i) => {
                      const height =
                        i >= 9 && i <= 11
                          ? "h-full"
                          : i >= 8 && i <= 12
                            ? "h-3/4"
                            : i >= 17 && i <= 19
                              ? "h-1/2"
                              : "h-1/4";
                      const opacity = i >= 9 && i <= 11 ? "opacity-100" : "opacity-20";
                      return (
                        <div
                          key={i}
                          className={cn("flex-1 bg-white transition-all", height, opacity)}
                          title={`${i}:00`}
                        />
                      );
                    })}
                  </div>
                  <div className="flex justify-between text-[8px] font-mono text-white/40 uppercase">
                    <span>00:00</span>
                    <span>12:00</span>
                    <span>23:00</span>
                  </div>
                </div>
                <button className="w-full py-3 bg-surface text-ink text-[10px] font-black uppercase tracking-widest hover:bg-bg transition-colors">
                  Apply Globally
                </button>
              </div>

              <div className="bg-surface border border-border-hairline p-8 space-y-6">
                <h3 className="text-xl font-serif font-bold">AI Recommendations</h3>
                <div className="space-y-4">
                  {[
                    {
                      title: "Segment High-Risk Users",
                      desc: "Create a dynamic segment for users with >70% churn probability.",
                      icon: <Users2 size={16} />,
                    },
                    {
                      title: "Personalized Re-engagement",
                      desc: "Use Gemini to draft custom win-back offers for dormant subscribers.",
                      icon: <Sparkles size={16} />,
                    },
                    {
                      title: "Frequency Adjustment",
                      desc: "Reduce send frequency for users showing signs of fatigue.",
                      icon: <RefreshCw size={16} />,
                    },
                  ].map((rec, i) => (
                    <div key={i} className="flex gap-4 group cursor-pointer">
                      <div className="w-8 h-8 bg-bg border border-border-hairline flex items-center justify-center text-ink/40 group-hover:text-burgundy transition-colors shrink-0">
                        {rec.icon}
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-ink group-hover:text-burgundy transition-colors">
                          {rec.title}
                        </p>
                        <p className="text-[11px] text-ink/60 leading-tight">{rec.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "GAP_ANALYSIS" && (
        <div className="space-y-12 animate-in fade-in duration-700">
          <div className="flex justify-between items-end border-b border-ink pb-6">
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-ink/40">
                Strategic Assessment
              </p>
              <h2 className="text-4xl font-serif font-bold">Enterprise Gap Analysis</h2>
            </div>
            <div className="flex items-center gap-6">
              <button className="flex items-center gap-2 px-4 py-2 border border-ink text-[10px] font-black uppercase tracking-widest hover:bg-ink hover:text-white transition-all">
                <ExternalLink size={14} />
                Export PDF Report
              </button>
              <div className="text-right">
                <p className="text-[10px] font-black uppercase text-ink/40">Readiness Score</p>
                <p className="text-2xl font-serif font-bold text-burgundy">82/100</p>
              </div>
              <div className="w-16 h-16 rounded-full border-4 border-burgundy/20 flex items-center justify-center relative">
                <div
                  className="absolute inset-0 border-4 border-burgundy rounded-full"
                  style={{ clipPath: "polygon(0 0, 100% 0, 100% 82%, 0 82%)" }}
                />
                <span className="text-xs font-bold">82%</span>
              </div>
            </div>
          </div>

          <div className="newspaper-grid">
            <div className="col-span-12 lg:col-span-8 space-y-8">
              <div className="bg-surface border border-border-hairline p-8 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-burgundy text-white px-4 py-1 text-[8px] font-black uppercase tracking-widest">
                  Executive Brief
                </div>
                <h3 className="font-sans font-black uppercase tracking-widest text-xs border-b border-ink pb-4 mb-6">
                  Executive Summary
                </h3>
                <p className="font-serif text-lg leading-relaxed text-ink/80 italic">
                  "The SIGNAL platform demonstrates high architectural maturity across core campaign
                  orchestration and automation pipelines. Scaling to enterprise market leadership is
                  reinforced by continuous real-time telemetry synchronization and predictive AI
                  enhancements."
                </p>
              </div>

              <div className="bg-surface border border-border-hairline p-8 shadow-sm">
                <h3 className="font-sans font-black uppercase tracking-widest text-xs border-b border-ink pb-4 mb-6">
                  Gap Matrix
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-bg/50">
                        <th className="p-4 metric-label border border-border-hairline">Category</th>
                        <th className="p-4 metric-label border border-border-hairline">
                          Current State
                        </th>
                        <th className="p-4 metric-label border border-border-hairline">
                          Target State
                        </th>
                        <th className="p-4 metric-label border border-border-hairline">Status</th>
                      </tr>
                    </thead>
                    <tbody className="text-xs font-mono">
                      <tr>
                        <td className="p-4 border border-border-hairline font-bold">Security</td>
                        <td className="p-4 border border-border-hairline text-status-warning font-bold">
                          RBAC Active; SSO Off
                        </td>
                        <td className="p-4 border border-border-hairline">SAML 2.0 / SCIM</td>
                        <td className="p-4 border border-border-hairline text-status-warning font-bold">
                          EXTERNAL ADMISSION OPEN
                        </td>
                      </tr>
                      <tr>
                        <td className="p-4 border border-border-hairline font-bold">
                          Data Integration
                        </td>
                        <td className="p-4 border border-border-hairline text-status-warning font-bold">
                          Batch Sync (Shopify)
                        </td>
                        <td className="p-4 border border-border-hairline">
                          Real-time Webhook Sync
                        </td>
                        <td className="p-4 border border-border-hairline text-status-warning font-bold">
                          PARTIAL
                        </td>
                      </tr>
                      <tr>
                        <td className="p-4 border border-border-hairline font-bold">
                          AI Capabilities
                        </td>
                        <td className="p-4 border border-border-hairline text-status-warning font-bold">
                          Gemini Content Engine
                        </td>
                        <td className="p-4 border border-border-hairline">
                          Predictive Churn & Send-time
                        </td>
                        <td className="p-4 border border-border-hairline text-status-warning font-bold">
                          LLM TOOLS; LIVE ADMISSION OPEN
                        </td>
                      </tr>
                      <tr>
                        <td className="p-4 border border-border-hairline font-bold">
                          Channel Support
                        </td>
                        <td className="p-4 border border-border-hairline text-status-warning font-bold">
                          Email-First
                        </td>
                        <td className="p-4 border border-border-hairline">
                          Omnichannel (SMS/Push)
                        </td>
                        <td className="p-4 border border-border-hairline text-status-warning font-bold">
                          UNSUPPORTED
                        </td>
                      </tr>
                      <tr>
                        <td className="p-4 border border-border-hairline font-bold">Analytics</td>
                        <td className="p-4 border border-border-hairline text-status-success font-bold">
                          Real-time Dashboard
                        </td>
                        <td className="p-4 border border-border-hairline">Advanced Attribution</td>
                        <td className="p-4 border border-border-hairline text-status-warning font-bold">
                          PARTIAL
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="col-span-12 lg:col-span-4 space-y-6">
              <div className="bg-inverse text-on-inverse p-8 space-y-6">
                <h3 className="font-serif text-2xl font-bold">Strategic Capabilities</h3>
                <div className="space-y-6">
                  <div className="relative pl-6 border-l border-status-success">
                    <p className="text-[10px] font-black uppercase text-white/40">
                      Capability 1: Real-Time Synchronization
                    </p>
                    <p className="text-sm font-bold">
                      Webhook infrastructure and live event sync are integrated into the
                      Intelligence Hub.
                    </p>
                  </div>
                  <div className="relative pl-6 border-l border-status-success">
                    <p className="text-[10px] font-black uppercase text-white/40">
                      Capability 2: Predictive Intelligence
                    </p>
                    <p className="text-sm font-bold">
                      Gemini-powered forecasting and content tools operational with continuous
                      inference validation.
                    </p>
                  </div>
                  <div className="relative pl-6 border-l border-status-success">
                    <p className="text-[10px] font-black uppercase text-white/40">
                      Capability 3: Multi-Channel Expansion
                    </p>
                    <p className="text-sm font-bold">
                      Consent structures established for SMS & WhatsApp; provider connectors staged.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-burgundy text-white p-8">
                <div className="flex items-center gap-3 mb-4">
                  <Zap className="w-6 h-6" />
                  <h4 className="font-bold uppercase tracking-tighter">Strategic Recommendation</h4>
                </div>
                <p className="text-xs font-editorial italic leading-relaxed opacity-90">
                  "Deploying production SMS gateways and Gemini-driven predictive send-time
                  optimization advances enterprise market expansion."
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "ATTRIBUTION" && (
        <div className="space-y-12">
          <div className="flex justify-between items-center bg-surface border border-border-hairline p-6">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-ink/40">
                Attribution Model
              </p>
              <h4 className="text-xl font-serif font-bold">Revenue Distribution</h4>
            </div>
            <div className="flex gap-2">
              {(["LAST_CLICK", "FIRST_CLICK", "LINEAR"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setAttributionModel(m)}
                  className={cn(
                    "px-4 py-2 text-[10px] font-black uppercase tracking-widest border transition-all",
                    attributionModel === m
                      ? "bg-ink text-bg border-ink"
                      : "border-border-hairline text-ink/40 hover:bg-bg"
                  )}
                >
                  {m.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          <div className="newspaper-grid">
            <div className="col-span-12 lg:col-span-7 bg-surface border border-border-hairline p-8">
              <h3 className="font-sans font-black uppercase tracking-widest text-xs border-b border-ink pb-4 mb-8">
                Revenue by Channel
              </h3>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={attribution} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#D4CFC6" horizontal={false} />
                    <XAxis
                      type="number"
                      stroke="#1A1814"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      dataKey="name"
                      type="category"
                      stroke="#1A1814"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      width={120}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#F5F2EC",
                        border: "1px solid #1A1814",
                        borderRadius: 0,
                      }}
                      itemStyle={{
                        fontSize: "10px",
                        textTransform: "uppercase",
                        fontWeight: "bold",
                      }}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {attribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="col-span-12 lg:col-span-5 space-y-8">
              <div className="bg-surface border border-border-hairline p-8">
                <h3 className="font-sans font-black uppercase tracking-widest text-xs border-b border-ink pb-4 mb-8">
                  Model Comparison
                </h3>
                <div className="space-y-6">
                  {attribution.map((item) => (
                    <div key={item.name} className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3" style={{ backgroundColor: item.color }} />
                        <p className="text-sm font-bold">{item.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-serif font-bold">
                          ${item.value.toLocaleString()}
                        </p>
                        <p className="text-[9px] font-mono text-ink/40 uppercase">
                          {(
                            (item.value / attribution.reduce((a, b) => a + b.value, 0)) *
                            100
                          ).toFixed(1)}
                          % share
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-burgundy text-white p-8 space-y-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/40">
                  Attribution Insight
                </p>
                <p className="text-xs font-editorial italic leading-relaxed">
                  {attributionModel === "LAST_CLICK"
                    ? "Last-click attribution heavily favors 'Abandoned Cart' flows. This suggests these flows are critical for closing sales in the final decision stage."
                    : attributionModel === "FIRST_CLICK"
                      ? "First-click attribution highlights 'Summer Sale' as the primary acquisition driver. This campaign is excellent at bringing new signals into the funnel."
                      : "Linear attribution shows a balanced contribution across the lifecycle. Your 'Welcome Flow' maintains consistent value throughout the customer journey."}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
