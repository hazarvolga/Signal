import React, { useState, useEffect, useRef } from "react";
import * as d3 from "d3";
import { Link } from "react-router";
import {
  ArrowUpRight,
  ArrowDownRight,
  BookOpen,
  MailOpen,
  MousePointer2,
  AlertCircle,
  Zap,
  Activity,
  CheckCircle2,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Area,
} from "recharts";
import { format } from "date-fns";
import { api } from "../services/api";
import { useAuth } from "../hooks/useAuth";
import { useCollaboration } from "../services/collaborationContext";
import { useLanguage } from "../contexts/LanguageContext";
import { HelpTooltip } from "../components/HelpTooltip";
import { DashboardStats, Campaign } from "../types";
import { cn } from "../lib/utils";

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
        <h1 className="text-2xl sm:text-3xl font-sans font-bold text-ink leading-tight tracking-tight">
          {title}
        </h1>
        {guideKey && <HelpTooltip guideKey={guideKey} />}
      </div>
      {subtitle && <p className="text-sm sm:text-base text-ink/60">{subtitle}</p>}
    </div>
    {action && <div className="flex shrink-0">{action}</div>}
  </div>
);

const MetricCard = ({
  label,
  value,
  delta,
  deltaType,
}: {
  label: string;
  value: string | number;
  delta?: string;
  deltaType?: "up" | "down";
}) => (
  <div className="bg-surface border border-border-hairline p-6 rounded-none space-y-3">
    <p className="text-[11px] font-black uppercase tracking-widest text-ink/50">{label}</p>
    <div className="flex items-baseline justify-between">
      <p className="text-3xl font-sans font-medium text-ink">{value}</p>
      {delta && (
        <span
          className={cn(
            "flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-sm",
            deltaType === "up" ? "bg-emerald-50 text-status-success" : "bg-red-50 text-burgundy"
          )}
        >
          {deltaType === "up" ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          {delta}
        </span>
      )}
    </div>
  </div>
);

const AudienceHealthChart = ({ stats }: { stats: DashboardStats }) => {
  const { t } = useLanguage();
  const svgRef = useRef<SVGSVGElement>(null);

  const hasData =
    Boolean(stats.growthData && stats.growthData.length > 0 && stats.totalSubscribers > 0) &&
    stats.growthData!.some((d) => d.subscribers > 0);

  useEffect(() => {
    if (!svgRef.current || !hasData || !stats.growthData) return;

    const data = stats.growthData.map((d) => ({
      date: new Date(d.date),
      subscribers: d.subscribers,
      churn: d.churn,
    }));

    const margin = { top: 20, right: 30, bottom: 30, left: 40 };
    const width = 800 - margin.left - margin.right;
    const height = 240 - margin.top - margin.bottom;

    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3
      .select(svgRef.current)
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3
      .scaleTime()
      .domain(d3.extent(data, (d) => d.date) as [Date, Date])
      .range([0, width]);

    const maxSub = d3.max(data, (d) => d.subscribers) || 10;
    const y = d3
      .scaleLinear()
      .domain([0, Math.ceil(maxSub * 1.15)])
      .range([height, 0]);

    svg
      .append("g")
      .attr("transform", `translate(0,${height})`)
      .call(
        d3
          .axisBottom(x)
          .ticks(6)
          .tickFormat(d3.timeFormat("%b") as any)
      )
      .attr("font-family", "Inter, sans-serif")
      .attr("font-size", "11px")
      .attr("color", "#9ca3af");

    svg
      .append("g")
      .call(d3.axisLeft(y).ticks(5))
      .attr("font-family", "Inter, sans-serif")
      .attr("font-size", "11px")
      .attr("color", "#9ca3af");

    const line = d3
      .line<any>()
      .x((d) => x(d.date))
      .y((d) => y(d.subscribers))
      .curve(d3.curveMonotoneX);

    svg
      .append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "#111827")
      .attr("stroke-width", 2)
      .attr("d", line);

    svg
      .selectAll(".dot")
      .data(data)
      .enter()
      .append("circle")
      .attr("class", "dot")
      .attr("cx", (d) => x(d.date))
      .attr("cy", (d) => y(d.subscribers))
      .attr("r", 4)
      .attr("fill", "#111827")
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 2);
  }, [hasData, stats.growthData]);

  if (!hasData) {
    return (
      <div className="bg-surface border border-border-hairline p-8 space-y-6">
        <div className="flex justify-between items-end border-b border-border-hairline pb-4">
          <div>
            <h3 className="text-lg font-sans font-semibold text-ink">
              {t("dashboard.growthVelocity")}
            </h3>
            <p className="text-[11px] font-medium text-ink/50 mt-1">
              {t("dashboard.audienceHealth")}
            </p>
          </div>
          <span className="text-[10px] font-mono font-medium text-ink/40 uppercase tracking-widest">
            Awaiting Data
          </span>
        </div>
        <div className="py-12 text-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-ink/5 flex items-center justify-center mx-auto text-ink/40">
            <Activity size={20} />
          </div>
          <h4 className="font-serif text-lg font-bold text-ink">
            Audience Telemetry Baseline Building
          </h4>
          <p className="text-xs text-ink/60 max-w-md mx-auto leading-relaxed">
            No historical audience activity recorded yet. As your contacts subscribe and interact
            with forms or broadcasts, live growth velocity and retention curves will automatically
            render here.
          </p>
          <div className="pt-2">
            <Link
              to="/forms"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-ink text-white text-[10px] font-black uppercase tracking-widest hover:bg-ink/80 transition-colors"
            >
              Create Opt-in Form →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const ltvFormatted =
    stats.totalSubscribers > 0 && stats.revenueAttributed
      ? `$${(stats.revenueAttributed / stats.totalSubscribers).toFixed(2)}`
      : "$0.00";

  return (
    <div className="bg-surface border border-border-hairline p-6 space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h3 className="text-lg font-sans font-semibold text-ink">
            {t("dashboard.growthVelocity")}
          </h3>
          <p className="text-[11px] font-medium text-ink/50 mt-1">
            {t("dashboard.audienceHealth")}
          </p>
        </div>
        <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-status-success">
          Live Telemetry
        </span>
        <div className="text-right">
          <p className="text-[11px] font-black uppercase tracking-widest text-ink/40">
            {t("dashboard.retentionRate")}
          </p>
          <p className="text-xl font-sans font-semibold mt-1 text-ink">
            {stats.retentionRate !== undefined ? `${stats.retentionRate}%` : "100%"}
          </p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <svg
          ref={svgRef}
          className="w-full h-auto"
          role="img"
          aria-label={t("dashboard.growthVelocity")}
        ></svg>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-border-hairline">
        <div>
          <p className="text-[11px] font-black uppercase tracking-widest text-ink/40 mb-1">
            {t("dashboard.acquisition")}
          </p>
          <p className="text-base font-semibold text-ink">
            +{stats.acquisitionThisMonth ?? 0}{" "}
            <span className="text-[11px] text-status-success font-normal ml-1">this month</span>
          </p>
        </div>
        <div>
          <p className="text-[11px] font-black uppercase tracking-widest text-ink/40 mb-1">
            {t("dashboard.churnRate")}
          </p>
          <p className="text-base font-semibold text-ink">
            {stats.unsubscribeRate ?? 0}%{" "}
            <span className="text-[11px] text-ink/50 font-normal ml-1">overall</span>
          </p>
        </div>
        <div>
          <p className="text-[11px] font-black uppercase tracking-widest text-ink/40 mb-1">
            LTV (Est.)
          </p>
          <p className="text-base font-semibold text-ink">{ltvFormatted}</p>
        </div>
      </div>
    </div>
  );
};

const LiveActivityFeed = () => {
  const { liveActivities } = useCollaboration();
  const { t } = useLanguage();

  const getIcon = (type: string) => {
    switch (type) {
      case "OPEN":
        return <MailOpen size={14} className="text-status-success" />;
      case "CLICK":
        return <MousePointer2 size={14} className="text-ink" />;
      case "BOUNCE":
        return <AlertCircle size={14} className="text-burgundy" />;
      case "BEHAVIORAL":
        return <Zap size={14} className="text-indigo-500" />;
      default:
        return <Activity size={14} className="text-ink/40" />;
    }
  };

  const getLabel = (activity: any) => {
    if (activity.type === "BEHAVIORAL") {
      return `performed ${activity.eventName.replace(/_/g, " ").toLowerCase()}`;
    }
    switch (activity.type) {
      case "OPEN":
        return "opened a broadcast";
      case "CLICK":
        return "clicked a link";
      case "SENT":
        return "received a broadcast";
      case "BOUNCE":
        return "email bounced";
      case "COMPLAINT":
        return "marked as spam";
      default:
        return "interacted with system";
    }
  };

  return (
    <div className="bg-surface border border-border-hairline p-6 space-y-6">
      <div className="flex justify-between items-center border-b border-border-hairline pb-4">
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-ink" />
          <h3 className="text-sm font-semibold text-ink">{t("dashboard.liveSignals")}</h3>
        </div>
        <span className="text-[10px] font-medium text-ink/40 uppercase tracking-widest">
          Real-time
        </span>
      </div>

      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
        {liveActivities.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <p className="text-sm text-ink/40">{t("dashboard.waitingSignals")}</p>
            <div className="flex justify-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-ink/20"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-ink/20"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-ink/20"></span>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {liveActivities.map((activity, idx) => (
              <div key={activity.id || idx} className="flex gap-4 group items-start">
                <div className="flex flex-col items-center gap-1 mt-1">
                  <div className="w-7 h-7 rounded-full bg-bg border border-border-hairline flex items-center justify-center transition-colors">
                    {getIcon(activity.type)}
                  </div>
                </div>
                <div className="flex-1 pb-2 border-b border-border-hairline group-last:border-none">
                  <div className="flex justify-between items-start">
                    <p className="text-sm font-medium text-ink">{activity.contactName}</p>
                    <span className="text-[10px] text-ink/40">
                      {new Date(activity.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="text-xs text-ink/60 mt-0.5">{getLabel(activity)}</p>
                  {activity.properties?.productId && (
                    <span className="inline-block mt-2 px-2 py-0.5 bg-ink/5 text-[10px] font-medium text-ink rounded-sm">
                      Product: {activity.properties.productId}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const Home = ({ onOpenGuide }: { onOpenGuide: () => void }) => {
  const { user, refreshUser } = useAuth();
  const { joinRoom, leaveRoom } = useCollaboration();
  const { t } = useLanguage();
  const [stats, setStats] = useState<DashboardStats>({
    totalSubscribers: 0,
    totalCampaigns: 0,
    avgOpenRate: 0,
    avgClickRate: 0,
    revenueAttributed: 0,
    activeCampaigns: 0,
    totalSent: 0,
    totalOpens: 0,
    bounceRate: 0,
    unsubscribeRate: 0,
  });
  const [recentCampaigns, setRecentCampaigns] = useState<Campaign[]>([]);
  const [scheduledCampaigns, setScheduledCampaigns] = useState<Campaign[]>([]);
  const [leadAnalytics, setLeadAnalytics] = useState<any>(null);
  const [deliverability, setDeliverability] = useState<any>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [ssoDomain, setSsoDomain] = useState("");
  const [isEmailSignIn, setIsEmailSignIn] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  useEffect(() => {
    if (user) {
      joinRoom("dashboard-live");
      api.getSummary().then(setStats);
      api.getCampaigns().then((res) => {
        const sent = res.filter((c) => c.status === "SENT");
        setRecentCampaigns(sent.slice(0, 3));
        setScheduledCampaigns(res.filter((c) => c.status === "SCHEDULED").slice(0, 3));
        if (sent.length > 0) {
          setLoadingAnalytics(true);
          api
            .getCampaignAnalytics(sent[0].id)
            .then(setLeadAnalytics)
            .catch(() => setLeadAnalytics(null))
            .finally(() => setLoadingAnalytics(false));
        }
      });
      api
        .getDeliverabilityAnalytics()
        .then(setDeliverability)
        .catch(() => setDeliverability(null));
    }
    return () => {
      leaveRoom("dashboard-live");
    };
  }, [user, joinRoom, leaveRoom]);

  const handleSSOLogin = async () => {
    try {
      const { url } = await api.getSSOUrl();
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        url,
        "SSO_LOGIN",
        `width=${width},height=${height},left=${left},top=${top}`
      );

      if (!popup) {
        alert("Popup blocked! Please allow popups for this site.");
        return;
      }

      const handleMessage = async (event: MessageEvent) => {
        if (event.data?.type === "SSO_AUTH_SUCCESS") {
          await refreshUser();
          window.removeEventListener("message", handleMessage);
        }
      };

      window.addEventListener("message", handleMessage);
    } catch (error) {
      console.error("SSO login failed", error);
      alert("SSO Login failed. Please check your domain configuration.");
    }
  };

  if (!user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-full max-w-md space-y-10">
          <div className="space-y-3 text-center">
            <h1 className="text-3xl font-sans font-bold tracking-tight text-ink">
              Welcome to SIGNAL
            </h1>
            <p className="text-sm text-ink/60">The enterprise marketing and broadcast system.</p>
          </div>

          <div className="bg-surface border border-border-hairline p-8 space-y-8 shadow-sm">
            <div className="space-y-3">
              <p className="text-[11px] font-black uppercase tracking-widest text-ink/40">
                Enterprise Access
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  aria-label="Corporate domain"
                  placeholder="Enter corporate domain"
                  className="flex-1 p-3 bg-bg border border-border-hairline text-sm focus:border-ink outline-none transition-colors"
                  value={ssoDomain}
                  onChange={(e) => setSsoDomain(e.target.value)}
                />
                <button
                  type="button"
                  onClick={handleSSOLogin}
                  className="bg-ink text-bg px-5 text-[11px] font-black uppercase tracking-widest hover:bg-ink/90 transition-all"
                >
                  Continue
                </button>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border-hairline"></div>
              </div>
              <div className="relative flex justify-center text-[11px] uppercase font-bold text-ink/40">
                <span className="bg-surface px-4">Or</span>
              </div>
            </div>

            {!isEmailSignIn ? (
              <button
                onClick={() => setIsEmailSignIn(true)}
                className="w-full py-3 border border-ink text-[11px] font-black uppercase tracking-widest hover:bg-ink/5 transition-all text-ink"
              >
                Sign in with Email
              </button>
            ) : (
              <form
                aria-label="Email sign in"
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    setLoginError("");
                    await api.login(email.trim(), password.trim());
                    await refreshUser();
                  } catch (err: any) {
                    setLoginError(err.message || "Login failed");
                  }
                }}
                className="space-y-5"
              >
                {loginError && (
                  <p role="alert" className="text-burgundy text-xs bg-burgundy/5 p-3 rounded-sm">
                    {loginError}
                  </p>
                )}
                <div className="space-y-1.5">
                  <label
                    htmlFor="login-email"
                    className="block text-[11px] font-black uppercase tracking-widest text-ink/60"
                  >
                    Email
                  </label>
                  <input
                    id="login-email"
                    type="email"
                    name="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-3 bg-bg border border-border-hairline text-sm focus:border-ink outline-none transition-colors"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label
                    htmlFor="login-password"
                    className="block text-[11px] font-black uppercase tracking-widest text-ink/60"
                  >
                    Password
                  </label>
                  <input
                    id="login-password"
                    type="password"
                    name="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full p-3 bg-bg border border-border-hairline text-sm focus:border-ink outline-none transition-colors"
                    required
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEmailSignIn(false)}
                    className="flex-1 py-3 border border-border-hairline text-ink text-[11px] font-black uppercase tracking-widest hover:bg-bg transition-all"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-ink border border-ink text-white text-[11px] font-black uppercase tracking-widest hover:bg-ink/90 transition-all"
                  >
                    Sign In
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  const leadCampaign = recentCampaigns[0];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      <SectionHeader
        title={t("dashboard.title")}
        subtitle={t("dashboard.subtitle")}
        guideKey="dashboard-metrics"
      />

      {/* Top Stats Strip */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard label={t("dashboard.totalAudience")} value={stats.totalSubscribers} />
        <MetricCard label={t("dashboard.broadcastsSent")} value={stats.activeCampaigns} />
        <MetricCard label={t("dashboard.dispatchVolume")} value={stats.totalSent} />
        <MetricCard label={t("dashboard.avgOpenRate")} value={`${stats.avgOpenRate ?? 0}%`} />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Lead Story & Charts */}
        <div className="col-span-1 lg:col-span-2 space-y-8">
          <AudienceHealthChart stats={stats} />

          <div className="bg-surface border border-border-hairline p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-sans font-semibold text-ink">
                {t("dashboard.latestDispatch")}
              </h3>
              {leadCampaign && (
                <span className="text-[10px] font-mono uppercase tracking-widest text-ink/60 bg-bg px-2 py-1 border border-border-hairline">
                  Sent {format(new Date(leadCampaign.sentAt || leadCampaign.createdAt), "MMM d")}
                </span>
              )}
            </div>

            {leadCampaign ? (
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-sans font-bold text-ink">{leadCampaign.name}</h2>
                </div>

                <div className="grid grid-cols-3 gap-6 p-5 bg-bg border border-border-hairline rounded-sm">
                  <p className="col-span-3 text-[10px] font-mono uppercase tracking-widest text-status-success flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-status-success"></span>
                    Live Broadcast Telemetry
                  </p>
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-widest text-ink/50 mb-1">
                      Open Rate
                    </p>
                    <p className="text-2xl font-semibold text-ink">
                      {leadAnalytics?.stats?.openRate !== undefined
                        ? `${leadAnalytics.stats.openRate}%`
                        : "0%"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-widest text-ink/50 mb-1">
                      Click Rate
                    </p>
                    <p className="text-2xl font-semibold text-ink">
                      {leadAnalytics?.stats?.clickRate !== undefined
                        ? `${leadAnalytics.stats.clickRate}%`
                        : "0%"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-widest text-ink/50 mb-1">
                      Unsubscribes
                    </p>
                    <p className="text-2xl font-semibold text-ink">
                      {leadAnalytics?.stats?.unsubscribeRate !== undefined
                        ? `${leadAnalytics.stats.unsubscribeRate}%`
                        : "0%"}
                    </p>
                  </div>
                </div>

                <div className="h-64 pt-4">
                  {leadAnalytics?.timeSeries && leadAnalytics.timeSeries.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={leadAnalytics.timeSeries.map((row: any) => ({
                          t: row.timestamp,
                          v: Number(row.opens || 0),
                        }))}
                      >
                        <defs>
                          <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#111827" stopOpacity={0.1} />
                            <stop offset="95%" stopColor="#111827" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                        <XAxis
                          dataKey="t"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 11, fill: "#9CA3AF" }}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 11, fill: "#9CA3AF" }}
                        />
                        <Tooltip
                          contentStyle={{
                            borderRadius: "0px",
                            border: "1px solid #E5E7EB",
                            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="v"
                          stroke="#111827"
                          fillOpacity={1}
                          fill="url(#colorVal)"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center border border-dashed border-border-hairline text-center p-6 space-y-2">
                      <p className="text-sm font-semibold text-ink/60">
                        Awaiting Hourly Engagement Activity
                      </p>
                      <p className="text-xs text-ink/40 max-w-sm">
                        As recipients open and interact with this broadcast, live hourly open curves
                        will render here automatically.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-16 text-center border border-dashed border-border-hairline bg-bg/50 space-y-3">
                <div className="w-10 h-10 rounded-full bg-ink/5 flex items-center justify-center mx-auto text-ink/40">
                  <Zap size={20} />
                </div>
                <p className="text-sm font-semibold text-ink">No dispatches recorded.</p>
                <p className="text-xs text-ink/50 max-w-sm mx-auto leading-relaxed">
                  Launch your first email broadcast to view live open rates, click distributions,
                  and hourly engagement velocity.
                </p>
                <div className="pt-2">
                  <Link
                    to="/campaigns"
                    className="inline-block px-4 py-2 bg-ink text-white text-[10px] font-black uppercase tracking-widest hover:bg-ink/80 transition-colors"
                  >
                    Create Broadcast →
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Sidebar */}
        <div className="col-span-1 space-y-8">
          <LiveActivityFeed />

          <div className="bg-surface border border-border-hairline p-6 space-y-6">
            <div className="flex justify-between items-center border-b border-border-hairline pb-4">
              <h3 className="text-sm font-semibold text-ink">
                {t("dashboard.upcomingBroadcasts")}
              </h3>
              <Link
                to="/campaigns"
                className="text-[11px] font-black uppercase tracking-widest text-ink hover:text-ink/70 transition-colors"
              >
                {t("dashboard.viewAll")}
              </Link>
            </div>

            <div className="space-y-4">
              {scheduledCampaigns.length > 0 ? (
                scheduledCampaigns.map((camp) => (
                  <div
                    key={camp.id}
                    className="group cursor-pointer border border-border-hairline p-4 hover:border-ink/20 transition-colors"
                  >
                    <p className="text-[10px] font-medium text-ink/40 mb-1.5 uppercase tracking-widest">
                      {camp.scheduledAt
                        ? format(new Date(camp.scheduledAt), "MMM d, HH:mm")
                        : "N/A"}{" "}
                      ({camp.timezone})
                    </p>
                    <h4 className="text-sm font-medium text-ink group-hover:text-ink/70 transition-colors line-clamp-2">
                      {camp.name}
                    </h4>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-sm text-ink/40">
                  {t("dashboard.noUpcoming")}
                </div>
              )}
            </div>
          </div>

          <div className="bg-surface border border-border-hairline p-6 space-y-6">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-ink">Email Provider Health</h3>
                <span
                  className={cn(
                    "text-[10px] font-mono font-bold uppercase tracking-widest",
                    stats.totalSent > 0 ? "text-status-success" : "text-ink/40"
                  )}
                >
                  {stats.totalSent > 0 ? "Active" : "Standby"}
                </span>
              </div>
              <p className="text-xs text-ink/50 mt-1">
                {stats.totalSent > 0
                  ? `Telemetry active across ${stats.totalSent} recipient transmissions.`
                  : "Provider telemetry on standby until your first dispatch."}
              </p>
            </div>
            <div className="space-y-5">
              <div>
                <div className="flex justify-between text-[11px] font-black uppercase tracking-widest text-ink/60 mb-2">
                  <span>Deliverability</span>
                  <span
                    className={
                      stats.totalSent > 0 ? "text-ink font-mono font-bold" : "text-ink/40 font-mono"
                    }
                  >
                    {stats.totalSent > 0
                      ? `${deliverability?.deliveryRate ?? 100}%`
                      : "100% (Standby)"}
                  </span>
                </div>
                <div className="h-1.5 bg-bg rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full transition-all duration-500",
                      stats.totalSent > 0 ? "bg-status-success" : "bg-ink/20"
                    )}
                    style={{
                      width: `${stats.totalSent > 0 ? (deliverability?.deliveryRate ?? 100) : 100}%`,
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[11px] font-black uppercase tracking-widest text-ink/60 mb-2">
                  <span>Sender Reputation</span>
                  <span
                    className={
                      stats.totalSent > 0 ? "text-ink font-mono font-bold" : "text-ink/40 font-mono"
                    }
                  >
                    {stats.totalSent > 0
                      ? `${Math.max(50, Math.min(100, Math.round(100 - (deliverability?.bounceRate || 0) * 4 - (deliverability?.complaintRate || 0) * 20)))}% (Optimal)`
                      : "Optimal (Standby)"}
                  </span>
                </div>
                <div className="h-1.5 bg-bg rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full transition-all duration-500",
                      stats.totalSent > 0 ? "bg-status-success" : "bg-ink/20"
                    )}
                    style={{
                      width: `${
                        stats.totalSent > 0
                          ? Math.max(
                              50,
                              Math.min(
                                100,
                                Math.round(
                                  100 -
                                    (deliverability?.bounceRate || 0) * 4 -
                                    (deliverability?.complaintRate || 0) * 20
                                )
                              )
                            )
                          : 100
                      }%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-inverse p-6 space-y-4 text-on-inverse">
            <div className="flex items-center gap-3">
              <BookOpen size={20} className="text-white/80" />
              <h3 className="text-sm font-semibold">Documentation</h3>
            </div>
            <p className="text-xs text-white/60 leading-relaxed">
              Learn how to use all features of SIGNAL, from creating campaigns to setting up the
              growth engine.
            </p>
            <button
              onClick={onOpenGuide}
              className="w-full py-3 mt-2 bg-white/10 hover:bg-white/20 text-white text-[11px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
            >
              Open User Guide
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
