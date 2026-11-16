import { useState, useEffect } from "react";
import { Link, useParams } from "react-router";
import { ExternalLink } from "lucide-react";
import { api } from "../services/api";
import { ContentRenderer } from "../components/ContentRenderer";
import { TabBar } from "../components/ui/TabBar";
import { format } from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { cn } from "../lib/utils";
import { useLanguage } from "../contexts/LanguageContext";

const CampaignDetail = () => {
  const { t } = useLanguage();
  const { id } = useParams<{ id: string }>();
  const [analytics, setAnalytics] = useState<any>(null);
  const [engagement, setEngagement] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"OVERVIEW" | "ENGAGEMENT">("OVERVIEW");

  useEffect(() => {
    if (id) {
      Promise.all([api.getCampaignAnalytics(id), api.getEngagementAnalytics(id)]).then(
        ([analyticsRes, engagementRes]) => {
          setAnalytics(analyticsRes);
          setEngagement(engagementRes);
          setLoading(false);
        }
      );
    }
  }, [id]);

  if (loading)
    return (
      <div className="p-20 text-center font-editorial italic text-3xl">Loading analytics...</div>
    );
  if (!analytics)
    return (
      <div className="p-20 text-center font-editorial italic text-3xl">Campaign not found.</div>
    );

  const { campaign, stats, timeSeries, deviceData } = analytics;

  const scrollData = engagement?.events
    ?.filter((e: any) => e.type === "scroll")
    ?.reduce((acc: any, e: any) => {
      const depth = Math.floor(e.value / 10) * 10;
      acc[depth] = (acc[depth] || 0) + 1;
      return acc;
    }, {});

  const heatmapData = Object.entries(scrollData || {})
    .map(([depth, count]) => ({
      depth: `${depth}%`,
      count,
    }))
    .sort((a, b) => parseInt(a.depth) - parseInt(b.depth));

  return (
    <div className="space-y-12">
      <div className="flex justify-between items-start border-b border-ink pb-8">
        <div className="space-y-2">
          <div className="flex items-center gap-4">
            <Link
              to="/campaigns"
              className="text-[10px] font-black uppercase tracking-widest text-burgundy hover:underline"
            >
              ← Back to Broadcasts
            </Link>
            <span
              className={cn(
                "px-2 py-0.5 text-[9px] font-black uppercase tracking-widest border",
                campaign.status === "SENT"
                  ? "border-status-success text-status-success"
                  : campaign.status === "SCHEDULED"
                    ? "border-status-scheduled text-status-scheduled"
                    : "border-status-draft text-status-draft"
              )}
            >
              {campaign.status}
            </span>
          </div>
          <h1 className="text-6xl font-serif font-bold text-ink">{campaign.name}</h1>
          <p className="text-xl font-editorial italic text-ink/60">{campaign.subject}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right space-y-1 mr-8">
            <p className="metric-label">Sent on</p>
            <p className="font-mono text-sm uppercase">
              {campaign.sentAt
                ? format(new Date(campaign.sentAt), "MMMM d, yyyy HH:mm")
                : "Not sent yet"}
            </p>
          </div>
          <Link
            to={`/dispatch/${campaign.id}`}
            target="_blank"
            className="btn-primary py-2 px-4 flex items-center gap-2"
          >
            <ExternalLink size={14} />
            View Dispatch
          </Link>
        </div>
      </div>

      <div className="flex gap-8 border-b border-border-hairline">
        <button
          onClick={() => setActiveTab("OVERVIEW")}
          className={cn(
            "pb-4 text-[10px] font-black uppercase tracking-widest transition-all border-b-2",
            activeTab === "OVERVIEW"
              ? "border-burgundy text-ink"
              : "border-transparent text-ink/40 hover:text-ink"
          )}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab("ENGAGEMENT")}
          className={cn(
            "pb-4 text-[10px] font-black uppercase tracking-widest transition-all border-b-2",
            activeTab === "ENGAGEMENT"
              ? "border-burgundy text-ink"
              : "border-transparent text-ink/40 hover:text-ink"
          )}
        >
          Engagement Heatmap
        </button>
      </div>

      {activeTab === "OVERVIEW" ? (
        <div className="newspaper-grid">
          <div className="col-span-12 lg:col-span-8 space-y-12 pr-8 lg:border-r border-border-hairline">
            <div className="grid grid-cols-3 gap-8">
              <div className="space-y-2">
                <p className="metric-label">Open Rate</p>
                <p className="text-5xl font-serif font-bold">
                  {Math.round((stats.opened / stats.sent) * 100)}%
                </p>
                <p className="text-[10px] font-mono text-ink/40 uppercase">{stats.opened} Opens</p>
              </div>
              <div className="space-y-2">
                <p className="metric-label">Click Rate</p>
                <p className="text-5xl font-serif font-bold">
                  {Math.round((stats.clicked / stats.opened) * 100)}%
                </p>
                <p className="text-[10px] font-mono text-ink/40 uppercase">
                  {stats.clicked} Clicks
                </p>
              </div>
              <div className="space-y-2">
                <p className="metric-label">Conversion</p>
                <p className="text-5xl font-serif font-bold">
                  {Math.round((stats.conversions / stats.clicked) * 100)}%
                </p>
                <p className="text-[10px] font-mono text-ink/40 uppercase">
                  {stats.conversions} Orders
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="font-sans font-black uppercase tracking-widest text-xs border-b border-ink pb-2">
                Engagement Over Time
              </h3>
              <div className="h-80 bg-surface/30 p-6 border border-border-hairline">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timeSeries}>
                    <defs>
                      <linearGradient id="colorOpens" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8B1A1A" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="#8B1A1A" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#D4CFC6" />
                    <XAxis
                      dataKey="timestamp"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fontFamily: "Courier Prime" }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fontFamily: "Courier Prime" }}
                    />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="opens"
                      stroke="#8B1A1A"
                      fillOpacity={1}
                      fill="url(#colorOpens)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="clicks"
                      stroke="#D4CFC6"
                      fillOpacity={0}
                      strokeWidth={2}
                      strokeDasharray="5 5"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="font-sans font-black uppercase tracking-widest text-xs border-b border-ink pb-2">
                Content Preview
              </h3>
              <div className="bg-surface border border-border-hairline p-10 shadow-sm max-w-2xl mx-auto">
                <ContentRenderer
                  content={campaign.content}
                  campaignId={campaign.id}
                  contactId="preview-contact-id"
                />
              </div>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-4 space-y-12">
            <div className="space-y-6">
              <h3 className="font-sans font-black uppercase tracking-widest text-xs border-b border-ink pb-2">
                Device Distribution
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={deviceData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#D4CFC6" />
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="name"
                      type="category"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fontFamily: "Courier Prime" }}
                    />
                    <Tooltip />
                    <Bar dataKey="value" fill="#8B1A1A" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-surface p-8 space-y-6">
              <h3 className="font-serif text-2xl font-bold">{t("campaigns.audienceSentiment")}</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="metric-label">Unsubscribes</span>
                  <span className="font-mono text-sm text-burgundy">{stats.unsubscribed}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="metric-label">Bounces</span>
                  <span className="font-mono text-sm">{stats.bounced}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="metric-label">Spam Complaints</span>
                  <span className="font-mono text-sm">0</span>
                </div>
              </div>
              <p className="text-xs text-ink/60 leading-relaxed italic border-t border-border-hairline pt-4">
                "This broadcast performed 15% better than your average editorial dispatch. The
                subject line resonance was particularly high among mobile readers."
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="newspaper-grid">
          <div className="col-span-12 lg:col-span-8 space-y-12 pr-8 lg:border-r border-border-hairline">
            <div className="grid grid-cols-2 gap-12">
              <div className="space-y-2">
                <p className="metric-label">Avg. Read Time</p>
                <p className="text-5xl font-serif font-bold">
                  {Math.floor(
                    engagement.summary.totalReadTime /
                      (engagement.events.filter((e: any) => e.type === "read_time").length || 1)
                  )}
                  s
                </p>
                <p className="text-[10px] font-mono text-ink/40 uppercase">
                  Based on {engagement.events.filter((e: any) => e.type === "read_time").length}{" "}
                  sessions
                </p>
              </div>
              <div className="space-y-2">
                <p className="metric-label">Avg. Scroll Depth</p>
                <p className="text-5xl font-serif font-bold">
                  {Math.round(engagement.summary.avgScrollDepth)}%
                </p>
                <p className="text-[10px] font-mono text-ink/40 uppercase">Completion Rate</p>
              </div>
            </div>

            <div className="space-y-8">
              <h3 className="font-sans font-black uppercase tracking-widest text-xs border-b border-ink pb-2">
                Scroll Depth Distribution
              </h3>
              <div className="h-96 bg-surface/30 p-8 border border-border-hairline">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={heatmapData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#D4CFC6" />
                    <XAxis
                      dataKey="depth"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fontFamily: "Courier Prime" }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fontFamily: "Courier Prime" }}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#1A1814", border: "none", color: "#fff" }}
                      itemStyle={{ color: "#fff" }}
                    />
                    <Bar dataKey="count" fill="#8B1A1A" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="space-y-8">
              <h3 className="font-sans font-black uppercase tracking-widest text-xs border-b border-ink pb-2">
                Reader Drop-off Heatmap
              </h3>
              <div className="relative border border-border-hairline bg-white p-12 overflow-hidden">
                <div className="opacity-20 select-none pointer-events-none">
                  <ContentRenderer
                    content={campaign.content}
                    campaignId={campaign.id}
                    contactId="preview-contact-id"
                  />
                </div>

                {/* Heatmap Overlay */}
                <div className="absolute inset-0 pointer-events-none flex flex-col">
                  {[...Array(10)].map((_, i) => {
                    const depth = i * 10;
                    const count = scrollData?.[depth] || 0;
                    const maxCount = Math.max(...(Object.values(scrollData || {}) as number[]), 1);
                    const intensity = count / maxCount;

                    return (
                      <div
                        key={i}
                        className="flex-1 w-full flex items-center justify-end pr-4 border-b border-ink/5"
                        style={{ backgroundColor: `rgba(139, 26, 26, ${intensity * 0.3})` }}
                      >
                        <span className="text-[8px] font-mono font-bold text-burgundy">
                          {depth}% Depth
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-4 space-y-12">
            <div className="bg-inverse text-on-inverse p-8 space-y-8">
              <h3 className="font-serif text-2xl font-bold">{t("campaigns.engagementInsights")}</h3>
              <div className="space-y-6">
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase text-white/40">
                    {t("campaigns.retentionScore")}
                  </p>
                  <div className="flex items-end gap-2">
                    <p className="text-4xl font-serif font-bold">{t("campaigns.high")}</p>
                    <p className="text-xs text-status-success mb-1">Top 5%</p>
                  </div>
                </div>
                <p className="text-xs text-white/60 leading-relaxed italic">
                  "Readers are spending an average of 45 seconds on the first three paragraphs.
                  There is a significant drop-off at the 60% mark, suggesting the conclusion could
                  be more concise."
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="font-sans font-black uppercase tracking-widest text-xs border-b border-ink pb-2">
                Section Performance
              </h3>
              <div className="space-y-4">
                {Object.entries(engagement.summary.sectionEngagement).map(([id, data]: any) => (
                  <div
                    key={id}
                    className="flex justify-between items-center border-b border-border-hairline pb-2"
                  >
                    <div>
                      <p className="text-[10px] font-black uppercase text-ink/60">Section {id}</p>
                      <p className="text-xs font-bold">{data.views} Views</p>
                    </div>
                    <p className="font-mono text-sm">{data.readTime}s</p>
                  </div>
                ))}
                {Object.keys(engagement.summary.sectionEngagement).length === 0 && (
                  <p className="text-xs font-editorial italic text-ink/40">
                    No section data available.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CampaignDetail;
