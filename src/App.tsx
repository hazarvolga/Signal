import React, { lazy, Suspense, useState, useEffect, useCallback, useRef } from "react";
import * as d3 from "d3";
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useLocation,
  useParams,
  Navigate,
  useSearchParams,
  useNavigate,
} from "react-router";
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
import { motion, AnimatePresence, MotionConfig } from "motion/react";
import { api } from "./services/api";
import {
  User,
  Contact,
  Template,
  Campaign,
  DashboardStats,
  Segment,
  CustomFieldDefinition,
  Flow,
  Event,
  Tag,
} from "./types";
import { format } from "date-fns";
import { fromZonedTime, formatInTimeZone } from "date-fns-tz";
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
  PieChart,
  Pie,
  Cell,
} from "recharts";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useAuth, Permission } from "./hooks/useAuth";
import { ContentRenderer } from "./components/ContentRenderer";
import { useCollaboration } from "./services/collaborationContext";
import { HelpTooltip } from "./components/HelpTooltip";
import { BookOpen, BrainCircuit, TrendingUp, Gift, Copy, HelpCircle } from "lucide-react";
import { useTour } from "./contexts/TourContext";
import { useLanguage } from "./contexts/LanguageContext";
import { cn } from "./lib/utils";

const Automations = lazy(() => import("./pages/Automations"));
const Campaigns = lazy(() => import("./pages/Campaigns"));
const Audiences = lazy(() => import("./pages/Audiences"));
const Reports = lazy(() => import("./pages/Reports"));
const Collaboration = lazy(() => import("./pages/Collaboration"));
const Infrastructure = lazy(() => import("./pages/Infrastructure"));
const Integrations = lazy(() => import("./pages/Integrations"));
const ShopifyIntegration = lazy(() => import("./pages/integrations/ShopifyIntegration"));
const WooCommerceIntegration = lazy(() => import("./pages/integrations/WooCommerceIntegration"));
const HubSpotIntegration = lazy(() => import("./pages/integrations/HubSpotIntegration"));
const ZapierIntegration = lazy(() => import("./pages/integrations/ZapierIntegration"));
const TwilioIntegration = lazy(() => import("./pages/integrations/TwilioIntegration"));
const WhatsAppIntegration = lazy(() => import("./pages/integrations/WhatsAppIntegration"));
const MediaLibrary = lazy(() => import("./pages/MediaLibrary"));
const Templates = lazy(() => import("./pages/Templates"));
const DataLayer = lazy(() => import("./pages/DataLayer"));
const VisualStudio = lazy(() => import("./pages/VisualStudio"));
const Home = lazy(() => import("./pages/Home"));
const SignalLanding = lazy(() => import("./pages/SignalLanding"));
const Commerce = lazy(() => import("./pages/Commerce"));
const CampaignDetail = lazy(() => import("./pages/CampaignDetail"));
const DispatchView = lazy(() => import("./pages/DispatchView"));
const CommandPalette = lazy(() => import("./pages/CommandPalette"));
const PreferenceCenter = lazy(() => import("./pages/PreferenceCenter"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const FormsPages = lazy(() => import("./components/FormsPages"));
const LandingPages = lazy(() => import("./pages/LandingPages"));
const PublicForm = lazy(() => import("./pages/PublicForm"));
const PublicReferral = lazy(() => import("./pages/PublicReferral"));
const ReferralVerification = lazy(() => import("./pages/ReferralVerification"));
const EmailValidation = lazy(() =>
  import("./components/EmailValidation").then((module) => ({
    default: module.EmailValidation,
  }))
);
const GrowthEngine = lazy(() =>
  import("./components/GrowthEngine").then((module) => ({
    default: module.GrowthEngine,
  }))
);
const ProviderSettingsModal = lazy(() =>
  import("./components/ProviderSettingsModal").then((module) => ({
    default: module.ProviderSettingsModal,
  }))
);
const UserGuideModal = lazy(() =>
  import("./components/UserGuide").then((module) => ({
    default: module.UserGuideModal,
  }))
);

const RouteFallback = () => (
  <div role="status" aria-live="polite" className="min-h-[40vh] flex items-center justify-center">
    <div className="flex items-center gap-3 text-ink font-mono text-xs uppercase tracking-widest">
      <Loader2 size={18} className="animate-spin text-burgundy" aria-hidden="true" />
      Loading workspace
    </div>
  </div>
);

// --- Utils ---

const ProtectedRoute = ({
  children,
  permission,
}: {
  children: React.ReactNode;
  permission?: Permission;
}) => {
  const { user, loading, hasPermission } = useAuth();

  if (loading) return null; // or a spinner

  if (!user) return <Navigate to="/login" />;

  if (permission && !hasPermission(permission)) return <Navigate to="/" />;

  return <>{children}</>;
};

// --- Components ---

const Sidebar = ({
  isMobileMenuOpen,
  setIsMobileMenuOpen,
}: {
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (v: boolean) => void;
}) => {
  const location = useLocation();
  const { t } = useLanguage();

  const navGroups = [
    {
      title: t("categories.marketing"),
      links: [
        { to: "/campaigns", label: t("nav.campaigns"), icon: Send },
        { to: "/automations", label: t("nav.automations"), icon: Zap },
        { to: "/growth", label: t("nav.growth"), icon: TrendingUp },
        { to: "/landing-pages", label: t("nav.landingPages"), icon: LayoutTemplate },
        { to: "/forms", label: t("nav.forms"), icon: FileText },
      ],
    },
    {
      title: t("categories.audience"),
      links: [
        { to: "/audiences", label: t("nav.audiences"), icon: Users },
        { to: "/reports", label: t("nav.reports"), icon: BarChart3 },
        { to: "/validation", label: t("nav.validation"), icon: ShieldCheck },
      ],
    },
    {
      title: t("categories.content"),
      links: [
        { to: "/templates", label: t("nav.templates"), icon: FileText },
        { to: "/media", label: t("nav.media"), icon: ImageIcon },
        { to: "/visual-studio", label: t("nav.visualStudio"), icon: Wand2 },
      ],
    },
    {
      title: t("categories.system"),
      links: [
        { to: "/commerce", label: t("nav.commerce"), icon: ShoppingBag },
        { to: "/integrations", label: t("nav.integrations"), icon: Link2 },
        { to: "/collaboration", label: t("nav.collaboration"), icon: Users2 },
        { to: "/infrastructure", label: t("nav.infrastructure"), icon: Settings },
      ],
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-ink/20 z-40 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        aria-label="Primary navigation"
        className={cn(
          "fixed top-0 left-0 h-screen w-[260px] bg-surface border-r border-border-hairline z-50 flex flex-col transition-transform duration-300 ease-in-out lg:!translate-x-0 lg:static",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="h-20 flex items-center px-6 border-b border-border-hairline shrink-0 justify-between">
          <Link
            to="/"
            onClick={() => setIsMobileMenuOpen(false)}
            className="text-2xl font-serif font-black tracking-tighter text-ink"
          >
            SIGNAL<span className="text-burgundy">.</span>
          </Link>
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden p-2 text-ink/60 hover:text-burgundy"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-none py-6 px-4 flex flex-col gap-8">
          {navGroups.map((group) => (
            <div key={group.title}>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-ink/40 mb-3 px-2">
                {group.title}
              </h3>
              <div className="flex flex-col gap-1">
                {group.links.map((link) => {
                  const Icon = link.icon;
                  const isActive = location.pathname.startsWith(link.to);
                  return (
                    <Link
                      key={link.to}
                      to={link.to}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded transition-colors font-sans text-sm font-medium",
                        isActive
                          ? "bg-ink text-surface"
                          : "text-ink/70 hover:text-ink hover:bg-ink/5"
                      )}
                    >
                      <Icon size={16} className={isActive ? "text-surface" : "text-ink/50"} />
                      {link.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </aside>
    </>
  );
};

const TopHeader = ({
  onOpenGuide,
  theme,
  toggleTheme,
  setIsMobileMenuOpen,
}: {
  onOpenGuide: () => void;
  theme: "light" | "dark";
  toggleTheme: () => void;
  setIsMobileMenuOpen: (v: boolean) => void;
}) => {
  const { user } = useAuth();
  const [isProviderModalOpen, setIsProviderModalOpen] = useState(false);
  const { isTourActive, toggleTour } = useTour();
  const { language, toggleLanguage, t } = useLanguage();

  return (
    <>
      <header className="h-20 bg-surface border-b border-border-hairline sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 lg:px-10 shrink-0">
        <div className="flex items-center gap-4">
          <button
            type="button"
            aria-label="Open navigation menu"
            onClick={() => setIsMobileMenuOpen(true)}
            className="lg:hidden p-2 text-ink/60 hover:text-burgundy transition-colors"
          >
            <Menu size={24} />
          </button>

          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-surface border border-border-hairline rounded text-[10px] font-mono text-ink/40">
            <Search size={12} />
            <span>{t("header.searchShortcut")}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-6">
          <button
            onClick={toggleTheme}
            className="p-2 text-ink/60 hover:text-burgundy transition-colors rounded-full hover:bg-burgundy/5"
            title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
          >
            {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
          </button>

          <button
            type="button"
            aria-label={`Change language. Current language: ${language.toUpperCase()}`}
            onClick={toggleLanguage}
            className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-ink/70 hover:text-burgundy px-2.5 py-1.5 rounded transition-all border border-border-hairline hover:border-burgundy/40"
          >
            <Globe size={14} className="text-burgundy" />
            <span className="hidden sm:inline">{language.toUpperCase()}</span>
          </button>

          <button
            onClick={() => setIsProviderModalOpen(true)}
            className="hidden sm:flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-800 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 px-3 py-2 rounded transition-all border border-emerald-500/30"
          >
            <Sparkles size={14} />
            <span>{t("header.aiKeys")}</span>
          </button>

          <button
            onClick={onOpenGuide}
            className="hidden sm:flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-burgundy hover:bg-burgundy/5 px-3 py-2 rounded transition-all border border-burgundy/20"
          >
            <BookOpen size={14} />
            <span>{t("header.guide")}</span>
          </button>

          <button
            onClick={toggleTour}
            className={cn(
              "hidden md:flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded transition-all border",
              isTourActive
                ? "bg-burgundy text-white border-burgundy animate-pulse shadow-[0_0_10px_rgba(255,0,0,0.5)]"
                : "text-burgundy hover:bg-burgundy/5 border-burgundy/20"
            )}
          >
            <HelpCircle size={14} />
            <span>{isTourActive ? t("header.stopTour") : t("header.startTour")}</span>
          </button>

          <div className="flex items-center gap-2 sm:gap-4 border-l border-border-hairline pl-4 sm:pl-6">
            <button
              type="button"
              aria-label="Notifications"
              className="text-ink/60 hover:text-burgundy transition-colors"
            >
              <Bell size={20} />
            </button>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-[10px] font-black uppercase tracking-widest text-ink">
                  {user?.name || "Loading..."}
                </p>
                <div className="flex items-center justify-end gap-1">
                  <span className="px-1 bg-burgundy/10 text-burgundy text-[7px] font-mono font-bold rounded uppercase">
                    {user?.role}
                  </span>
                </div>
              </div>
              <div className="w-8 h-8 bg-surface border border-border-hairline flex items-center justify-center text-burgundy rounded-full">
                <UserIcon size={16} />
              </div>
            </div>
          </div>
        </div>
      </header>
      {isProviderModalOpen && (
        <Suspense fallback={null}>
          <ProviderSettingsModal
            isOpen={isProviderModalOpen}
            onClose={() => setIsProviderModalOpen(false)}
          />
        </Suspense>
      )}
    </>
  );
};

const AudienceHealthChart = () => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const data = [
      { date: new Date(2024, 0, 1), subscribers: 1000, churn: 20 },
      { date: new Date(2024, 1, 1), subscribers: 1200, churn: 25 },
      { date: new Date(2024, 2, 1), subscribers: 1500, churn: 30 },
      { date: new Date(2024, 3, 1), subscribers: 1800, churn: 45 },
      { date: new Date(2024, 4, 1), subscribers: 2200, churn: 40 },
      { date: new Date(2024, 5, 1), subscribers: 2800, churn: 55 },
    ];

    const margin = { top: 20, right: 30, bottom: 30, left: 40 };
    const width = 800 - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

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

    const y = d3
      .scaleLinear()
      .domain([0, d3.max(data, (d) => d.subscribers) as number])
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
      .attr("font-family", "JetBrains Mono")
      .attr("font-size", "10px");

    svg
      .append("g")
      .call(d3.axisLeft(y).ticks(5))
      .attr("font-family", "JetBrains Mono")
      .attr("font-size", "10px");

    const line = d3
      .line<any>()
      .x((d) => x(d.date))
      .y((d) => y(d.subscribers))
      .curve(d3.curveMonotoneX);

    svg
      .append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "#8B1A1A")
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
      .attr("fill", "#8B1A1A")
      .attr("stroke", "#F5F2EC")
      .attr("stroke-width", 2);
  }, []);

  return (
    <div className="bg-surface border border-border-hairline p-8 space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-burgundy mb-2">
            Advanced Audience Health
          </p>
          <h3 className="text-3xl font-serif font-bold">Growth Velocity</h3>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black uppercase tracking-widest text-ink/40">
            Retention Rate
          </p>
          <p className="text-2xl font-editorial italic">94.2%</p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <svg ref={svgRef}></svg>
      </div>
      <div className="grid grid-cols-3 gap-8 pt-6 border-t border-border-hairline">
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-ink/40 mb-1">
            Acquisition
          </p>
          <p className="text-lg font-bold">
            +240 <span className="text-[10px] text-status-success">↑</span>
          </p>
        </div>
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-ink/40 mb-1">
            Churn Rate
          </p>
          <p className="text-lg font-bold">
            1.2% <span className="text-[10px] text-status-success">↓</span>
          </p>
        </div>
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-ink/40 mb-1">
            LTV (Est.)
          </p>
          <p className="text-lg font-bold">$142.00</p>
        </div>
      </div>
    </div>
  );
};

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

const MetricBlock = ({
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
  <div className="space-y-2">
    <p className="metric-label">{label}</p>
    <div className="flex items-baseline gap-3">
      <p className="metric-value">{value}</p>
      {delta && (
        <span
          className={cn(
            "metric-delta flex items-center gap-0.5",
            deltaType === "up" ? "text-status-success" : "text-burgundy"
          )}
        >
          {deltaType === "up" ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {delta}
        </span>
      )}
    </div>
  </div>
);

// --- Pages ---

const LiveActivityFeed = () => {
  const { liveActivities } = useCollaboration();

  const getIcon = (type: string) => {
    switch (type) {
      case "OPEN":
        return <MailOpen size={14} className="text-status-success" />;
      case "CLICK":
        return <MousePointer2 size={14} className="text-burgundy" />;
      case "BOUNCE":
        return <AlertCircle size={14} className="text-burgundy" />;
      case "BEHAVIORAL":
        return <Zap size={14} className="text-burgundy" />;
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
          <Activity size={16} className="text-burgundy animate-pulse" />
          <h3 className="text-[10px] font-black uppercase tracking-widest text-ink">
            Live Activity Feed
          </h3>
        </div>
        <span className="text-[9px] font-mono text-ink/40 uppercase">Real-time Dispatch</span>
      </div>

      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
        {liveActivities.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <p className="text-xs font-editorial italic text-ink/40">Waiting for live signals...</p>
            <div className="flex justify-center gap-1">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="w-1 h-1 bg-burgundy/20 rounded-full animate-pulse"
                  style={{ animationDelay: `${i * 0.2}s` }}
                />
              ))}
            </div>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {liveActivities.map((activity, idx) => (
              <motion.div
                key={activity.id || idx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex gap-4 group"
              >
                <div className="flex flex-col items-center gap-1">
                  <div className="w-8 h-8 rounded-full bg-bg border border-border-hairline flex items-center justify-center group-hover:border-burgundy transition-colors">
                    {getIcon(activity.type)}
                  </div>
                  <div className="w-px h-full bg-border-hairline group-last:hidden" />
                </div>
                <div className="flex-1 pb-4">
                  <div className="flex justify-between items-start">
                    <p className="text-xs font-bold text-ink">{activity.contactName}</p>
                    <span className="text-[8px] font-mono text-ink/40 uppercase">
                      {new Date(activity.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="text-[10px] font-serif italic text-ink/60 mt-0.5">
                    {getLabel(activity)}
                  </p>
                  {activity.properties?.productId && (
                    <span className="inline-block mt-2 px-2 py-0.5 bg-burgundy/5 border border-burgundy/10 text-[8px] font-black uppercase text-burgundy">
                      Product: {activity.properties.productId}
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

// --- Main App Layout ---

export default function App() {
  const { t } = useLanguage();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("signal-theme");
      if (saved === "dark" || saved === "light") return saved;
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return "light";
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("signal-theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme((prev) => (prev === "light" ? "dark" : "light"));

  const isProductLanding = !user && location.pathname === "/";
  const isLandingRoute = isProductLanding || (!user && location.pathname === "/login");
  const isPublicRoute =
    isLandingRoute ||
    location.pathname.startsWith("/unsubscribe") ||
    location.pathname.startsWith("/preferences") ||
    location.pathname.startsWith("/privacy") ||
    location.pathname.startsWith("/kvkk") ||
    location.pathname.startsWith("/f/") ||
    location.pathname === "/demo-2026" ||
    location.pathname.startsWith("/referral");

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex h-screen bg-bg selection:bg-burgundy selection:text-white transition-colors duration-300 overflow-hidden">
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <Suspense fallback={null}>
          <CommandPalette />
        </Suspense>

        {user && !isPublicRoute && (
          <Sidebar isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />
        )}

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          {user && !isPublicRoute && (
            <TopHeader
              onOpenGuide={() => setIsGuideOpen(true)}
              theme={theme}
              toggleTheme={toggleTheme}
              setIsMobileMenuOpen={setIsMobileMenuOpen}
            />
          )}

          <main
            id="main-content"
            tabIndex={-1}
            className={cn(
              "flex-1 overflow-y-auto scrollbar-none",
              (!user || isPublicRoute) &&
                !isProductLanding &&
                "flex items-center justify-center h-full"
            )}
          >
            <div
              className={cn(
                isPublicRoute
                  ? "w-full min-h-screen p-0 m-0 max-w-none"
                  : user
                    ? "max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 py-8 sm:py-16"
                    : "w-full py-0"
              )}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={location.pathname}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className={!user || isPublicRoute ? "w-full" : ""}
                >
                  <Suspense fallback={<RouteFallback />}>
                    <Routes>
                      <Route
                        path="/"
                        element={
                          authLoading ? (
                            <RouteFallback />
                          ) : user ? (
                            <Home onOpenGuide={() => setIsGuideOpen(true)} />
                          ) : (
                            <SignalLanding />
                          )
                        }
                      />
                      <Route
                        path="/login"
                        element={
                          user ? (
                            <Navigate to="/" replace />
                          ) : (
                            <Home onOpenGuide={() => setIsGuideOpen(true)} />
                          )
                        }
                      />
                      <Route
                        path="/campaigns"
                        element={
                          <ProtectedRoute>
                            <Campaigns />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/campaigns/:id"
                        element={
                          <ProtectedRoute>
                            <CampaignDetail />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/audiences"
                        element={
                          <ProtectedRoute permission="contact:edit">
                            <Audiences />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/growth"
                        element={
                          <ProtectedRoute>
                            <GrowthEngine />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/landing-pages"
                        element={
                          <ProtectedRoute>
                            <LandingPages />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/forms"
                        element={
                          <ProtectedRoute>
                            <FormsPages />
                          </ProtectedRoute>
                        }
                      />
                      <Route path="/f/:id" element={<PublicForm />} />
                      <Route path="/demo-2026" element={<PublicForm formId="demo-2026" />} />
                      <Route path="/referral/:token" element={<PublicReferral />} />
                      <Route path="/referral/verify/:token" element={<ReferralVerification />} />
                      <Route
                        path="/automations"
                        element={
                          <ProtectedRoute permission="automation:edit">
                            <Automations />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/media"
                        element={
                          <ProtectedRoute>
                            <MediaLibrary />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/commerce"
                        element={
                          <ProtectedRoute>
                            <Commerce />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/validation"
                        element={
                          <ProtectedRoute>
                            <EmailValidation />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/collaboration"
                        element={
                          <ProtectedRoute permission="team:manage">
                            <Collaboration />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/integrations"
                        element={
                          <ProtectedRoute permission="integration:manage">
                            <Integrations />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/integrations/shopify"
                        element={
                          <ProtectedRoute permission="integration:manage">
                            <ShopifyIntegration />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/integrations/woocommerce"
                        element={
                          <ProtectedRoute permission="integration:manage">
                            <WooCommerceIntegration />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/integrations/hubspot"
                        element={
                          <ProtectedRoute permission="integration:manage">
                            <HubSpotIntegration />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/integrations/zapier"
                        element={
                          <ProtectedRoute permission="integration:manage">
                            <ZapierIntegration />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/integrations/twilio"
                        element={
                          <ProtectedRoute permission="integration:manage">
                            <TwilioIntegration />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/integrations/whatsapp"
                        element={
                          <ProtectedRoute permission="integration:manage">
                            <WhatsAppIntegration />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/templates"
                        element={
                          <ProtectedRoute>
                            <Templates />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/visual-studio"
                        element={
                          <ProtectedRoute>
                            <VisualStudio />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/reports"
                        element={
                          <ProtectedRoute permission="report:view">
                            <Reports />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/infrastructure"
                        element={
                          <ProtectedRoute permission="infrastructure:manage">
                            <Infrastructure />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/data-layer"
                        element={
                          <ProtectedRoute permission="infrastructure:manage">
                            <DataLayer />
                          </ProtectedRoute>
                        }
                      />
                      <Route path="/dispatch/:id" element={<DispatchView />} />
                      <Route path="/preferences" element={<PreferenceCenter />} />
                      <Route path="/preferences/:token" element={<PreferenceCenter />} />
                      <Route path="/unsubscribe" element={<Unsubscribe />} />
                      <Route path="/unsubscribe/:token" element={<Unsubscribe />} />
                      <Route path="/privacy" element={<PrivacyPolicy />} />
                      <Route path="/kvkk" element={<PrivacyPolicy />} />
                      <Route path="*" element={<Navigate to="/" />} />
                    </Routes>
                  </Suspense>
                </motion.div>
              </AnimatePresence>
            </div>

            {user && !isPublicRoute && (
              <footer className="max-w-[1600px] mx-auto px-6 sm:px-10 py-12 mt-12 border-t border-border-hairline flex flex-col sm:flex-row justify-between items-center gap-6 text-[10px] font-mono text-ink/40 uppercase tracking-widest text-center sm:text-left">
                <div>{t("footer.rights")}</div>
                <div className="flex flex-wrap justify-center sm:justify-end gap-4 sm:gap-8">
                  <button
                    onClick={() => alert("SIGNAL Terms of Service: All rights reserved.")}
                    className="hover:text-burgundy transition-colors cursor-pointer"
                  >
                    {t("footer.terms")}
                  </button>
                  <button
                    onClick={() =>
                      alert(
                        "SIGNAL Privacy Notice: Consent and data-rights tools are available; legal acceptance is pending."
                      )
                    }
                    className="hover:text-burgundy transition-colors cursor-pointer"
                  >
                    {t("footer.privacy")}
                  </button>
                  <a
                    href="/health"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-burgundy transition-colors"
                  >
                    {t("footer.systemStatus")}
                  </a>
                </div>
              </footer>
            )}
          </main>
        </div>

        {isGuideOpen && (
          <Suspense fallback={null}>
            <UserGuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
          </Suspense>
        )}
      </div>
    </MotionConfig>
  );
}

{
  /* <label></label><label></label><label></label><label></label><label></label><label></label><label></label><label></label><label></label><label></label> */
}
