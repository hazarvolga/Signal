import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as d3 from 'd3';
import { BrowserRouter, Routes, Route, Link, useLocation, useParams, Navigate, useSearchParams, useNavigate } from 'react-router-dom';
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
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
import * as dagre from 'dagre';
import { api } from './services/api';
import { geminiService } from './services/geminiService';
import { User, Contact, Template, Campaign, DashboardStats, Segment, CustomFieldDefinition, Flow, Event, Tag } from './types';
import { format } from 'date-fns';
import { fromZonedTime, formatInTimeZone } from 'date-fns-tz';
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
  Cell
} from 'recharts';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Papa from 'papaparse';
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
  Panel
} from 'reactflow';

import { useAuth, Permission } from './hooks/useAuth';
import { EmailValidation } from './components/EmailValidation';
import { useCollaboration } from './services/collaborationContext';
import { HelpTooltip } from './components/HelpTooltip';
import { UserGuideModal } from './components/UserGuide';
import { BookOpen } from 'lucide-react';

// --- Utils ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const ProtectedRoute = ({ 
  children, 
  permission 
}: { 
  children: React.ReactNode, 
  permission?: Permission 
}) => {
  const { user, loading, hasPermission } = useAuth();
  
  if (loading) return <div className="p-20 text-center font-editorial italic text-3xl">Loading dispatch...</div>;
  if (!user) return <Navigate to="/" />;
  if (permission && !hasPermission(permission)) return <Navigate to="/" />;
  
  return <>{children}</>;
};

// --- Components ---

const Masthead = ({ onOpenGuide, theme, toggleTheme }: { onOpenGuide: () => void, theme: 'light' | 'dark', toggleTheme: () => void }) => {
  const { user } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navLinks = [
    { to: "/campaigns", label: "Campaigns" },
    { to: "/audiences", label: "Audiences" },
    { to: "/automations", label: "Automations" },
    { to: "/media", label: "Media" },
    { to: "/commerce", label: "Commerce" },
    { to: "/validation", label: "Validation" },
    { to: "/collaboration", label: "Collaboration" },
    { to: "/integrations", label: "Integrations" },
    { to: "/reports", label: "Reports" },
    { to: "/templates", label: "Templates" },
    { to: "/visual-studio", label: "Visual Studio" },
    { to: "/infrastructure", label: "Infrastructure" },
  ];
  
  return (
    <header className="bg-surface border-b-2 border-burgundy sticky top-0 z-50">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 h-20 flex items-center justify-between">
        <div className="flex items-center gap-4 lg:gap-12">
          {/* Mobile Menu Toggle */}
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="2xl:hidden p-2 text-ink/60 hover:text-burgundy transition-colors"
            aria-label="Toggle Menu"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          <Link to="/" className="text-2xl sm:text-3xl lg:text-4xl font-serif font-black tracking-tighter text-ink shrink-0">
            SIGNAL<span className="text-burgundy">.</span>
          </Link>
          
          <nav className="hidden 2xl:flex items-center gap-4">
            {navLinks.map(link => (
              <Link 
                key={link.to}
                to={link.to} 
                className={cn("masthead-link whitespace-nowrap", location.pathname.startsWith(link.to) && "active")}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-6">
          <button 
            onClick={toggleTheme}
            className="p-2 text-ink/60 hover:text-burgundy transition-colors rounded-full hover:bg-burgundy/5"
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>

          <button 
            onClick={onOpenGuide}
            className="hidden sm:flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-burgundy hover:bg-burgundy/5 px-3 py-2 rounded transition-all border border-burgundy/20"
          >
            <BookOpen size={14} />
            <span>Guide</span>
          </button>
          
          <div className="hidden 2xl:flex items-center gap-2 px-3 py-1.5 bg-surface border border-border-hairline rounded text-[10px] font-mono text-ink/40">
            <Search size={12} />
            <span>CMD + K TO SEARCH</span>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4 border-l border-border-hairline pl-4 sm:pl-6">
            <button className="text-ink/60 hover:text-burgundy transition-colors">
              <Bell size={20} />
            </button>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-[10px] font-black uppercase tracking-widest text-ink">{user?.name || 'Loading...'}</p>
                <div className="flex items-center justify-end gap-1">
                  <span className="px-1 bg-burgundy/10 text-burgundy text-[7px] font-mono font-bold rounded uppercase">
                    {user?.role}
                  </span>
                  <p className="text-[9px] font-mono text-ink/40 uppercase">{user?.organization?.name || 'SIGNAL'}</p>
                </div>
              </div>
              <div className="w-8 h-8 bg-surface border border-border-hairline flex items-center justify-center text-burgundy">
                <UserIcon size={16} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="2xl:hidden absolute top-20 left-0 w-full bg-surface border-b-2 border-burgundy shadow-2xl z-40 overflow-y-auto max-h-[calc(100vh-80px)]"
          >
            <nav className="flex flex-col p-6 gap-2">
              {navLinks.map(link => (
                <Link 
                  key={link.to}
                  to={link.to} 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "text-lg font-serif font-bold p-4 border border-border-hairline hover:bg-burgundy/5 transition-colors flex justify-between items-center",
                    location.pathname.startsWith(link.to) ? "text-burgundy bg-burgundy/5 border-burgundy/20" : "text-ink/60"
                  )}
                >
                  {link.label}
                  <ChevronRight size={16} className={cn(location.pathname.startsWith(link.to) ? "opacity-100" : "opacity-20")} />
                </Link>
              ))}
              <div className="mt-4 p-4 border-t border-border-hairline flex flex-col gap-4">
                <button 
                  onClick={() => { onOpenGuide(); setIsMobileMenuOpen(false); }}
                  className="flex items-center gap-3 text-xs font-black uppercase tracking-widest text-burgundy"
                >
                  <BookOpen size={16} />
                  <span>Open Documentation Guide</span>
                </button>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
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

    const svg = d3.select(svgRef.current)
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleTime()
      .domain(d3.extent(data, d => d.date) as [Date, Date])
      .range([0, width]);

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.subscribers) as number])
      .range([height, 0]);

    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(6).tickFormat(d3.timeFormat("%b") as any))
      .attr("font-family", "JetBrains Mono")
      .attr("font-size", "10px");

    svg.append("g")
      .call(d3.axisLeft(y).ticks(5))
      .attr("font-family", "JetBrains Mono")
      .attr("font-size", "10px");

    const line = d3.line<any>()
      .x(d => x(d.date))
      .y(d => y(d.subscribers))
      .curve(d3.curveMonotoneX);

    svg.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "#8B1A1A")
      .attr("stroke-width", 2)
      .attr("d", line);

    svg.selectAll(".dot")
      .data(data)
      .enter().append("circle")
      .attr("class", "dot")
      .attr("cx", d => x(d.date))
      .attr("cy", d => y(d.subscribers))
      .attr("r", 4)
      .attr("fill", "#8B1A1A")
      .attr("stroke", "#F5F2EC")
      .attr("stroke-width", 2);

  }, []);

  return (
    <div className="bg-surface border border-border-hairline p-8 space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-burgundy mb-2">Advanced Audience Health</p>
          <h3 className="text-3xl font-serif font-bold">Growth Velocity</h3>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black uppercase tracking-widest text-ink/40">Retention Rate</p>
          <p className="text-2xl font-editorial italic">94.2%</p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <svg ref={svgRef}></svg>
      </div>
      <div className="grid grid-cols-3 gap-8 pt-6 border-t border-border-hairline">
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-ink/40 mb-1">Acquisition</p>
          <p className="text-lg font-bold">+240 <span className="text-[10px] text-status-success">↑</span></p>
        </div>
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-ink/40 mb-1">Churn Rate</p>
          <p className="text-lg font-bold">1.2% <span className="text-[10px] text-status-success">↓</span></p>
        </div>
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-ink/40 mb-1">LTV (Est.)</p>
          <p className="text-lg font-bold">$142.00</p>
        </div>
      </div>
    </div>
  );
};

const SectionHeader = ({ title, subtitle, action, guideKey }: { title: string, subtitle?: string, action?: React.ReactNode, guideKey?: string }) => (
  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end border-b border-border-hairline pb-4 mb-8 gap-4">
    <div>
      <div className="flex items-center gap-3 mb-2">
        <h1 className="text-3xl sm:text-5xl font-serif font-bold text-ink leading-tight">{title}</h1>
        {guideKey && <HelpTooltip guideKey={guideKey} />}
      </div>
      {subtitle && <p className="text-base sm:text-lg font-editorial italic text-ink/60">{subtitle}</p>}
    </div>
    {action && <div className="flex shrink-0">{action}</div>}
  </div>
);

const MetricBlock = ({ label, value, delta, deltaType }: { label: string, value: string | number, delta?: string, deltaType?: 'up' | 'down' }) => (
  <div className="space-y-2">
    <p className="metric-label">{label}</p>
    <div className="flex items-baseline gap-3">
      <p className="metric-value">{value}</p>
      {delta && (
        <span className={cn(
          "metric-delta flex items-center gap-0.5",
          deltaType === 'up' ? "text-status-success" : "text-burgundy"
        )}>
          {deltaType === 'up' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {delta}
        </span>
      )}
    </div>
  </div>
);

// --- Pages ---

const Commerce = () => {
  const { hasPermission } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [revenue, setRevenue] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    api.getProducts().then(setProducts);
    api.getRevenueSummary().then(res => setRevenue(res.totalRevenue));
  }, []);

  const handleSync = async () => {
    if (!hasPermission('integration:manage')) return;
    setIsSyncing(true);
    await api.syncProducts();
    const updated = await api.getProducts();
    setProducts(updated);
    setIsSyncing(false);
  };

  return (
    <div className="space-y-12">
      <SectionHeader 
        title="Commerce & Revenue" 
        subtitle="Monetize your editorial dispatches with integrated product feeds."
        guideKey="commerce-revenue"
        action={
          hasPermission('integration:manage') && (
            <button 
              onClick={handleSync}
              disabled={isSyncing}
              className="btn-primary flex items-center gap-2"
            >
              <RefreshCw size={16} className={cn(isSyncing && "animate-spin")} />
              {isSyncing ? "Syncing..." : "Sync Product Feed"}
            </button>
          )
        }
      />

      <div className="newspaper-grid border-b border-border-hairline pb-12">
        <div className="col-span-12 lg:col-span-4">
          <MetricBlock label="Total Revenue" value={`$${revenue.toLocaleString()}`} delta="18% vs last month" deltaType="up" />
        </div>
        <div className="col-span-12 lg:col-span-4">
          <MetricBlock label="Campaign ROI" value="4.2x" delta="0.5x" deltaType="up" />
        </div>
        <div className="col-span-12 lg:col-span-4">
          <MetricBlock label="Avg. Order Value" value="$84.50" />
        </div>
      </div>

      <div className="grid grid-cols-12 gap-12">
        <div className="col-span-12 lg:col-span-8 space-y-8">
          <h3 className="text-2xl font-serif font-bold text-ink">Product Feed</h3>
          <div className="border border-border-hairline divide-y divide-border-hairline">
            {products.length === 0 ? (
              <div className="p-12 text-center font-editorial italic text-ink/40">No products synced yet.</div>
            ) : (
              products.map(product => (
                <div key={product.id} className="p-6 flex items-center justify-between hover:bg-surface transition-colors group">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-surface border border-border-hairline flex items-center justify-center text-ink/20">
                      {product.imageUrl ? <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" /> : <Package size={24} />}
                    </div>
                    <div>
                      <p className="text-sm font-black uppercase tracking-widest text-ink">{product.name}</p>
                      <p className="text-[10px] font-mono text-ink/40 uppercase">{product.source} • {product.externalId}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-serif font-bold text-ink">${product.price.toFixed(2)}</p>
                    <button className="text-[9px] font-mono text-burgundy uppercase font-bold opacity-0 group-hover:opacity-100 transition-opacity">Insert into Campaign</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4 space-y-8">
          <h3 className="text-2xl font-serif font-bold text-ink">Revenue Attribution</h3>
          <div className="bg-surface border border-border-hairline p-8 space-y-6">
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <p className="text-[10px] font-black uppercase tracking-widest text-ink/60">Campaign Revenue</p>
                <p className="text-xl font-serif font-bold text-ink">$12,450</p>
              </div>
              <div className="w-full bg-bg h-1">
                <div className="bg-burgundy h-full" style={{ width: '75%' }}></div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <p className="text-[10px] font-black uppercase tracking-widest text-ink/60">Automation Revenue</p>
                <p className="text-xl font-serif font-bold text-ink">$4,120</p>
              </div>
              <div className="w-full bg-bg h-1">
                <div className="bg-burgundy h-full" style={{ width: '25%' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        <h3 className="text-2xl font-serif font-bold text-ink">Dynamic Product Blocks</h3>
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-4 bg-surface border border-border-hairline p-8 space-y-6">
            <div className="flex justify-between items-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-ink/40">Block Preview</p>
              <span className="px-2 py-0.5 bg-burgundy text-white text-[8px] font-black uppercase tracking-widest">Live</span>
            </div>
            <div className="bg-bg p-6 border border-border-hairline space-y-4">
              <div className="aspect-square bg-surface border border-border-hairline flex items-center justify-center text-ink/10">
                <ShoppingBag size={48} />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-black uppercase tracking-widest text-ink">Product Name</p>
                <p className="text-xs font-serif font-bold text-burgundy">$0.00</p>
              </div>
              <button className="w-full py-2 bg-ink text-white text-[9px] font-black uppercase tracking-widest">Shop Now</button>
            </div>
          </div>
          <div className="col-span-12 lg:col-span-8 bg-surface border border-border-hairline p-12 flex flex-col items-center justify-center text-center space-y-6">
            <Zap size={48} className="text-burgundy/20" />
            <div>
              <p className="text-lg font-serif font-bold text-ink">Intelligent Product Recommendations</p>
              <p className="text-sm font-editorial italic text-ink/60 max-w-md mx-auto">Automatically insert products into your dispatches based on recipient engagement and purchase history.</p>
            </div>
            <div className="flex gap-4">
              <button className="btn-primary py-2 px-6">Configure Logic</button>
              <button className="py-2 px-6 border border-border-hairline text-[10px] font-black uppercase tracking-widest text-ink/60 hover:bg-bg transition-colors">View Documentation</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Collaboration = () => {
  const { hasPermission, user: currentUser } = useAuth();
  const { activeUsers, cursors, activities, activityLog, joinRoom, leaveRoom, sendCursorMove, sendActivity } = useCollaboration();
  const [team, setTeam] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [isAddingRole, setIsAddingRole] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [newRole, setNewRole] = useState({ name: '', permissions: [] as string[] });
  const [inviteData, setInviteData] = useState({ email: '', name: '', role: 'VIEWER' });

  useEffect(() => {
    refreshData();
    joinRoom('collaboration-hub');
    return () => leaveRoom('collaboration-hub');
  }, [joinRoom, leaveRoom]);

  const handleMouseMove = (e: React.MouseEvent) => {
    sendCursorMove('collaboration-hub', { x: e.clientX, y: e.clientY });
  };

  const refreshData = () => {
    api.getTeam().then(setTeam);
    api.getBrands().then(setBrands);
    api.getApprovals().then(setApprovals);
    api.getRoles().then(setRoles);
  };

  const handleApproval = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    if (!hasPermission('campaign:send')) return;
    await api.updateApprovalStatus(id, status);
    sendActivity('collaboration-hub', `${status === 'APPROVED' ? 'approved' : 'rejected'} a request`);
    api.getApprovals().then(setApprovals);
  };

  const handleAddRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasPermission('team:manage')) return;
    await api.addRole(newRole);
    sendActivity('collaboration-hub', `created a new role: ${newRole.name}`);
    api.getRoles().then(setRoles);
    setIsAddingRole(false);
    setNewRole({ name: '', permissions: [] });
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasPermission('team:manage')) return;
    await api.inviteTeamMember(inviteData);
    sendActivity('collaboration-hub', `invited ${inviteData.name} to the team`);
    refreshData();
    setIsInviting(false);
    setInviteData({ email: '', name: '', role: 'VIEWER' });
  };

  const handleUpdateRole = async (userId: string, role: string) => {
    if (!hasPermission('team:manage')) return;
    await api.updateTeamMember(userId, { role });
    sendActivity('collaboration-hub', `updated a team member's role to ${role}`);
    refreshData();
  };

  const handleDeleteMember = async (userId: string) => {
    if (!hasPermission('team:manage')) return;
    if (window.confirm("Are you sure you want to remove this team member?")) {
      const res = await api.deleteTeamMember(userId);
      if (res.success) {
        sendActivity('collaboration-hub', `removed a member from the team`);
        refreshData();
      } else {
        alert("Failed to delete member. Ensure they are not the last owner.");
      }
    }
  };

  const permissionOptions = [
    { key: 'campaign:edit', label: 'Edit Campaigns' },
    { key: 'campaign:send', label: 'Send Campaigns' },
    { key: 'template:edit', label: 'Edit Templates' },
    { key: 'contact:edit', label: 'Manage Contacts' },
    { key: 'automation:edit', label: 'Manage Automations' },
    { key: 'report:view', label: 'View Reports' },
  ];

  const pendingApprovals = approvals.filter(a => a.status === 'PENDING');

  return (
    <div className="space-y-16 relative" onMouseMove={handleMouseMove}>
      {/* Real-time Cursors */}
      <AnimatePresence>
        {Object.entries(cursors).map(([socketId, data]: [string, any]) => (
          <motion.div
            key={socketId}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed pointer-events-none z-[100] flex flex-col items-center"
            style={{ left: data.position.x, top: data.position.y }}
          >
            <MousePointerClick size={16} className="text-burgundy fill-burgundy" />
            <span className="bg-burgundy text-white text-[8px] font-black px-1 rounded whitespace-nowrap">
              {data.user?.name || 'Collaborator'}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>

      <SectionHeader 
        title="Collaboration & Enterprise" 
        subtitle="Manage your editorial team and multi-brand infrastructure."
        guideKey="collaboration-team"
        action={
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {activeUsers.map((u: any, i: number) => (
                <div 
                  key={u.id || i} 
                  className="w-8 h-8 rounded-full bg-burgundy border-2 border-surface flex items-center justify-center text-white text-[10px] font-bold uppercase"
                  title={u.name}
                >
                  {u.name?.[0] || '?'}
                </div>
              ))}
            </div>
            <span className="text-[10px] font-mono text-ink/40 uppercase ml-2">
              {activeUsers.length} Active Now
            </span>
          </div>
        }
      />

      <div className="grid grid-cols-12 gap-12">
        <div className="col-span-12 lg:col-span-7 space-y-12">
          {/* Activity Log */}
          <div className="bg-surface border border-border-hairline p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-black uppercase tracking-widest text-ink">Live Activity Feed</h3>
              <Activity size={14} className="text-burgundy animate-pulse" />
            </div>
            <div className="space-y-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
              {activityLog.length === 0 ? (
                <p className="text-xs font-editorial italic text-ink/40">No recent activity.</p>
              ) : (
                activityLog.map((log: any) => (
                  <div key={log.id} className="flex items-start gap-3 text-[11px]">
                    <span className="text-burgundy font-bold">[{format(new Date(log.timestamp), 'HH:mm:ss')}]</span>
                    <span className="font-black uppercase">{log.user?.name}</span>
                    <span className="text-ink/60">{log.activity}</span>
                  </div>
                ))
              )}
            </div>
          </div>
          {/* Team Management */}
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-serif font-bold text-ink">Team Management</h3>
              <button 
                onClick={() => setIsInviting(true)}
                className="btn-primary py-2 px-4 text-[10px]"
              >
                Invite Member
              </button>
            </div>
            <div className="border border-border-hairline divide-y divide-border-hairline">
              {team.map(member => (
                <div key={member.id} className="p-6 flex items-center justify-between hover:bg-surface transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-burgundy/10 text-burgundy flex items-center justify-center rounded-full font-serif font-bold">
                      {member.name[0]}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-black uppercase tracking-widest text-ink">{member.name}</p>
                        {member.status === 'PENDING' && (
                          <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[8px] font-black uppercase tracking-widest rounded">Pending</span>
                        )}
                      </div>
                      <p className="text-[10px] font-mono text-ink/40 uppercase">{member.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {member.status === 'PENDING' && (
                      <button 
                        onClick={async () => {
                          await api.activateUser(member.id);
                          refreshData();
                        }}
                        className="text-[9px] font-black uppercase tracking-widest text-burgundy border border-burgundy px-2 py-1 hover:bg-burgundy hover:text-white transition-all"
                      >
                        Activate
                      </button>
                    )}
                    <select 
                      value={member.role}
                      onChange={(e) => handleUpdateRole(member.id, e.target.value)}
                      className="bg-surface border border-border-hairline text-[9px] font-mono text-ink/60 uppercase rounded px-2 py-1 outline-none focus:border-burgundy"
                    >
                      <option value="OWNER">OWNER</option>
                      <option value="ADMIN">ADMIN</option>
                      <option value="EDITOR">EDITOR</option>
                      <option value="ANALYST">ANALYST</option>
                      <option value="VIEWER">VIEWER</option>
                    </select>
                    <button 
                      onClick={() => handleDeleteMember(member.id)}
                      className="text-ink/40 hover:text-burgundy transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Custom Roles */}
          <div className="space-y-8">
            <div className="flex justify-between items-center border-b border-ink pb-2">
              <h3 className="text-2xl font-serif font-bold text-ink">Custom Roles</h3>
              <button 
                onClick={() => setIsAddingRole(true)}
                className="text-[10px] font-black uppercase text-burgundy hover:underline flex items-center gap-1"
              >
                <Plus size={12} /> Create Role
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {roles.map(role => (
                <div key={role.id} className="bg-surface border border-border-hairline p-6 space-y-4 group hover:border-burgundy transition-all">
                  <div className="flex justify-between items-start">
                    <h4 className="font-serif text-lg font-bold">{role.name}</h4>
                    <Settings size={14} className="text-ink/20 group-hover:text-burgundy transition-colors" />
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {JSON.parse(role.permissions).map((p: string) => (
                      <span key={p} className="px-1.5 py-0.5 bg-bg border border-border-hairline text-[8px] font-black uppercase tracking-widest text-ink/60">
                        {p.replace(':', ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
              {roles.length === 0 && (
                <div className="col-span-2 p-12 bg-surface border border-dashed border-border-hairline text-center">
                  <p className="text-xs font-editorial italic text-ink/40">No custom roles defined. Use roles to define granular permissions.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-5 space-y-12">
          {/* Brand Kits */}
          <div className="space-y-8">
            <h3 className="text-2xl font-serif font-bold text-ink">Brand Kits</h3>
            <div className="space-y-6">
              <div className="bg-surface border border-border-hairline p-8 space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-ink flex items-center justify-center text-white font-serif font-black text-xl">S</div>
                  <div>
                    <p className="text-sm font-black uppercase tracking-widest text-ink">SIGNAL Main</p>
                    <p className="text-[10px] font-mono text-ink/40 uppercase">Primary Workspace</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="w-8 h-8 bg-burgundy rounded border border-border-hairline"></div>
                  <div className="w-8 h-8 bg-ink rounded border border-border-hairline"></div>
                  <div className="w-8 h-8 bg-bg rounded border border-border-hairline"></div>
                </div>
                <button className="w-full py-3 border border-border-hairline text-[10px] font-black uppercase tracking-widest text-ink/60 hover:bg-bg transition-colors">Edit Brand Kit</button>
              </div>
              <button className="w-full py-4 border-2 border-dashed border-border-hairline text-[10px] font-black uppercase tracking-widest text-ink/40 hover:border-burgundy hover:text-burgundy transition-all flex items-center justify-center gap-2">
                <Plus size={14} /> Add New Brand
              </button>
            </div>
          </div>

          {/* Governance */}
          <div className="space-y-8">
            <h3 className="text-2xl font-serif font-bold text-ink">Governance & Approvals</h3>
            <div className="bg-surface border border-border-hairline p-6 space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-ink/40">Pending Review</p>
                <span className="text-[10px] font-mono text-burgundy font-bold">{pendingApprovals.length} PENDING</span>
              </div>
              <div className="space-y-3">
                {pendingApprovals.length === 0 ? (
                  <p className="text-xs font-editorial italic text-ink/40 py-4 text-center">No pending approvals.</p>
                ) : (
                  pendingApprovals.map(approval => (
                    <div key={approval.id} className="p-4 bg-bg border border-border-hairline space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-burgundy">
                            {approval.templateId ? 'Template' : 'Campaign'}
                          </p>
                          <p className="text-sm font-bold text-ink uppercase">
                            {approval.template?.name || approval.campaign?.name}
                          </p>
                          <p className="text-[9px] font-mono text-ink/40 uppercase mt-1">
                            Requested by {approval.requesterId} • {format(new Date(approval.createdAt), 'MMM d, HH:mm')}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-2 border-t border-border-hairline">
                        <button 
                          onClick={() => handleApproval(approval.id, 'APPROVED')}
                          className="flex-1 py-1.5 bg-ink text-white text-[9px] font-black uppercase tracking-widest hover:bg-ink/80 transition-colors"
                        >
                          Approve
                        </button>
                        <button 
                          onClick={() => handleApproval(approval.id, 'REJECTED')}
                          className="flex-1 py-1.5 border border-border-hairline text-[9px] font-black uppercase tracking-widest hover:bg-bg transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Role Modal */}
      <AnimatePresence>
        {isAddingRole && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-10 bg-ink/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-bg border border-ink w-full max-w-md p-8 shadow-2xl space-y-6"
            >
              <div className="flex justify-between items-center border-b border-border-hairline pb-4">
                <h2 className="font-serif text-2xl font-bold text-ink">Define Custom Role</h2>
                <button onClick={() => setIsAddingRole(false)} className="text-ink/40 hover:text-burgundy">✕</button>
              </div>

              <form onSubmit={handleAddRole} className="space-y-6">
                <div className="space-y-1">
                  <label className="metric-label">Role Name</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Content Editor"
                    className="w-full bg-transparent border-b border-border-hairline py-1 font-sans font-bold text-sm outline-none focus:border-burgundy"
                    value={newRole.name}
                    onChange={e => setNewRole({...newRole, name: e.target.value})}
                  />
                </div>

                <div className="space-y-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-ink/40">Permissions</p>
                  <div className="grid grid-cols-2 gap-3">
                    {permissionOptions.map(opt => (
                      <label key={opt.key} className="flex items-center gap-2 cursor-pointer group">
                        <input 
                          type="checkbox" 
                          className="accent-burgundy"
                          checked={newRole.permissions.includes(opt.key)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewRole({...newRole, permissions: [...newRole.permissions, opt.key]});
                            } else {
                              setNewRole({...newRole, permissions: newRole.permissions.filter(k => k !== opt.key)});
                            }
                          }}
                        />
                        <span className="text-xs font-medium group-hover:text-burgundy transition-colors">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="pt-4 flex gap-4">
                  <button type="submit" className="btn-primary flex-1 py-3">Create Role</button>
                  <button type="button" onClick={() => setIsAddingRole(false)} className="flex-1 py-3 font-sans font-black uppercase tracking-widest text-[10px] border border-border-hairline">Cancel</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Invite Modal */}
      <AnimatePresence>
        {isInviting && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-10 bg-ink/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-bg border border-ink w-full max-w-md p-8 shadow-2xl space-y-6"
            >
              <div className="flex justify-between items-center border-b border-border-hairline pb-4">
                <h2 className="font-serif text-2xl font-bold text-ink">Invite Team Member</h2>
                <button onClick={() => setIsInviting(false)} className="text-ink/40 hover:text-burgundy">✕</button>
              </div>

              <form onSubmit={handleInvite} className="space-y-6">
                <div className="space-y-1">
                  <label className="metric-label">Full Name</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Jane Doe"
                    className="w-full bg-transparent border-b border-border-hairline py-1 font-sans font-bold text-sm outline-none focus:border-burgundy"
                    value={inviteData.name}
                    onChange={e => setInviteData({...inviteData, name: e.target.value})}
                  />
                </div>

                <div className="space-y-1">
                  <label className="metric-label">Email Address</label>
                  <input 
                    type="email" 
                    required
                    placeholder="jane@example.com"
                    className="w-full bg-transparent border-b border-border-hairline py-1 font-sans font-bold text-sm outline-none focus:border-burgundy"
                    value={inviteData.email}
                    onChange={e => setInviteData({...inviteData, email: e.target.value})}
                  />
                </div>

                <div className="space-y-1">
                  <label className="metric-label">Initial Role</label>
                  <select 
                    className="w-full bg-transparent border-b border-border-hairline py-1 font-sans font-bold text-sm outline-none focus:border-burgundy"
                    value={inviteData.role}
                    onChange={e => setInviteData({...inviteData, role: e.target.value})}
                  >
                    <option value="OWNER">OWNER</option>
                    <option value="ADMIN">ADMIN</option>
                    <option value="EDITOR">EDITOR</option>
                    <option value="ANALYST">ANALYST</option>
                    <option value="VIEWER">VIEWER</option>
                  </select>
                </div>

                <div className="pt-4 flex gap-4">
                  <button type="submit" className="btn-primary flex-1 py-3">Send Invitation</button>
                  <button type="button" onClick={() => setIsInviting(false)} className="flex-1 py-3 font-sans font-black uppercase tracking-widest text-[10px] border border-border-hairline">Cancel</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Integrations = () => {
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [isAddingWebhook, setIsAddingWebhook] = useState(false);
  const [newWebhook, setNewWebhook] = useState({ url: '', events: [] as string[] });
  const [channels, setChannels] = useState([
    { id: 'sms', name: 'SMS (Twilio)', icon: <Smartphone size={24} />, apiKey: '', status: 'Disconnected' },
    { id: 'whatsapp', name: 'WhatsApp (Meta)', icon: <Link2 size={24} />, apiKey: '', status: 'Disconnected' },
  ]);

  const handleUpdateChannel = (id: string, key: string) => {
    setChannels(prev => prev.map(c => c.id === id ? { ...c, apiKey: key, status: key ? 'Connected' : 'Disconnected' } : c));
  };

  const availableEvents = [
    'contact.created',
    'contact.unsubscribed',
    'campaign.sent',
    'campaign.opened',
    'campaign.clicked',
    'order.placed',
    'stock.updated'
  ];

  useEffect(() => {
    api.getIntegrations().then(setIntegrations);
    api.getWebhooks().then(setWebhooks);
  }, []);

  const handleAddWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWebhook.url || newWebhook.events.length === 0) return;
    await api.addWebhook(newWebhook);
    setIsAddingWebhook(false);
    setNewWebhook({ url: '', events: [] });
    api.getWebhooks().then(setWebhooks);
  };

  const handleDeleteWebhook = async (id: string) => {
    if (confirm("Delete this webhook?")) {
      await api.deleteWebhook(id);
      api.getWebhooks().then(setWebhooks);
    }
  };

  const toggleEvent = (event: string) => {
    setNewWebhook(prev => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter(e => e !== event)
        : [...prev.events, event]
    }));
  };

  const marketplace = [
    { id: 'shopify', name: 'Shopify', desc: 'Sync products and customers.', icon: <ShoppingBag size={24} />, status: 'Connected' },
    { id: 'hubspot', name: 'HubSpot', desc: 'Two-way CRM sync.', icon: <Users2 size={24} />, status: 'Connect' },
    { id: 'zapier', name: 'Zapier', desc: 'Connect to 5,000+ apps.', icon: <Zap size={24} />, status: 'Connect' },
    { id: 'woo', name: 'WooCommerce', desc: 'E-commerce integration.', icon: <ShoppingBag size={24} />, status: 'Connect' },
  ];

  return (
    <div className="space-y-16">
      <SectionHeader 
        title="Integration & API" 
        subtitle="Extend SIGNAL with your existing stack and custom hooks."
        guideKey="integrations-api"
      />

      <div className="grid grid-cols-12 gap-12">
        <div className="col-span-12 lg:col-span-8 space-y-12">
          <div className="space-y-8">
            <h3 className="text-2xl font-serif font-bold text-ink">Channel Connections</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {channels.map(channel => (
                <div key={channel.id} className="bg-surface border border-border-hairline p-8 space-y-6">
                  <div className="flex justify-between items-start">
                    <div className="w-12 h-12 bg-bg border border-border-hairline flex items-center justify-center text-ink/60">
                      {channel.icon}
                    </div>
                    <span className={cn(
                      "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 border",
                      channel.status === 'Connected' ? "border-status-success text-status-success bg-status-success/5" : "border-border-hairline text-ink/40"
                    )}>
                      {channel.status}
                    </span>
                  </div>
                  <div className="space-y-4">
                    <p className="text-sm font-black uppercase tracking-widest text-ink">{channel.name}</p>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-ink/40">API Key / Token</label>
                      <input 
                        type="password"
                        placeholder="••••••••••••••••"
                        className="w-full bg-bg border border-border-hairline p-3 font-mono text-xs focus:border-burgundy outline-none"
                        value={channel.apiKey}
                        onChange={(e) => handleUpdateChannel(channel.id, e.target.value)}
                      />
                    </div>
                    <button className="w-full py-3 bg-ink text-white text-[10px] font-black uppercase tracking-widest hover:bg-burgundy transition-all">
                      Save Configuration
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-8">
            <h3 className="text-2xl font-serif font-bold text-ink">Integrations Marketplace</h3>
            <div className="grid grid-cols-12 gap-6">
              {marketplace.map(item => (
                <div key={item.id} className="col-span-12 md:col-span-6 bg-surface border border-border-hairline p-8 space-y-6 hover:border-burgundy transition-colors group">
                  <div className="flex justify-between items-center">
                    <div className="w-12 h-12 bg-bg border border-border-hairline flex items-center justify-center text-ink/60 group-hover:text-burgundy transition-colors">
                      {item.icon}
                    </div>
                    <button className={cn(
                      "px-4 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all",
                      item.status === 'Connected' ? "bg-status-success/10 text-status-success border border-status-success/20" : "border border-border-hairline text-ink/60 hover:bg-bg"
                    )}>
                      {item.status}
                    </button>
                  </div>
                  <div>
                    <p className="text-sm font-black uppercase tracking-widest text-ink">{item.name}</p>
                    <p className="text-[11px] font-editorial italic text-ink/60 mt-1">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4 space-y-8">
          <div className="flex justify-between items-center">
            <h3 className="text-2xl font-serif font-bold text-ink">Webhooks</h3>
            <button 
              onClick={() => setIsAddingWebhook(true)}
              className="btn-primary py-2 px-4 text-[10px]"
            >
              Add Webhook
            </button>
          </div>

          <AnimatePresence>
            {isAddingWebhook && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-bg border border-border-hairline p-6 space-y-6 overflow-hidden"
              >
                <form onSubmit={handleAddWebhook} className="space-y-6">
                  <div className="space-y-2">
                    <label className="metric-label">Target URL</label>
                    <input 
                      type="url"
                      required
                      placeholder="https://your-api.com/webhook"
                      className="w-full bg-transparent border-b border-border-hairline py-2 font-mono text-xs focus:border-burgundy outline-none"
                      value={newWebhook.url}
                      onChange={e => setNewWebhook({ ...newWebhook, url: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="metric-label">Events to Subscribe</label>
                    <div className="flex flex-wrap gap-2">
                      {availableEvents.map(ev => (
                        <button
                          key={ev}
                          type="button"
                          onClick={() => toggleEvent(ev)}
                          className={cn(
                            "px-3 py-1 text-[9px] font-black uppercase tracking-widest border transition-all",
                            newWebhook.events.includes(ev) ? "bg-burgundy text-white border-burgundy" : "border-border-hairline text-ink/40 hover:border-burgundy hover:text-burgundy"
                          )}
                        >
                          {ev}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-4 pt-4">
                    <button type="submit" className="btn-primary py-2 px-6 text-[10px]">Create Webhook</button>
                    <button 
                      type="button" 
                      onClick={() => setIsAddingWebhook(false)}
                      className="text-[10px] font-black uppercase tracking-widest text-ink/40 hover:text-burgundy"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="border border-border-hairline divide-y divide-border-hairline">
            {webhooks.length === 0 ? (
              <div className="p-12 text-center font-editorial italic text-ink/40">No webhooks configured.</div>
            ) : (
              webhooks.map(hook => (
                <div key={hook.id} className="p-6 flex items-center justify-between hover:bg-surface transition-colors">
                  <div className="space-y-1">
                    <p className="text-xs font-mono font-bold text-ink">{hook.url}</p>
                    <p className="text-[9px] font-mono text-ink/40 uppercase">
                      Events: {typeof hook.events === 'string' ? JSON.parse(hook.events).join(', ') : hook.events.join(', ')}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={cn("w-2 h-2 rounded-full", hook.isActive ? "bg-status-success" : "bg-ink/20")}></span>
                    <button 
                      onClick={() => handleDeleteWebhook(hook.id)}
                      className="text-ink/40 hover:text-burgundy transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="col-span-12 lg:col-span-5 space-y-8">
          <h3 className="text-2xl font-serif font-bold text-ink">API Access</h3>
          <div className="bg-ink text-white p-8 space-y-6">
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Production API Key</p>
              <div className="flex items-center gap-3 bg-white/5 border border-white/10 p-3 font-mono text-xs">
                <Lock size={12} className="text-white/20" />
                <span className="flex-1 overflow-hidden text-ellipsis">sig_live_••••••••••••••••••••</span>
                <button className="text-white/40 hover:text-white transition-colors"><Eye size={14} /></button>
              </div>
            </div>
            <div className="space-y-4 pt-4 border-t border-white/10">
              <div className="flex justify-between text-[10px] font-mono text-white/40 uppercase">
                <span>Rate Limit</span>
                <span className="text-white">1,000 req/min</span>
              </div>
              <div className="flex justify-between text-[10px] font-mono text-white/40 uppercase">
                <span>Usage (24h)</span>
                <span className="text-white">452 requests</span>
              </div>
            </div>
            <button className="w-full py-3 bg-white text-ink text-[10px] font-black uppercase tracking-widest hover:bg-white/90 transition-colors">Generate New Key</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const MediaLibrary = () => {
  const [assets, setAssets] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    api.getAssets().then(setAssets);
  }, []);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await uploadFile(e.dataTransfer.files[0]);
    }
  };

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    // In a real app, we'd upload to S3/Cloudinary. 
    // Here we simulate by creating a local asset entry.
    const reader = new FileReader();
    reader.onloadend = async () => {
      const newAsset = await api.addAsset({
        name: file.name,
        url: reader.result as string,
        type: file.type.startsWith('image/') ? 'IMAGE' : 'FILE',
        metadata: { size: file.size, lastModified: file.lastModified }
      });
      setAssets(prev => [newAsset, ...prev]);
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Delete this asset permanently?")) {
      await api.deleteAsset(id);
      setAssets(prev => prev.filter(a => a.id !== id));
    }
  };

  return (
    <div className="space-y-16">
      <SectionHeader 
        title="Media Library" 
        subtitle="Centralized asset management for your editorial dispatches."
        guideKey="media-library"
      />

      <div 
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={cn(
          "border-2 border-dashed p-20 text-center transition-all group relative",
          dragActive ? "border-burgundy bg-burgundy/5" : "border-border-hairline hover:border-burgundy/40"
        )}
      >
        <div className="space-y-4">
          <div className="w-16 h-16 bg-surface border border-border-hairline flex items-center justify-center mx-auto text-ink/20 group-hover:text-burgundy transition-colors">
            {isUploading ? <Loader2 className="animate-spin" size={32} /> : <ImageIcon size={32} />}
          </div>
          <div className="space-y-2">
            <p className="text-xl font-serif font-bold">Drop assets here to upload</p>
            <p className="text-[10px] font-mono text-ink/40 uppercase tracking-widest">Supports JPG, PNG, GIF up to 10MB</p>
          </div>
          <label className="inline-block px-8 py-3 bg-ink text-white text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-burgundy transition-all">
            Select Files
            <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0])} />
          </label>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {assets.map(asset => (
          <div key={asset.id} className="col-span-12 sm:col-span-6 lg:col-span-3 bg-surface border border-border-hairline group overflow-hidden">
            <div className="aspect-square bg-bg relative overflow-hidden">
              {asset.type === 'IMAGE' ? (
                <img src={asset.url} alt={asset.name} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-ink/20">
                  <FileText size={48} />
                </div>
              )}
              <div className="absolute inset-0 bg-ink/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                <button className="p-3 bg-white text-ink hover:bg-burgundy hover:text-white transition-all rounded-full">
                  <Eye size={18} />
                </button>
                <button onClick={() => handleDelete(asset.id)} className="p-3 bg-white text-ink hover:bg-burgundy hover:text-white transition-all rounded-full">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
            <div className="p-4 border-t border-border-hairline">
              <p className="text-[10px] font-black uppercase tracking-widest truncate">{asset.name}</p>
              <div className="flex justify-between items-center mt-2">
                <span className="text-[9px] font-mono text-ink/40 uppercase">{asset.type}</span>
                <span className="text-[9px] font-mono text-ink/40 uppercase">{new Date(asset.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const LiveActivityFeed = () => {
  const { liveActivities } = useCollaboration();

  const getIcon = (type: string) => {
    switch (type) {
      case 'OPEN': return <MailOpen size={14} className="text-status-success" />;
      case 'CLICK': return <MousePointer2 size={14} className="text-burgundy" />;
      case 'BOUNCE': return <AlertCircle size={14} className="text-burgundy" />;
      case 'BEHAVIORAL': return <Zap size={14} className="text-burgundy" />;
      default: return <Activity size={14} className="text-ink/40" />;
    }
  };

  const getLabel = (activity: any) => {
    if (activity.type === 'BEHAVIORAL') {
      return `performed ${activity.eventName.replace(/_/g, ' ').toLowerCase()}`;
    }
    switch (activity.type) {
      case 'OPEN': return 'opened a broadcast';
      case 'CLICK': return 'clicked a link';
      case 'SENT': return 'received a broadcast';
      case 'BOUNCE': return 'email bounced';
      case 'COMPLAINT': return 'marked as spam';
      default: return 'interacted with system';
    }
  };

  return (
    <div className="bg-surface border border-border-hairline p-6 space-y-6">
      <div className="flex justify-between items-center border-b border-border-hairline pb-4">
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-burgundy animate-pulse" />
          <h3 className="text-[10px] font-black uppercase tracking-widest text-ink">Live Activity Feed</h3>
        </div>
        <span className="text-[9px] font-mono text-ink/40 uppercase">Real-time Dispatch</span>
      </div>

      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
        {liveActivities.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <p className="text-xs font-editorial italic text-ink/40">Waiting for live signals...</p>
            <div className="flex justify-center gap-1">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-1 h-1 bg-burgundy/20 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.2}s` }} />
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
                      {new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
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

const PreferenceCenter = () => {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      api.getPublicPreferences(token)
        .then(res => {
          if (res.error) setError(res.error);
          else setData(res);
        })
        .catch(() => setError("Failed to load preferences"))
        .finally(() => setLoading(false));
    }
  }, [token]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    try {
      await api.updatePublicPreferences(token, {
        listIds: data.memberships,
        emailConsent: data.contact.emailConsent,
        smsConsent: data.contact.smsConsent,
        whatsappConsent: data.contact.whatsappConsent,
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError("Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-surface flex items-center justify-center">
      <Loader2 className="animate-spin text-burgundy" size={32} />
    </div>
  );

  if (error || !data) return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white border border-border-hairline p-8 text-center space-y-4">
        <AlertCircle className="mx-auto text-burgundy" size={48} />
        <h2 className="font-serif text-2xl font-bold">Access Denied</h2>
        <p className="text-sm text-ink/60">{error || "This preference link is invalid or has expired."}</p>
        <Link to="/" className="btn-primary inline-block px-8 py-2 text-xs">Return Home</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-surface py-12 px-6">
      <div className="max-w-2xl mx-auto space-y-12">
        <div className="text-center space-y-4">
          {data.organization.logoUrl ? (
            <img src={data.organization.logoUrl} alt={data.organization.name} className="h-12 mx-auto grayscale" referrerPolicy="no-referrer" />
          ) : (
            <h1 className="font-sans font-black uppercase tracking-[0.2em] text-xl">{data.organization.name}</h1>
          )}
          <div className="h-px w-24 bg-ink mx-auto" />
          <h2 className="font-serif text-3xl font-bold italic">Subscription Preference Center</h2>
          <p className="text-sm text-ink/60 max-w-md mx-auto">
            Manage how you receive updates from us. Your privacy and preferences are our priority.
          </p>
        </div>

        <form onSubmit={handleSave} className="bg-white border border-border-hairline p-8 sm:p-12 space-y-10">
          <section className="space-y-6">
            <div className="border-b border-ink pb-2">
              <h3 className="font-sans font-black uppercase tracking-widest text-xs">Channels</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[
                { id: 'emailConsent', label: 'Email', icon: Mail },
                { id: 'smsConsent', label: 'SMS', icon: Smartphone },
                { id: 'whatsappConsent', label: 'WhatsApp', icon: MessageSquare }
              ].map(channel => (
                <label key={channel.id} className="flex flex-col items-center p-4 border border-border-hairline cursor-pointer hover:bg-surface transition-colors group">
                  <input 
                    type="checkbox" 
                    className="hidden"
                    checked={data.contact[channel.id]}
                    onChange={e => setData({
                      ...data, 
                      contact: { ...data.contact, [channel.id]: e.target.checked }
                    })}
                  />
                  <channel.icon size={24} className={cn("mb-3 transition-colors", data.contact[channel.id] ? "text-burgundy" : "text-ink/20")} />
                  <span className="text-[10px] font-black uppercase tracking-widest mb-2">{channel.label}</span>
                  <div className={cn(
                    "w-10 h-5 rounded-full relative transition-colors",
                    data.contact[channel.id] ? "bg-burgundy" : "bg-ink/10"
                  )}>
                    <div className={cn(
                      "absolute top-1 w-3 h-3 bg-white rounded-full transition-all",
                      data.contact[channel.id] ? "left-6" : "left-1"
                    )} />
                  </div>
                </label>
              ))}
            </div>
          </section>

          <section className="space-y-6">
            <div className="border-b border-ink pb-2">
              <h3 className="font-sans font-black uppercase tracking-widest text-xs">Topics & Interests</h3>
            </div>
            <div className="space-y-3">
              {data.availableLists.map((list: any) => (
                <label key={list.id} className="flex items-center justify-between p-4 border border-border-hairline hover:bg-surface cursor-pointer group">
                  <div className="space-y-1">
                    <p className="text-sm font-bold">{list.name}</p>
                    <p className="text-[10px] font-serif italic text-ink/60">{list.description || "Updates regarding " + list.name}</p>
                  </div>
                  <input 
                    type="checkbox"
                    className="w-5 h-5 border-2 border-ink rounded-none checked:bg-burgundy focus:ring-0"
                    checked={data.memberships.includes(list.id)}
                    onChange={e => {
                      const newMemberships = e.target.checked 
                        ? [...data.memberships, list.id]
                        : data.memberships.filter((id: string) => id !== list.id);
                      setData({ ...data, memberships: newMemberships });
                    }}
                  />
                </label>
              ))}
            </div>
          </section>

          <div className="pt-6 border-t border-border-hairline flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="text-[10px] font-mono text-ink/40 uppercase tracking-widest">
              Last updated: {new Date().toLocaleDateString()}
            </div>
            <button 
              type="submit"
              disabled={saving}
              className="btn-primary px-12 py-3 text-xs w-full sm:w-auto flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="animate-spin" size={14} /> : <ShieldCheck size={14} />}
              {saving ? 'Saving...' : 'Update Preferences'}
            </button>
          </div>

          <AnimatePresence>
            {success && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-status-success/10 border border-status-success/20 p-4 text-center"
              >
                <p className="text-xs font-black uppercase tracking-widest text-status-success">Preferences Updated Successfully</p>
              </motion.div>
            )}
          </AnimatePresence>
        </form>

        <div className="text-center space-y-4">
          <p className="text-[10px] font-mono text-ink/40 uppercase tracking-widest">
            GDPR & KVKK Compliant • Secure Connection
          </p>
          <div className="flex justify-center gap-6">
            <Link to="/" className="text-[10px] font-black uppercase text-ink/40 hover:text-burgundy">Privacy Policy</Link>
            <Link to="/" className="text-[10px] font-black uppercase text-ink/40 hover:text-burgundy">Terms of Use</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

const Home = () => {
  const { user, refreshUser } = useAuth();
  const { joinRoom, leaveRoom } = useCollaboration();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentCampaigns, setRecentCampaigns] = useState<Campaign[]>([]);
  const [scheduledCampaigns, setScheduledCampaigns] = useState<Campaign[]>([]);
  const [ssoDomain, setSsoDomain] = useState('');

  useEffect(() => {
    if (user) {
      joinRoom('dashboard-live');
      api.getSummary().then(setStats);
      api.getCampaigns().then(res => {
        setRecentCampaigns(res.filter(c => c.status === 'SENT').slice(0, 3));
        setScheduledCampaigns(res.filter(c => c.status === 'SCHEDULED').slice(0, 3));
      });
    }
    return () => {
      leaveRoom('dashboard-live');
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
        'SSO_LOGIN',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      if (!popup) {
        alert("Popup blocked! Please allow popups for this site.");
        return;
      }

      const handleMessage = async (event: MessageEvent) => {
        if (event.data?.type === 'SSO_AUTH_SUCCESS') {
          await refreshUser();
          window.removeEventListener('message', handleMessage);
        }
      };

      window.addEventListener('message', handleMessage);
    } catch (error) {
      console.error("SSO login failed", error);
      alert("SSO Login failed. Please check your domain configuration.");
    }
  };

  if (!user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-full max-w-md space-y-12 text-center">
          <div className="space-y-4">
            <h2 className="text-6xl font-serif font-bold tracking-tighter">Welcome to SIGNAL</h2>
            <p className="text-lg font-editorial italic text-ink/60">The enterprise editorial broadcast system.</p>
          </div>
          
          <div className="bg-surface border border-border-hairline p-10 space-y-8 shadow-xl">
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-ink/40">Enterprise Access</p>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Enter your corporate domain"
                  className="flex-1 p-3 bg-bg border border-border-hairline font-mono text-xs focus:border-burgundy outline-none"
                  value={ssoDomain}
                  onChange={e => setSsoDomain(e.target.value)}
                />
                <button 
                  onClick={handleSSOLogin}
                  className="bg-ink text-white px-6 text-[10px] font-black uppercase tracking-widest hover:bg-burgundy transition-all"
                >
                  Continue
                </button>
              </div>
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border-hairline"></div></div>
              <div className="relative flex justify-center text-[10px] uppercase font-bold"><span className="bg-surface px-4 text-ink/40">Or</span></div>
            </div>

            <button className="w-full py-4 border-2 border-ink text-[10px] font-black uppercase tracking-widest hover:bg-ink hover:text-white transition-all">
              Sign in with Email
            </button>
          </div>
          
          <p className="text-[10px] font-mono text-ink/40 uppercase">Protected by SIGNAL Enterprise Shield</p>
        </div>
      </div>
    );
  }

  if (!stats) return <div className="p-20 text-center font-editorial italic text-3xl">Loading dispatch...</div>;

  const leadCampaign = recentCampaigns[0];

  return (
    <div className="space-y-16">
      <SectionHeader 
        title="Dashboard" 
        subtitle="Overview of your publication's performance and system health."
        guideKey="dashboard-metrics"
      />

      {/* Top Stats Strip */}
      <div className="newspaper-grid border-b border-border-hairline pb-12">
        <div className="col-span-12 lg:col-span-3">
          <MetricBlock label="Total Audience" value={stats.totalSubscribers} delta="12% vs last month" deltaType="up" />
        </div>
        <div className="col-span-12 lg:col-span-3">
          <MetricBlock label="Broadcasts Sent" value={stats.totalCampaigns} delta="4 this week" deltaType="up" />
        </div>
        <div className="col-span-12 lg:col-span-3">
          <MetricBlock label="Dispatch Volume" value={stats.totalSent} />
        </div>
        <div className="col-span-12 lg:col-span-3">
          <MetricBlock label="Avg. Open Rate" value={`${stats.totalSent ? Math.round((stats.totalOpens / stats.totalSent) * 100) : 0}%`} delta="2.4%" deltaType="down" />
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="newspaper-grid">
        {/* Left Column: Lead Story */}
        <div className="col-span-12 lg:col-span-8 space-y-12 pr-8 border-r border-border-hairline">
          <AudienceHealthChart />
          
          <div className="space-y-4">
            <p className="font-sans font-black uppercase tracking-[0.2em] text-burgundy text-[10px]">Latest Dispatch Performance</p>
            {leadCampaign ? (
              <div className="space-y-6">
                <h2 className="text-7xl font-serif font-bold leading-[0.9] tracking-tighter text-ink">
                  {leadCampaign.name}
                </h2>
                <div className="flex gap-12 border-y border-border-hairline py-6">
                  <div>
                    <p className="metric-label">Open Rate</p>
                    <p className="font-editorial text-4xl">24.8%</p>
                  </div>
                  <div>
                    <p className="metric-label">Click Rate</p>
                    <p className="font-editorial text-4xl">3.2%</p>
                  </div>
                  <div>
                    <p className="metric-label">Unsubscribes</p>
                    <p className="font-editorial text-4xl">0.12%</p>
                  </div>
                </div>
                <div className="h-64 bg-surface/50 p-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={[{t: '0h', v: 0}, {t: '4h', v: 120}, {t: '8h', v: 450}, {t: '12h', v: 890}, {t: '24h', v: 1200}]}>
                      <defs>
                        <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8B1A1A" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#8B1A1A" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#D4CFC6" />
                      <XAxis dataKey="t" axisLine={false} tickLine={false} tick={{fontSize: 10, fontFamily: 'Courier Prime'}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontFamily: 'Courier Prime'}} />
                      <Tooltip />
                      <Area type="monotone" dataKey="v" stroke="#8B1A1A" fillOpacity={1} fill="url(#colorVal)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div className="py-20 text-center border border-dashed border-border-hairline">
                <p className="font-editorial italic text-3xl text-ink/30 text-center">No dispatches recorded.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Sidebar */}
        <div className="col-span-12 lg:col-span-4 space-y-12">
          <LiveActivityFeed />
          
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-ink pb-2">
              <h3 className="font-sans font-black uppercase tracking-widest text-xs">Upcoming Broadcasts</h3>
              <Link to="/campaigns" className="text-[10px] font-bold uppercase text-burgundy hover:underline">View All</Link>
            </div>
            <div className="space-y-6">
              {scheduledCampaigns.length > 0 ? (
                scheduledCampaigns.map(camp => (
                  <div key={camp.id} className="group cursor-pointer">
                    <p className="font-mono text-[9px] text-ink/40 mb-1 uppercase">
                      SCHEDULED FOR {camp.scheduledAt ? format(new Date(camp.scheduledAt), 'MMMM d, HH:mm') : 'N/A'} ({camp.timezone})
                    </p>
                    <h4 className="font-serif text-xl font-bold group-hover:text-burgundy transition-colors">{camp.name}</h4>
                    <hr className="mt-4" />
                  </div>
                ))
              ) : (
                <p className="font-editorial italic text-sm text-ink/40">No upcoming broadcasts.</p>
              )}
            </div>
          </div>

          <div className="bg-surface p-8 space-y-6">
            <h3 className="font-serif text-2xl font-bold">System Health</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-[10px] font-black uppercase mb-1">
                  <span>Deliverability</span>
                  <span>99.8%</span>
                </div>
                <div className="h-1 bg-bg">
                  <div className="h-full bg-status-success w-[99.8%]" />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[10px] font-black uppercase mb-1">
                  <span>Sender Reputation</span>
                  <span>High</span>
                </div>
                <div className="h-1 bg-bg">
                  <div className="h-full bg-brass w-[92%]" />
                </div>
              </div>
            </div>
            <p className="text-xs text-ink/60 leading-relaxed italic">
              "Your signal is clear. Maintain high engagement by segmenting your audience based on recent activity."
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const getUtcDateString = (localDate: Date | null, timeZone: string): string => {
  if (!localDate) return '';
  const dateStr = format(localDate, "yyyy-MM-dd'T'HH:mm:ss");
  const utcDate = fromZonedTime(dateStr, timeZone);
  return utcDate.toISOString();
};

const getLocalDateForPicker = (utcDateString: string | null, timeZone: string): Date | null => {
  if (!utcDateString) return null;
  const dateStr = formatInTimeZone(new Date(utcDateString), timeZone, "yyyy-MM-dd'T'HH:mm:ss");
  const [datePart, timePart] = dateStr.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute, second] = timePart.split(':').map(Number);
  return new Date(year, month - 1, day, hour, minute, second);
};

const Campaigns = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    subject: '',
    subjectB: '',
    previewText: '',
    fromName: 'SIGNAL Editorial',
    fromEmail: 'editor@signal.app',
    content: '',
    contentB: '',
    channel: 'EMAIL' as 'EMAIL' | 'SMS' | 'WHATSAPP' | 'IN_APP',
    type: 'REGULAR' as 'REGULAR' | 'AB',
    testPercentage: 20,
    testDuration: 4,
    winnerCriteria: 'OPEN_RATE' as 'OPEN_RATE' | 'CLICK_RATE',
    scheduledAt: '',
    timezone: 'UTC',
    perUserTimezone: false,
  });
  const [aiTopic, setAiTopic] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCheckingSpam, setIsCheckingSpam] = useState(false);
  const [spamResult, setSpamResult] = useState<{ score: number, reasons: string[] } | null>(null);
  const [isOptimizingPreview, setIsOptimizingPreview] = useState(false);
  const [isAdjustingTone, setIsAdjustingTone] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [predictedTime, setPredictedTime] = useState<{ hour: number, reason: string } | null>(null);
  const [isPredictingTime, setIsPredictingTime] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [channelFilter, setChannelFilter] = useState<string>('ALL');
  const [approvals, setApprovals] = useState<any[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [previewCampaign, setPreviewCampaign] = useState<Campaign | null>(null);
  const [previewContact, setPreviewContact] = useState<Contact | null>(null);
  const [abResults, setAbResults] = useState<any>(null);
  const [selectedAbCampaign, setSelectedAbCampaign] = useState<Campaign | null>(null);
  const [personalizedContent, setPersonalizedContent] = useState<string>('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);
  const [aiBrief, setAiBrief] = useState('');
  const [aiTone, setAiTone] = useState('Professional');
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiGeneratedResult, setAiGeneratedResult] = useState<{ subject: string, content: string } | null>(null);
  const [isSimulatingAB, setIsSimulatingAB] = useState(false);

  const handleAiGenerate = async () => {
    if (!aiBrief) return;
    setIsAiGenerating(true);
    try {
      const { subject, content } = await api.generateFullContent(aiBrief, aiTone);
      setAiGeneratedResult({ subject, content });
    } catch (error) {
      console.error("AI Generation failed", error);
    } finally {
      setIsAiGenerating(false);
    }
  };

  const applyAiContent = () => {
    if (aiGeneratedResult) {
      setNewCampaign({ ...newCampaign, subject: aiGeneratedResult.subject, content: aiGeneratedResult.content });
      setIsAiAssistantOpen(false);
      setAiBrief('');
      setAiGeneratedResult(null);
    }
  };

  useEffect(() => {
    api.getCampaigns().then(setCampaigns);
    api.getContacts().then(setContacts);
    api.getApprovals().then(setApprovals);
    api.getTemplates().then(res => {
      setTemplates(res);
      const templateId = searchParams.get('templateId');
      if (templateId) {
        const template = res.find(t => t.id === templateId);
        if (template) {
          setNewCampaign(prev => ({ ...prev, content: template.content, name: `Dispatch: ${template.name}` }));
          setIsCreating(true);
          // Clear the param after loading
          setSearchParams({}, { replace: true });
        }
      }
    });
  }, [searchParams]);

  useEffect(() => {
    if (previewCampaign && previewContact) {
      api.getPersonalizationPreview(previewCampaign.content, previewContact.id).then(res => {
        setPersonalizedContent(res.content);
      });
    } else if (previewCampaign) {
      setPersonalizedContent(previewCampaign.content);
    }
  }, [previewCampaign, previewContact]);

  const handleSaveAsTemplate = async (camp: Campaign) => {
    const name = prompt("Enter template name:", `Template from ${camp.name}`);
    if (name) {
      await api.addTemplate({
        name,
        content: camp.content,
        category: 'From Broadcast'
      });
      alert("Template saved.");
    }
  };

  const loadTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setNewCampaign({ ...newCampaign, content: template.content });
    }
  };

  const handleRequestApproval = async (campaignId: string) => {
    await api.requestApproval({ campaignId });
    api.getCampaigns().then(setCampaigns);
    api.getApprovals().then(setApprovals);
    alert("Approval request sent to editorial board.");
  };

  const filteredCampaigns = campaigns.filter(camp => {
    const matchesStatus = statusFilter === 'ALL' || camp.status === statusFilter;
    const matchesType = typeFilter === 'ALL' || camp.type === typeFilter;
    const matchesChannel = channelFilter === 'ALL' || camp.channel === channelFilter;
    return matchesStatus && matchesType && matchesChannel;
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.addCampaign(newCampaign);
    setIsCreating(false);
    setNewCampaign({
      name: '',
      subject: '',
      subjectB: '',
      previewText: '',
      fromName: 'SIGNAL Editorial',
      fromEmail: 'editor@signal.app',
      content: '',
      contentB: '',
      channel: 'EMAIL',
      type: 'REGULAR',
      testPercentage: 20,
      testDuration: 4,
      winnerCriteria: 'OPEN_RATE',
      scheduledAt: '',
      timezone: 'UTC',
      perUserTimezone: false,
    });
    api.getCampaigns().then(setCampaigns);
  };

  const handleSend = async (id: string) => {
    if (confirm("Are you sure you want to send this broadcast immediately?")) {
      await api.updateCampaignStatus(id, 'SENT');
      api.getCampaigns().then(setCampaigns);
    }
  };

  const handlePickWinner = async (id: string, winner: 'A' | 'B') => {
    await api.pickWinner(id, winner);
    setAbResults(null);
    setSelectedAbCampaign(null);
    api.getCampaigns().then(setCampaigns);
  };

  const handleSimulateAB = async () => {
    if (!selectedAbCampaign) return;
    setIsSimulatingAB(true);
    try {
      await api.simulateAB(selectedAbCampaign.id);
      const results = await api.getABResults(selectedAbCampaign.id);
      setAbResults(results);
    } catch (error) {
      console.error("Simulation failed", error);
    } finally {
      setIsSimulatingAB(false);
    }
  };

  const viewABResults = async (camp: Campaign) => {
    const results = await api.getABResults(camp.id);
    setAbResults(results);
    setSelectedAbCampaign(camp);
  };

  const generateAI = async () => {
    if (!aiTopic) return;
    setIsGenerating(true);
    const suggestions = await api.generateSubjectLines(aiTopic);
    setAiSuggestions(suggestions);
    setIsGenerating(false);
  };

  const optimizePreview = async () => {
    if (!newCampaign.subject || !newCampaign.content) return;
    setIsOptimizingPreview(true);
    const preview = await api.optimizePreview(newCampaign.subject, newCampaign.content);
    setNewCampaign({ ...newCampaign, previewText: preview });
    setIsOptimizingPreview(false);
  };

  const checkSpam = async () => {
    setIsCheckingSpam(true);
    const result = await api.checkSpam(newCampaign.subject, newCampaign.content);
    setSpamResult(result);
    setIsCheckingSpam(false);
  };

  const adjustTone = async (tone: string) => {
    setIsAdjustingTone(true);
    const rewritten = await api.adjustTone(newCampaign.content, tone);
    setNewCampaign({ ...newCampaign, content: rewritten });
    setIsAdjustingTone(false);
  };

  const translateContent = async (lang: string) => {
    setIsTranslating(true);
    const translated = await api.translate(newCampaign.content, lang);
    setNewCampaign({ ...newCampaign, content: translated });
    setIsTranslating(false);
  };

  const predictTime = async () => {
    if (!newCampaign.name) return;
    setIsPredictingTime(true);
    const prediction = await api.predictSendTime(newCampaign.name);
    setPredictedTime(prediction);
    setIsPredictingTime(false);
  };

  return (
    <div className="space-y-12">
      <SectionHeader 
        title="Broadcasts" 
        subtitle="Manage your editorial dispatches and scheduled signals."
        guideKey="campaign-editor"
        action={
          <button onClick={() => setIsCreating(true)} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> New Broadcast
          </button>
        }
      />

      <AnimatePresence>
        {isCreating && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-surface border border-border-hairline p-10 space-y-10"
          >
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <h2 className="text-4xl font-serif font-bold">Draft New Dispatch</h2>
                <div className="flex gap-4">
                  <select 
                    className="text-[10px] font-black uppercase tracking-widest text-burgundy bg-transparent border-none outline-none cursor-pointer hover:underline"
                    onChange={(e) => loadTemplate(e.target.value)}
                    defaultValue=""
                  >
                    <option value="" disabled>Load from Template...</option>
                    {templates.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                  <button 
                    type="button"
                    onClick={() => setIsAiAssistantOpen(true)}
                    className="text-[10px] font-black uppercase tracking-widest text-burgundy bg-transparent border-none outline-none cursor-pointer hover:underline flex items-center gap-1"
                  >
                    <Sparkles size={12} /> Write with AI
                  </button>
                </div>
              </div>
              <button onClick={() => setIsCreating(false)} className="text-ink/40 hover:text-burgundy">✕</button>
            </div>

            <form onSubmit={handleCreate} className="newspaper-grid">
              <div className="col-span-12 lg:col-span-7 space-y-8">
                <div className="flex justify-between items-center">
                  <div className="space-y-2 flex-1 mr-8">
                    <label className="metric-label">Channel</label>
                    <div className="flex gap-4">
                      {(['EMAIL', 'SMS', 'WHATSAPP', 'IN_APP'] as const).map(ch => (
                        <button
                          key={ch}
                          type="button"
                          onClick={() => setNewCampaign({ ...newCampaign, channel: ch })}
                          className={cn(
                            "px-4 py-2 text-[10px] font-black uppercase tracking-widest border transition-all flex items-center gap-2",
                            newCampaign.channel === ch ? "bg-ink text-white border-ink" : "border-border-hairline text-ink/40 hover:bg-bg"
                          )}
                        >
                          {ch === 'EMAIL' && <Mail size={12} />}
                          {ch === 'SMS' && <Smartphone size={12} />}
                          {ch === 'WHATSAPP' && <MessageSquare size={12} />}
                          {ch === 'IN_APP' && <Bell size={12} />}
                          {ch}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <div className="space-y-2 flex-1 mr-8">
                    <label className="metric-label">Internal Name</label>
                    <input 
                      type="text" 
                      className="w-full bg-transparent border-b border-border-hairline py-2 font-serif text-2xl outline-none focus:border-burgundy transition-colors"
                      placeholder="e.g. Weekly Digest Vol. 42"
                      value={newCampaign.name}
                      onChange={e => setNewCampaign({...newCampaign, name: e.target.value})}
                      required
                    />
                  </div>
                  <div className="flex items-center gap-4 pt-4">
                    <button 
                      type="button"
                      onClick={() => setNewCampaign({...newCampaign, type: newCampaign.type === 'REGULAR' ? 'AB' : 'REGULAR'})}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 border font-sans font-black uppercase tracking-widest text-[10px] transition-all",
                        newCampaign.type === 'AB' ? "bg-burgundy text-white border-burgundy" : "border-border-hairline text-ink/40 hover:border-burgundy hover:text-burgundy"
                      )}
                    >
                      <Split size={14} />
                      {newCampaign.type === 'AB' ? 'A/B Test Active' : 'Enable A/B Test'}
                    </button>
                  </div>
                </div>

                <div className="space-y-8">
                  {/* Variation A */}
                  <div className={cn("space-y-4 p-6 border border-border-hairline", newCampaign.type === 'AB' && "bg-surface/30")}>
                    {newCampaign.type === 'AB' && <p className="font-sans font-black uppercase tracking-widest text-[10px] text-burgundy">Variation A</p>}
                    <div className="space-y-4">
                      <div className="flex justify-between items-end">
                        <label className="metric-label">Subject Line</label>
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            placeholder="Topic for AI..." 
                            className="text-[10px] font-mono bg-bg border border-border-hairline px-2 py-1 outline-none focus:border-burgundy"
                            value={aiTopic}
                            onChange={e => setAiTopic(e.target.value)}
                          />
                          <button 
                            type="button"
                            onClick={generateAI}
                            disabled={isGenerating}
                            className="text-[10px] font-black uppercase tracking-widest text-burgundy hover:underline disabled:opacity-50"
                          >
                            {isGenerating ? 'Generating...' : 'AI Suggest'}
                          </button>
                        </div>
                      </div>
                      <input 
                        type="text" 
                        className="w-full bg-transparent border-b border-border-hairline py-2 font-serif text-2xl outline-none focus:border-burgundy transition-colors"
                        placeholder="The headline of your broadcast"
                        value={newCampaign.subject}
                        onChange={e => setNewCampaign({...newCampaign, subject: e.target.value})}
                        required
                      />

                      <div className="space-y-2">
                        <div className="flex justify-between items-end">
                          <label className="metric-label">Preview Text</label>
                          <button 
                            type="button"
                            onClick={optimizePreview}
                            disabled={isOptimizingPreview || !newCampaign.subject}
                            className="text-[10px] font-black uppercase tracking-widest text-burgundy hover:underline disabled:opacity-50 flex items-center gap-1"
                          >
                            <Sparkles size={10} />
                            {isOptimizingPreview ? 'Optimizing...' : 'AI Optimize'}
                          </button>
                        </div>
                        <input 
                          type="text" 
                          className="w-full bg-transparent border-b border-border-hairline py-1 font-sans text-sm outline-none focus:border-burgundy transition-colors"
                          placeholder="Short summary for the inbox"
                          value={newCampaign.previewText}
                          onChange={e => setNewCampaign({...newCampaign, previewText: e.target.value})}
                        />
                      </div>
                      
                      {aiSuggestions.length > 0 && (
                        <div className="bg-bg p-4 space-y-3">
                          <p className="text-[9px] font-black uppercase tracking-widest text-ink/40">AI Suggestions</p>
                          <div className="space-y-2">
                            {aiSuggestions.map((s, i) => (
                              <button 
                                key={i} 
                                type="button"
                                onClick={() => setNewCampaign({...newCampaign, subject: s})}
                                className="block w-full text-left text-sm font-editorial italic hover:text-burgundy transition-colors"
                              >
                                "{s}"
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <label className="metric-label">Editorial Content</label>
                        <div className="flex gap-4">
                          <div className="relative group">
                            <button type="button" className="text-[10px] font-black uppercase tracking-widest text-ink/40 hover:text-burgundy flex items-center gap-1">
                              <Wand2 size={10} /> Tone
                            </button>
                            <div className="absolute right-0 top-full mt-2 bg-bg border border-ink p-2 hidden group-hover:block z-10 shadow-xl min-w-[120px]">
                              {['Professional', 'Casual', 'Urgent', 'Inspirational', 'Authoritative'].map(tone => (
                                <button 
                                  key={tone}
                                  type="button"
                                  onClick={() => adjustTone(tone)}
                                  className="block w-full text-left px-2 py-1 text-[10px] font-black uppercase tracking-widest hover:bg-surface"
                                >
                                  {tone}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="relative group">
                            <button type="button" className="text-[10px] font-black uppercase tracking-widest text-ink/40 hover:text-burgundy flex items-center gap-1">
                              <Languages size={10} /> Translate
                            </button>
                            <div className="absolute right-0 top-full mt-2 bg-bg border border-ink p-2 hidden group-hover:block z-10 shadow-xl min-w-[120px]">
                              {['Turkish', 'German', 'French', 'Spanish', 'Japanese'].map(lang => (
                                <button 
                                  key={lang}
                                  type="button"
                                  onClick={() => translateContent(lang)}
                                  className="block w-full text-left px-2 py-1 text-[10px] font-black uppercase tracking-widest hover:bg-surface"
                                >
                                  {lang}
                                </button>
                              ))}
                            </div>
                          </div>
                          <button 
                            type="button"
                            onClick={checkSpam}
                            disabled={isCheckingSpam}
                            className="text-[10px] font-black uppercase tracking-widest text-ink/40 hover:text-burgundy flex items-center gap-1"
                          >
                            <ShieldCheck size={10} /> 
                            {isCheckingSpam ? 'Checking...' : 'Spam Check'}
                          </button>
                          <button 
                            type="button"
                            onClick={() => setPreviewCampaign({
                              id: 'preview',
                              name: newCampaign.name || 'Preview',
                              subject: newCampaign.subject,
                              content: newCampaign.content,
                              channel: newCampaign.channel,
                              fromName: newCampaign.fromName,
                              fromEmail: newCampaign.fromEmail,
                              type: newCampaign.type,
                              status: 'DRAFT',
                              timezone: newCampaign.timezone,
                              organizationId: 'preview',
                              createdAt: new Date().toISOString()
                            })}
                            className="text-[10px] font-black uppercase tracking-widest text-ink/40 hover:text-burgundy flex items-center gap-1"
                          >
                            <Eye size={10} /> Preview
                          </button>
                        </div>
                      </div>
                      
                      {spamResult && (
                        <div className={cn(
                          "p-4 border font-mono text-[10px] uppercase",
                          spamResult.score > 30 ? "bg-status-warning/10 border-status-warning text-status-warning" : "bg-status-success/10 border-status-success text-status-success"
                        )}>
                          <div className="flex justify-between items-center mb-2">
                            <p className="font-black">Spam Score: {spamResult.score}/100</p>
                            {spamResult.score > 30 && <AlertTriangle size={12} />}
                          </div>
                          <ul className="list-disc pl-4 space-y-1">
                            {spamResult.reasons.map((r, i) => <li key={i}>{r}</li>)}
                          </ul>
                        </div>
                      )}

                      <ReactQuill 
                        theme="snow" 
                        value={newCampaign.content}
                        onChange={val => setNewCampaign({...newCampaign, content: val})}
                      />
                    </div>
                  </div>

                  {/* Variation B */}
                  {newCampaign.type === 'AB' && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="space-y-4 p-6 border border-burgundy bg-burgundy/5"
                    >
                      <p className="font-sans font-black uppercase tracking-widest text-[10px] text-burgundy">Variation B</p>
                      <div className="space-y-4">
                        <label className="metric-label">Subject Line B</label>
                        <input 
                          type="text" 
                          className="w-full bg-transparent border-b border-border-hairline py-2 font-serif text-2xl outline-none focus:border-burgundy transition-colors"
                          placeholder="Alternative headline"
                          value={newCampaign.subjectB}
                          onChange={e => setNewCampaign({...newCampaign, subjectB: e.target.value})}
                          required={newCampaign.type === 'AB'}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="metric-label">Editorial Content B</label>
                        <ReactQuill 
                          theme="snow" 
                          value={newCampaign.contentB}
                          onChange={val => setNewCampaign({...newCampaign, contentB: val})}
                        />
                        <div className="flex justify-between items-center">
                          <button 
                            type="button"
                            onClick={() => setNewCampaign({...newCampaign, contentB: newCampaign.content})}
                            className="text-[10px] font-black uppercase tracking-widest text-ink/40 hover:text-burgundy"
                          >
                            Copy from Variation A
                          </button>
                          <button 
                            type="button"
                            onClick={() => setPreviewCampaign({
                              id: 'preview-b',
                              name: (newCampaign.name || 'Preview') + ' (Variation B)',
                              subject: newCampaign.subjectB || '',
                              content: newCampaign.contentB || '',
                              channel: newCampaign.channel,
                              fromName: newCampaign.fromName,
                              fromEmail: newCampaign.fromEmail,
                              type: newCampaign.type,
                              status: 'DRAFT',
                              timezone: newCampaign.timezone,
                              organizationId: 'preview',
                              createdAt: new Date().toISOString()
                            })}
                            className="text-[10px] font-black uppercase tracking-widest text-ink/40 hover:text-burgundy flex items-center gap-1"
                          >
                            <Eye size={10} /> Preview B
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>

              <div className="col-span-12 lg:col-span-5 space-y-8 lg:pl-10 lg:border-l border-border-hairline">
                <div className="space-y-6">
                  {newCampaign.type === 'AB' && (
                    <div className="space-y-6 pb-6 border-b border-border-hairline">
                      <p className="font-sans font-black uppercase tracking-[0.2em] text-burgundy text-[10px]">A/B Test Settings</p>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="metric-label">Test Size (%)</label>
                          <input 
                            type="number" 
                            className="w-full bg-transparent border-b border-border-hairline py-1 font-mono text-xs outline-none focus:border-burgundy"
                            value={newCampaign.testPercentage}
                            onChange={e => setNewCampaign({...newCampaign, testPercentage: parseInt(e.target.value)})}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="metric-label">Duration (Hours)</label>
                          <input 
                            type="number" 
                            className="w-full bg-transparent border-b border-border-hairline py-1 font-mono text-xs outline-none focus:border-burgundy"
                            value={newCampaign.testDuration}
                            onChange={e => setNewCampaign({...newCampaign, testDuration: parseInt(e.target.value)})}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="metric-label">Winner Criteria</label>
                        <select 
                          className="w-full bg-transparent border-b border-border-hairline py-1 font-sans font-bold text-sm outline-none focus:border-burgundy"
                          value={newCampaign.winnerCriteria}
                          onChange={e => setNewCampaign({...newCampaign, winnerCriteria: e.target.value as 'OPEN_RATE' | 'CLICK_RATE'})}
                        >
                          <option value="OPEN_RATE">Highest Open Rate</option>
                          <option value="CLICK_RATE">Highest Click Rate</option>
                        </select>
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    <label className="metric-label">From Name</label>
                    <input 
                      type="text" 
                      className="w-full bg-transparent border-b border-border-hairline py-1 font-sans font-bold text-sm outline-none focus:border-burgundy"
                      value={newCampaign.fromName}
                      onChange={e => setNewCampaign({...newCampaign, fromName: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="metric-label">From Email</label>
                    <input 
                      type="email" 
                      className="w-full bg-transparent border-b border-border-hairline py-1 font-sans font-bold text-sm outline-none focus:border-burgundy"
                      value={newCampaign.fromEmail}
                      onChange={e => setNewCampaign({...newCampaign, fromEmail: e.target.value})}
                    />
                  </div>

                  <div className="pt-6 space-y-4 border-t border-border-hairline">
                    <p className="font-sans font-black uppercase tracking-[0.2em] text-ink/40 text-[10px]">Scheduling</p>
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <div className="flex justify-between items-end">
                          <label className="metric-label flex items-center gap-2">
                            <Clock size={12} /> Date & Time
                          </label>
                          <button 
                            type="button"
                            onClick={predictTime}
                            disabled={isPredictingTime}
                            className="text-[10px] font-black uppercase tracking-widest text-burgundy hover:underline disabled:opacity-50 flex items-center gap-1"
                          >
                            <Sparkles size={10} />
                            {isPredictingTime ? 'Analyzing...' : 'AI Best Time'}
                          </button>
                        </div>
                        <div className="relative">
                          <DatePicker
                            selected={newCampaign.scheduledAt ? getLocalDateForPicker(newCampaign.scheduledAt, newCampaign.timezone) : null}
                            onChange={(date) => setNewCampaign({...newCampaign, scheduledAt: date ? getUtcDateString(date, newCampaign.timezone) : ''})}
                            showTimeSelect
                            dateFormat="MMMM d, yyyy h:mm aa"
                            className="w-full bg-transparent border-b border-border-hairline py-1 font-mono text-xs outline-none focus:border-burgundy cursor-pointer"
                            placeholderText="Select dispatch date and time"
                            minDate={new Date()}
                          />
                        </div>
                        {predictedTime && (
                          <div className="bg-burgundy/5 border border-burgundy/20 p-3 mt-2">
                            <p className="text-[9px] font-black uppercase text-burgundy mb-1">AI Recommendation</p>
                            <p className="text-[10px] font-serif italic text-ink/80">{predictedTime.reason}</p>
                            <button 
                              type="button"
                              onClick={() => {
                                const date = new Date();
                                date.setHours(predictedTime.hour, 0, 0, 0);
                                if (date < new Date()) date.setDate(date.getDate() + 1);
                                setNewCampaign({ ...newCampaign, scheduledAt: getUtcDateString(date, newCampaign.timezone) });
                              }}
                              className="mt-2 text-[9px] font-black uppercase tracking-widest text-burgundy hover:underline"
                            >
                              Apply {predictedTime.hour}:00
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <label className="metric-label flex items-center gap-2">
                          <Globe size={12} /> Timezone
                        </label>
                        <div className="relative group">
                          <select 
                            className="w-full bg-transparent border-b border-border-hairline py-1 font-sans font-bold text-sm outline-none focus:border-burgundy appearance-none cursor-pointer"
                            value={newCampaign.timezone}
                            onChange={e => setNewCampaign({...newCampaign, timezone: e.target.value})}
                          >
                            <option value="UTC">UTC (Coordinated Universal Time)</option>
                            <option value="America/New_York">EST (Eastern Standard Time)</option>
                            <option value="America/Chicago">CST (Central Standard Time)</option>
                            <option value="America/Denver">MST (Mountain Standard Time)</option>
                            <option value="America/Los_Angeles">PST (Pacific Standard Time)</option>
                            <option value="Europe/London">GMT (Greenwich Mean Time)</option>
                            <option value="Europe/Paris">CET (Central European Time)</option>
                            <option value="Asia/Tokyo">JST (Japan Standard Time)</option>
                          </select>
                          <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-ink/20 group-hover:text-burgundy transition-colors">
                            <ChevronRight size={14} className="rotate-90" />
                          </div>
                        </div>
                        <p className="text-[9px] font-mono text-ink/40 uppercase mt-1">
                          Current selection: <span className="text-burgundy">{newCampaign.timezone}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-2 pt-2">
                        <input 
                          type="checkbox" 
                          id="perUserTimezone"
                          className="accent-burgundy"
                          checked={newCampaign.perUserTimezone}
                          onChange={(e) => setNewCampaign({...newCampaign, perUserTimezone: e.target.checked})}
                        />
                        <label htmlFor="perUserTimezone" className="text-[10px] font-black uppercase tracking-widest text-ink/60 cursor-pointer">
                          Per-user timezone sending
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-10 flex flex-col gap-3">
                  <button type="submit" className="btn-primary w-full py-4 text-sm">
                    {newCampaign.scheduledAt ? 'Schedule Broadcast' : 'Save Dispatch Draft'}
                  </button>
                  {newCampaign.scheduledAt && (
                    <button 
                      type="button" 
                      onClick={() => setNewCampaign({...newCampaign, scheduledAt: ''})}
                      className="text-[10px] font-black uppercase tracking-widest text-ink/40 hover:text-burgundy text-center"
                    >
                      Clear Schedule & Save as Draft
                    </button>
                  )}
                </div>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-0">
        <div className="flex items-center gap-8 mb-8 pb-4 border-b border-border-hairline">
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-ink/40 flex items-center gap-2">
              <Filter size={12} /> Status:
            </span>
            <div className="flex gap-2">
              {['ALL', 'DRAFT', 'IN_REVIEW', 'SCHEDULED', 'SENT', 'ARCHIVED'].map(s => (
                <button 
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={cn(
                    "px-3 py-1 text-[9px] font-black uppercase tracking-widest border transition-all",
                    statusFilter === s ? "bg-burgundy text-white border-burgundy" : "border-border-hairline text-ink/40 hover:border-burgundy hover:text-burgundy"
                  )}
                >
                  {s.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-ink/40 flex items-center gap-2">
              <Split size={12} /> Type:
            </span>
            <div className="flex gap-2">
              {['ALL', 'REGULAR', 'AB'].map(t => (
                <button 
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={cn(
                    "px-3 py-1 text-[9px] font-black uppercase tracking-widest border transition-all",
                    typeFilter === t ? "bg-burgundy text-white border-burgundy" : "border-border-hairline text-ink/40 hover:border-burgundy hover:text-burgundy"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-ink/40 flex items-center gap-2">
              <Smartphone size={12} /> Channel:
            </span>
            <div className="flex gap-2">
              {['ALL', 'EMAIL', 'SMS', 'WHATSAPP'].map(c => (
                <button 
                  key={c}
                  onClick={() => setChannelFilter(c)}
                  className={cn(
                    "px-3 py-1 text-[9px] font-black uppercase tracking-widest border transition-all",
                    channelFilter === c ? "bg-burgundy text-white border-burgundy" : "border-border-hairline text-ink/40 hover:border-burgundy hover:text-burgundy"
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-4 border-b-2 border-ink pb-4 mb-4 px-4">
          <div className="col-span-4 metric-label">Broadcast Name</div>
          <div className="col-span-2 metric-label">Sender</div>
          <div className="col-span-2 metric-label">Status</div>
          <div className="col-span-2 metric-label">Engagement</div>
          <div className="col-span-1 metric-label">Date</div>
          <div className="col-span-1"></div>
        </div>
        
        {filteredCampaigns.map((camp, i) => (
          <div key={camp.id} className={cn(
            "grid grid-cols-12 gap-4 items-center py-6 px-4 hover:bg-surface transition-colors group border-b border-border-hairline",
            i === 0 && "bg-surface/30"
          )}>
            <div className="col-span-4">
              <div className="flex items-center gap-3">
                <Link to={`/campaigns/${camp.id}`}>
                  <h3 className="font-serif text-2xl font-bold group-hover:text-burgundy transition-colors">{camp.name}</h3>
                </Link>
                <div className="flex gap-2">
                  {camp.type === 'AB' && (
                    <span className="px-1.5 py-0.5 bg-burgundy/10 text-burgundy text-[8px] font-black uppercase tracking-widest border border-burgundy/20">A/B</span>
                  )}
                  <span className={cn(
                    "px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest border",
                    camp.channel === 'EMAIL' ? "bg-ink/5 text-ink/60 border-ink/10" :
                    camp.channel === 'SMS' ? "bg-status-success/10 text-status-success border-status-success/20" :
                    "bg-status-warning/10 text-status-warning border-status-warning/20"
                  )}>
                    {camp.channel}
                  </span>
                </div>
              </div>
              <p className="text-xs text-ink/40 font-mono mt-1 uppercase">{camp.subject}</p>
              {camp.previewText && (
                <p className="text-[10px] text-ink/30 italic mt-1 line-clamp-1">{camp.previewText}</p>
              )}
            </div>
            <div className="col-span-2">
              <p className="font-sans font-bold text-[11px] text-ink">{camp.fromName}</p>
              <p className="font-mono text-[9px] text-ink/40 uppercase">{camp.fromEmail}</p>
            </div>
            <div className="col-span-2">
              <div className={cn(
                "px-2 py-1 text-[9px] font-black uppercase tracking-widest border flex items-center gap-1.5 w-fit",
                camp.status === 'SENT' ? "border-status-success/30 bg-status-success/5 text-status-success" :
                camp.status === 'SCHEDULED' ? "border-status-scheduled/30 bg-status-scheduled/5 text-status-scheduled" :
                camp.status === 'IN_REVIEW' ? "border-burgundy/30 bg-burgundy/5 text-burgundy" :
                camp.status === 'ARCHIVED' ? "border-ink/10 bg-ink/5 text-ink/40" :
                camp.status === 'SENDING' ? "border-status-warning/30 bg-status-warning/5 text-status-warning" :
                "border-status-draft/30 bg-status-draft/5 text-status-draft"
              )}>
                {camp.status === 'SENT' && <CheckCircle2 size={10} />}
                {camp.status === 'SCHEDULED' && <Clock size={10} />}
                {camp.status === 'IN_REVIEW' && <ShieldCheck size={10} />}
                {camp.status === 'ARCHIVED' && <Archive size={10} />}
                {camp.status === 'SENDING' && <RefreshCw size={10} className="animate-spin" />}
                {camp.status === 'DRAFT' && <FileEdit size={10} />}
                {camp.status.replace('_', ' ')}
              </div>
            </div>
            <div className="col-span-2 space-y-1">
              <div className="flex justify-between text-[9px] font-mono text-ink/40">
                <span>OPEN</span>
                <span>24%</span>
              </div>
              <div className="h-0.5 bg-bg">
                <div className="h-full bg-burgundy w-[24%]" />
              </div>
            </div>
            <div className="col-span-1 font-mono text-[10px] text-ink/60 uppercase">
              {camp.status === 'SCHEDULED' && camp.scheduledAt ? (
                <span className="text-status-scheduled">
                  {format(new Date(camp.scheduledAt), 'MMM d')}
                </span>
              ) : (
                format(new Date(camp.createdAt), 'MMM d')
              )}
            </div>
            <div className="col-span-1 flex justify-end gap-2">
              <button 
                onClick={() => setPreviewCampaign(camp)}
                className="text-ink/20 hover:text-burgundy"
                title="Preview Content"
              >
                <Eye size={18} />
              </button>
              <button 
                onClick={() => handleSaveAsTemplate(camp)}
                className="text-ink/20 hover:text-burgundy"
                title="Save as Template"
              >
                <FileText size={18} />
              </button>
              {camp.status === 'DRAFT' && (
                <button 
                  onClick={() => handleRequestApproval(camp.id)}
                  className="text-burgundy hover:scale-110 transition-transform"
                  title="Request Approval"
                >
                  <ShieldCheck size={18} />
                </button>
              )}
              {camp.status === 'DRAFT' && (
                <button 
                  onClick={() => handleSend(camp.id)}
                  className="text-burgundy hover:scale-110 transition-transform"
                  title="Send Now"
                >
                  <Send size={18} />
                </button>
              )}
              {camp.status === 'ARCHIVED' && (
                <button 
                  onClick={async () => {
                    if (confirm("Restore this broadcast to Draft?")) {
                      await api.updateCampaignStatus(camp.id, 'DRAFT');
                      api.getCampaigns().then(setCampaigns);
                    }
                  }}
                  className="text-ink/20 hover:text-burgundy"
                  title="Restore to Draft"
                >
                  <RotateCcw size={18} />
                </button>
              )}
              {camp.status === 'DRAFT' && (
                <button 
                  onClick={async () => {
                    if (confirm("Permanently delete this draft?")) {
                      await api.deleteCampaign(camp.id);
                      api.getCampaigns().then(setCampaigns);
                    }
                  }}
                  className="text-ink/20 hover:text-burgundy"
                  title="Delete Draft"
                >
                  <Trash2 size={18} />
                </button>
              )}
              {camp.status !== 'ARCHIVED' && camp.status !== 'DRAFT' && (
                <button 
                  onClick={async () => {
                    if (confirm("Archive this broadcast?")) {
                      await api.updateCampaignStatus(camp.id, 'ARCHIVED');
                      api.getCampaigns().then(setCampaigns);
                    }
                  }}
                  className="text-ink/20 hover:text-burgundy"
                  title="Archive"
                >
                  <Archive size={18} />
                </button>
              )}
              {camp.type === 'AB' && (
                <button 
                  onClick={() => viewABResults(camp)}
                  className="text-burgundy hover:scale-110 transition-transform"
                  title="View A/B Results"
                >
                  <Split size={18} />
                </button>
              )}
              <button className="text-ink/20 hover:text-burgundy">
                <MoreHorizontal size={20} />
              </button>
            </div>
          </div>
        ))}

        {campaigns.length === 0 ? (
          <div className="py-32 text-center">
            <p className="font-editorial italic text-5xl text-ink/20">No dispatches yet.</p>
            <button onClick={() => setIsCreating(true)} className="mt-8 text-burgundy font-sans font-black uppercase tracking-widest text-xs hover:underline">
              Create your first broadcast
            </button>
          </div>
        ) : filteredCampaigns.length === 0 && (
          <div className="py-32 text-center">
            <p className="font-editorial italic text-5xl text-ink/20">No matches found.</p>
            {(statusFilter !== 'ALL' || typeFilter !== 'ALL') && (
              <button 
                onClick={() => { setStatusFilter('ALL'); setTypeFilter('ALL'); }}
                className="mt-8 text-burgundy font-sans font-black uppercase tracking-widest text-xs hover:underline"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {previewCampaign && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-10 bg-ink/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-bg border border-ink w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
            >
              <div className="p-6 border-b border-border-hairline flex justify-between items-center bg-surface">
                <div className="flex-1">
                  <h2 className="font-serif text-2xl font-bold">{previewCampaign.name}</h2>
                  <div className="flex items-center gap-4 mt-1">
                    <p className="text-xs font-mono text-ink/40 uppercase">Subject: {previewCampaign.subject}</p>
                    <div className="flex items-center gap-2 border-l border-border-hairline pl-4">
                      <span className="text-[10px] font-black uppercase text-ink/40">Preview as:</span>
                      <select 
                        className="bg-transparent text-[10px] font-mono uppercase outline-none text-burgundy"
                        onChange={(e) => {
                          const contact = contacts.find(c => c.id === e.target.value);
                          setPreviewContact(contact || null);
                        }}
                        value={previewContact?.id || ''}
                      >
                        <option value="">Default (Tokens)</option>
                        {contacts.slice(0, 10).map(c => (
                          <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setPreviewCampaign(null);
                    setPreviewContact(null);
                  }}
                  className="text-ink/40 hover:text-burgundy p-2"
                >
                  ✕
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-10 bg-white">
                <div className="max-w-2xl mx-auto">
                  <div className="prose prose-sm font-serif" dangerouslySetInnerHTML={{ __html: personalizedContent }} />
                </div>
              </div>
              <div className="p-4 border-t border-border-hairline bg-surface text-center">
                <p className="text-[10px] font-mono text-ink/40 uppercase">Editorial Preview Mode</p>
              </div>
            </motion.div>
          </div>
        )}

        {abResults && selectedAbCampaign && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-10 bg-ink/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-bg border border-ink w-full max-w-2xl overflow-hidden flex flex-col shadow-2xl"
            >
              <div className="p-6 border-b border-border-hairline flex justify-between items-center bg-surface">
                <h2 className="font-serif text-2xl font-bold">A/B Test Results: {selectedAbCampaign.name}</h2>
                <button onClick={() => setAbResults(null)} className="text-ink/40 hover:text-burgundy p-2">✕</button>
              </div>
              <div className="p-10 space-y-8">
                <div className="grid grid-cols-2 gap-8">
                  {/* Variation A */}
                  <div className={cn(
                    "relative space-y-4 p-6 border transition-all",
                    (selectedAbCampaign.winnerCriteria === 'OPEN_RATE' ? abResults.variationA.rate > abResults.variationB.rate : abResults.variationA.clicks > abResults.variationB.clicks)
                      ? "border-emerald-500 bg-emerald-50/50"
                      : "border-border-hairline bg-surface"
                  )}>
                    {(selectedAbCampaign.winnerCriteria === 'OPEN_RATE' ? abResults.variationA.rate > abResults.variationB.rate : abResults.variationA.clicks > abResults.variationB.clicks) && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-3 py-1 text-[8px] font-black uppercase tracking-widest rounded-full shadow-lg flex items-center gap-1">
                        <Trophy size={10} />
                        Leading Winner
                      </div>
                    )}
                    <p className="font-sans font-black uppercase tracking-widest text-[10px] text-burgundy">Variation A</p>
                    <p className="font-serif text-lg font-bold">"{selectedAbCampaign.subject}"</p>
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border-hairline">
                      <div className={cn(selectedAbCampaign.winnerCriteria === 'OPEN_RATE' && "text-emerald-600")}>
                        <p className="metric-label">Open Rate</p>
                        <p className="text-2xl font-serif font-bold">{abResults.variationA.rate}%</p>
                      </div>
                      <div className={cn(selectedAbCampaign.winnerCriteria === 'CLICK_RATE' && "text-emerald-600")}>
                        <p className="metric-label">Clicks</p>
                        <p className="text-2xl font-serif font-bold">{abResults.variationA.clicks}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handlePickWinner(selectedAbCampaign.id, 'A')}
                      className={cn(
                        "w-full mt-4 py-2 font-sans font-black uppercase tracking-widest text-[10px] transition-all border",
                        (selectedAbCampaign.winnerCriteria === 'OPEN_RATE' ? abResults.variationA.rate > abResults.variationB.rate : abResults.variationA.clicks > abResults.variationB.clicks)
                          ? "bg-emerald-500 border-emerald-500 text-white hover:bg-emerald-600"
                          : "border-burgundy text-burgundy hover:bg-burgundy hover:text-white"
                      )}
                    >
                      Select as Winner
                    </button>
                  </div>

                  {/* Variation B */}
                  <div className={cn(
                    "relative space-y-4 p-6 border transition-all",
                    (selectedAbCampaign.winnerCriteria === 'OPEN_RATE' ? abResults.variationB.rate > abResults.variationA.rate : abResults.variationB.clicks > abResults.variationA.clicks)
                      ? "border-emerald-500 bg-emerald-50/50"
                      : "border-border-hairline bg-surface"
                  )}>
                    {(selectedAbCampaign.winnerCriteria === 'OPEN_RATE' ? abResults.variationB.rate > abResults.variationA.rate : abResults.variationB.clicks > abResults.variationA.clicks) && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-3 py-1 text-[8px] font-black uppercase tracking-widest rounded-full shadow-lg flex items-center gap-1">
                        <Trophy size={10} />
                        Leading Winner
                      </div>
                    )}
                    <p className="font-sans font-black uppercase tracking-widest text-[10px] text-burgundy">Variation B</p>
                    <p className="font-serif text-lg font-bold">"{selectedAbCampaign.subjectB}"</p>
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border-hairline">
                      <div className={cn(selectedAbCampaign.winnerCriteria === 'OPEN_RATE' && "text-emerald-600")}>
                        <p className="metric-label">Open Rate</p>
                        <p className="text-2xl font-serif font-bold">{abResults.variationB.rate}%</p>
                      </div>
                      <div className={cn(selectedAbCampaign.winnerCriteria === 'CLICK_RATE' && "text-emerald-600")}>
                        <p className="metric-label">Clicks</p>
                        <p className="text-2xl font-serif font-bold">{abResults.variationB.clicks}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handlePickWinner(selectedAbCampaign.id, 'B')}
                      className={cn(
                        "w-full mt-4 py-2 font-sans font-black uppercase tracking-widest text-[10px] transition-all border",
                        (selectedAbCampaign.winnerCriteria === 'OPEN_RATE' ? abResults.variationB.rate > abResults.variationA.rate : abResults.variationB.clicks > abResults.variationA.clicks)
                          ? "bg-emerald-500 border-emerald-500 text-white hover:bg-emerald-600"
                          : "border-burgundy text-burgundy hover:bg-burgundy hover:text-white"
                      )}
                    >
                      Select as Winner
                    </button>
                  </div>
                </div>
                <div className="p-4 bg-ink text-white text-center">
                  <p className="text-[10px] font-mono uppercase tracking-widest">
                    AI Recommendation: <span className="text-emerald-400 font-black">Variation {abResults.variationA.rate > abResults.variationB.rate ? 'A' : 'B'}</span> is performing better based on your {selectedAbCampaign.winnerCriteria === 'OPEN_RATE' ? 'open rate' : 'click rate'} criteria.
                  </p>
                </div>
                <div className="pt-4 border-t border-border-hairline flex justify-center">
                  <button 
                    onClick={handleSimulateAB}
                    disabled={isSimulatingAB}
                    className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-burgundy hover:underline disabled:opacity-50"
                  >
                    <RefreshCw size={12} className={cn(isSimulatingAB && "animate-spin")} />
                    {isSimulatingAB ? 'Simulating...' : 'Simulate Test Results'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {isAiAssistantOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-ink/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-bg border border-ink w-full max-w-lg p-10 shadow-2xl space-y-8"
            >
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-burgundy">
                    <Sparkles size={18} />
                    <span className="text-[10px] font-black uppercase tracking-widest">AI Copywriting Assistant</span>
                  </div>
                  <h2 className="font-serif text-3xl font-bold">Generate Dispatch</h2>
                </div>
                <button onClick={() => { setIsAiAssistantOpen(false); setAiGeneratedResult(null); }} className="text-ink/40 hover:text-burgundy">✕</button>
              </div>

              {!aiGeneratedResult ? (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="metric-label">Content Brief</label>
                    <textarea 
                      className="w-full bg-transparent border border-border-hairline p-4 font-serif text-lg outline-none focus:border-burgundy transition-colors min-h-[120px]"
                      placeholder="What is this email about? (e.g. A weekly newsletter about sustainable fashion with 3 main articles...)"
                      value={aiBrief}
                      onChange={e => setAiBrief(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="metric-label">Editorial Tone</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['Professional', 'Casual', 'Urgent', 'Inspirational', 'Authoritative', 'Minimalist', 'Analytical', 'Empathetic', 'Sophisticated'].map(tone => (
                        <button 
                          key={tone}
                          type="button"
                          onClick={() => setAiTone(tone)}
                          className={cn(
                            "py-2 text-[10px] font-black uppercase tracking-widest border transition-all",
                            aiTone === tone ? "bg-ink text-white border-ink" : "border-border-hairline text-ink/40 hover:border-burgundy hover:text-burgundy"
                          )}
                        >
                          {tone}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 flex gap-4">
                    <button 
                      onClick={handleAiGenerate} 
                      disabled={isAiGenerating || !aiBrief}
                      className="btn-primary flex-1 py-4 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isAiGenerating ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Wand2 size={16} />
                          Generate Content
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="metric-label">Generated Subject Line</label>
                    <input 
                      type="text"
                      className="w-full bg-transparent border border-border-hairline p-3 font-sans font-bold text-sm outline-none focus:border-burgundy transition-colors"
                      value={aiGeneratedResult.subject}
                      onChange={e => setAiGeneratedResult({ ...aiGeneratedResult, subject: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="metric-label">Generated Content</label>
                    <div className="border border-border-hairline p-4 max-h-[40vh] overflow-y-auto custom-scrollbar font-serif text-sm">
                      <div dangerouslySetInnerHTML={{ __html: aiGeneratedResult.content }} />
                    </div>
                  </div>
                  <div className="pt-4 flex gap-4">
                    <button 
                      onClick={() => setAiGeneratedResult(null)} 
                      className="px-6 py-3 border border-ink text-ink text-[10px] font-black uppercase tracking-widest hover:bg-ink/5 transition-colors"
                    >
                      Discard
                    </button>
                    <button 
                      onClick={applyAiContent} 
                      className="btn-primary flex-1 py-3 flex items-center justify-center gap-2"
                    >
                      <Check size={16} /> Apply to Broadcast
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Templates = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newTemplate, setNewTemplate] = useState({ name: '', content: '', category: 'Editorial' });

  useEffect(() => {
    api.getTemplates().then(setTemplates);
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.addTemplate(newTemplate);
    setIsAdding(false);
    setNewTemplate({ name: '', content: '', category: 'Editorial' });
    api.getTemplates().then(setTemplates);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Delete this template?")) {
      await api.deleteTemplate(id);
      api.getTemplates().then(setTemplates);
    }
  };

  return (
    <div className="space-y-12">
      <SectionHeader 
        title="Templates" 
        subtitle="Manage reusable editorial structures for your dispatches."
        guideKey="templates-library"
        action={
          <button onClick={() => setIsAdding(true)} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> New Template
          </button>
        }
      />

      <AnimatePresence>
        {isAdding && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-surface border border-border-hairline p-10 space-y-6"
          >
            <div className="flex justify-between items-start">
              <h2 className="text-4xl font-serif font-bold">Create Template</h2>
              <button onClick={() => setIsAdding(false)} className="text-ink/40 hover:text-burgundy">✕</button>
            </div>
            <form onSubmit={handleAdd} className="space-y-6">
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="metric-label">Template Name</label>
                  <input 
                    type="text" 
                    className="w-full bg-transparent border-b border-border-hairline py-2 font-serif text-2xl outline-none focus:border-burgundy"
                    value={newTemplate.name}
                    onChange={e => setNewTemplate({...newTemplate, name: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="metric-label">Category</label>
                  <input 
                    type="text" 
                    className="w-full bg-transparent border-b border-border-hairline py-2 font-serif text-2xl outline-none focus:border-burgundy"
                    value={newTemplate.category}
                    onChange={e => setNewTemplate({...newTemplate, category: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="metric-label">Content Structure</label>
                <ReactQuill 
                  theme="snow" 
                  value={newTemplate.content}
                  onChange={val => setNewTemplate({...newTemplate, content: val})}
                />
              </div>
              <button type="submit" className="btn-primary px-8 py-3">Save Template</button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {templates.map(template => (
          <div key={template.id} className="bg-surface border border-border-hairline p-8 space-y-4 group hover:border-burgundy transition-all">
            <div className="flex justify-between items-start">
              <span className="text-[9px] font-black uppercase tracking-widest text-burgundy bg-burgundy/5 px-2 py-0.5 border border-burgundy/10">
                {template.category || 'General'}
              </span>
              <button onClick={() => handleDelete(template.id)} className="text-ink/20 hover:text-burgundy opacity-0 group-hover:opacity-100 transition-opacity">
                <Trash2 size={16} />
              </button>
            </div>
            <h3 className="font-serif text-2xl font-bold">{template.name}</h3>
            <div className="h-32 overflow-hidden relative">
              <div className="text-xs text-ink/40 leading-relaxed" dangerouslySetInnerHTML={{ __html: template.content }} />
              <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-surface to-transparent" />
            </div>
            <div className="pt-4 flex justify-between items-center">
              <span className="text-[9px] font-mono text-ink/30 uppercase">Created {format(new Date(template.createdAt), 'MMM d, yyyy')}</span>
              <Link to={`/campaigns?templateId=${template.id}`} className="text-[10px] font-black uppercase tracking-widest text-burgundy hover:underline">Use Template</Link>
            </div>
          </div>
        ))}
      </div>

      {templates.length === 0 && !isAdding && (
        <div className="py-32 text-center">
          <p className="font-editorial italic text-5xl text-ink/20">No templates defined.</p>
        </div>
      )}
    </div>
  );
};

const CampaignDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [analytics, setAnalytics] = useState<any>(null);
  const [engagement, setEngagement] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'ENGAGEMENT'>('OVERVIEW');

  useEffect(() => {
    if (id) {
      Promise.all([
        api.getCampaignAnalytics(id),
        api.getEngagementAnalytics(id)
      ]).then(([analyticsRes, engagementRes]) => {
        setAnalytics(analyticsRes);
        setEngagement(engagementRes);
        setLoading(false);
      });
    }
  }, [id]);

  if (loading) return <div className="p-20 text-center font-editorial italic text-3xl">Loading analytics...</div>;
  if (!analytics) return <div className="p-20 text-center font-editorial italic text-3xl">Campaign not found.</div>;

  const { campaign, stats, timeSeries, deviceData } = analytics;

  const scrollData = engagement?.events
    ?.filter((e: any) => e.type === 'scroll')
    ?.reduce((acc: any, e: any) => {
      const depth = Math.floor(e.value / 10) * 10;
      acc[depth] = (acc[depth] || 0) + 1;
      return acc;
    }, {});

  const heatmapData = Object.entries(scrollData || {}).map(([depth, count]) => ({
    depth: `${depth}%`,
    count
  })).sort((a, b) => parseInt(a.depth) - parseInt(b.depth));

  return (
    <div className="space-y-12">
      <div className="flex justify-between items-start border-b border-ink pb-8">
        <div className="space-y-2">
          <div className="flex items-center gap-4">
            <Link to="/campaigns" className="text-[10px] font-black uppercase tracking-widest text-burgundy hover:underline">← Back to Broadcasts</Link>
            <span className={cn(
              "px-2 py-0.5 text-[9px] font-black uppercase tracking-widest border",
              campaign.status === 'SENT' ? "border-status-success text-status-success" :
              campaign.status === 'SCHEDULED' ? "border-status-scheduled text-status-scheduled" :
              "border-status-draft text-status-draft"
            )}>
              {campaign.status}
            </span>
          </div>
          <h1 className="text-6xl font-serif font-bold text-ink">{campaign.name}</h1>
          <p className="text-xl font-editorial italic text-ink/60">{campaign.subject}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right space-y-1 mr-8">
            <p className="metric-label">Sent on</p>
            <p className="font-mono text-sm uppercase">{campaign.sentAt ? format(new Date(campaign.sentAt), 'MMMM d, yyyy HH:mm') : 'Not sent yet'}</p>
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
          onClick={() => setActiveTab('OVERVIEW')}
          className={cn(
            "pb-4 text-[10px] font-black uppercase tracking-widest transition-all border-b-2",
            activeTab === 'OVERVIEW' ? "border-burgundy text-ink" : "border-transparent text-ink/40 hover:text-ink"
          )}
        >
          Overview
        </button>
        <button 
          onClick={() => setActiveTab('ENGAGEMENT')}
          className={cn(
            "pb-4 text-[10px] font-black uppercase tracking-widest transition-all border-b-2",
            activeTab === 'ENGAGEMENT' ? "border-burgundy text-ink" : "border-transparent text-ink/40 hover:text-ink"
          )}
        >
          Engagement Heatmap
        </button>
      </div>

      {activeTab === 'OVERVIEW' ? (
        <div className="newspaper-grid">
          <div className="col-span-12 lg:col-span-8 space-y-12 pr-8 lg:border-r border-border-hairline">
            <div className="grid grid-cols-3 gap-8">
              <div className="space-y-2">
                <p className="metric-label">Open Rate</p>
                <p className="text-5xl font-serif font-bold">{Math.round((stats.opened / stats.sent) * 100)}%</p>
                <p className="text-[10px] font-mono text-ink/40 uppercase">{stats.opened} Opens</p>
              </div>
              <div className="space-y-2">
                <p className="metric-label">Click Rate</p>
                <p className="text-5xl font-serif font-bold">{Math.round((stats.clicked / stats.opened) * 100)}%</p>
                <p className="text-[10px] font-mono text-ink/40 uppercase">{stats.clicked} Clicks</p>
              </div>
              <div className="space-y-2">
                <p className="metric-label">Conversion</p>
                <p className="text-5xl font-serif font-bold">{Math.round((stats.conversions / stats.clicked) * 100)}%</p>
                <p className="text-[10px] font-mono text-ink/40 uppercase">{stats.conversions} Orders</p>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="font-sans font-black uppercase tracking-widest text-xs border-b border-ink pb-2">Engagement Over Time</h3>
              <div className="h-80 bg-surface/30 p-6 border border-border-hairline">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timeSeries}>
                    <defs>
                      <linearGradient id="colorOpens" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8B1A1A" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#8B1A1A" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#D4CFC6" />
                    <XAxis dataKey="timestamp" axisLine={false} tickLine={false} tick={{fontSize: 10, fontFamily: 'Courier Prime'}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontFamily: 'Courier Prime'}} />
                    <Tooltip />
                    <Area type="monotone" dataKey="opens" stroke="#8B1A1A" fillOpacity={1} fill="url(#colorOpens)" strokeWidth={2} />
                    <Area type="monotone" dataKey="clicks" stroke="#D4CFC6" fillOpacity={0} strokeWidth={2} strokeDasharray="5 5" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="font-sans font-black uppercase tracking-widest text-xs border-b border-ink pb-2">Content Preview</h3>
              <div className="bg-white border border-border-hairline p-10 shadow-sm max-w-2xl mx-auto">
                <div className="prose prose-sm font-serif" dangerouslySetInnerHTML={{ __html: campaign.content }} />
              </div>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-4 space-y-12">
            <div className="space-y-6">
              <h3 className="font-sans font-black uppercase tracking-widest text-xs border-b border-ink pb-2">Device Distribution</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={deviceData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#D4CFC6" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 10, fontFamily: 'Courier Prime'}} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#8B1A1A" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-surface p-8 space-y-6">
              <h3 className="font-serif text-2xl font-bold">Audience Sentiment</h3>
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
                "This broadcast performed 15% better than your average editorial dispatch. The subject line resonance was particularly high among mobile readers."
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
                  {Math.floor(engagement.summary.totalReadTime / (engagement.events.filter((e: any) => e.type === 'read_time').length || 1))}s
                </p>
                <p className="text-[10px] font-mono text-ink/40 uppercase">Based on {engagement.events.filter((e: any) => e.type === 'read_time').length} sessions</p>
              </div>
              <div className="space-y-2">
                <p className="metric-label">Avg. Scroll Depth</p>
                <p className="text-5xl font-serif font-bold">{Math.round(engagement.summary.avgScrollDepth)}%</p>
                <p className="text-[10px] font-mono text-ink/40 uppercase">Completion Rate</p>
              </div>
            </div>

            <div className="space-y-8">
              <h3 className="font-sans font-black uppercase tracking-widest text-xs border-b border-ink pb-2">Scroll Depth Distribution</h3>
              <div className="h-96 bg-surface/30 p-8 border border-border-hairline">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={heatmapData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#D4CFC6" />
                    <XAxis dataKey="depth" axisLine={false} tickLine={false} tick={{fontSize: 10, fontFamily: 'Courier Prime'}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontFamily: 'Courier Prime'}} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1A1814', border: 'none', color: '#fff' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Bar dataKey="count" fill="#8B1A1A" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="space-y-8">
              <h3 className="font-sans font-black uppercase tracking-widest text-xs border-b border-ink pb-2">Reader Drop-off Heatmap</h3>
              <div className="relative border border-border-hairline bg-white p-12 overflow-hidden">
                <div className="prose prose-sm font-serif opacity-20 select-none pointer-events-none" dangerouslySetInnerHTML={{ __html: campaign.content }} />
                
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
                        <span className="text-[8px] font-mono font-bold text-burgundy">{depth}% Depth</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-4 space-y-12">
            <div className="bg-ink text-white p-8 space-y-8">
              <h3 className="font-serif text-2xl font-bold">Engagement Insights</h3>
              <div className="space-y-6">
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase text-white/40">Retention Score</p>
                  <div className="flex items-end gap-2">
                    <p className="text-4xl font-serif font-bold">High</p>
                    <p className="text-xs text-status-success mb-1">Top 5%</p>
                  </div>
                </div>
                <p className="text-xs text-white/60 leading-relaxed italic">
                  "Readers are spending an average of 45 seconds on the first three paragraphs. There is a significant drop-off at the 60% mark, suggesting the conclusion could be more concise."
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="font-sans font-black uppercase tracking-widest text-xs border-b border-ink pb-2">Section Performance</h3>
              <div className="space-y-4">
                {Object.entries(engagement.summary.sectionEngagement).map(([id, data]: any) => (
                  <div key={id} className="flex justify-between items-center border-b border-border-hairline pb-2">
                    <div>
                      <p className="text-[10px] font-black uppercase text-ink/60">Section {id}</p>
                      <p className="text-xs font-bold">{data.views} Views</p>
                    </div>
                    <p className="font-mono text-sm">{data.readTime}s</p>
                  </div>
                ))}
                {Object.keys(engagement.summary.sectionEngagement).length === 0 && (
                  <p className="text-xs font-editorial italic text-ink/40">No section data available.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const FunnelStepNode = ({ data }: any) => {
  return (
    <div className="bg-surface border-2 border-ink p-4 min-w-[180px] shadow-[4px_4px_0px_0px_rgba(26,24,20,1)]">
      <Handle type="target" position={Position.Top} className="!bg-ink !w-2 !h-2" />
      <div className="space-y-2">
        <div className="flex justify-between items-center border-b border-ink/10 pb-1">
          <p className="text-[8px] font-black uppercase tracking-widest text-ink/40">Step {data.index + 1}</p>
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
  const initialNodes: Node[] = initialSteps.map((step, i) => ({
    id: `step-${i}`,
    type: 'funnelStep',
    position: { x: 350, y: i * 150 },
    data: { ...step, index: i },
  }));

  const initialEdges: Edge[] = initialSteps.slice(0, -1).map((_, i) => ({
    id: `edge-${i}`,
    source: `step-${i}`,
    target: `step-${i + 1}`,
    animated: true,
    style: { stroke: '#1A1814', strokeWidth: 2 },
  }));

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);

  const onConnect = (params: Connection) => setEdges((eds) => addEdge(params, eds));

  const onDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  const onDrop = (event: React.DragEvent) => {
    event.preventDefault();
    if (!reactFlowInstance) return;

    const type = event.dataTransfer.getData('application/reactflow');
    const label = event.dataTransfer.getData('application/reactflow-label');

    if (typeof type === 'undefined' || !type) return;

    const position = reactFlowInstance.screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });

    const newNode: Node = {
      id: `step-${nodes.length}-${Date.now()}`,
      type: 'funnelStep',
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
          <p className="text-[10px] font-black uppercase tracking-widest text-ink/40">Step Library</p>
          <p className="text-[9px] text-ink/60">Drag events onto the canvas to architect your funnel.</p>
        </div>

        <div className="space-y-4">
          {[
            { label: 'Email Sent', type: 'funnelStep' },
            { label: 'Email Opened', type: 'funnelStep' },
            { label: 'Link Clicked', type: 'funnelStep' },
            { label: 'Page Viewed', type: 'funnelStep' },
            { label: 'Added to Cart', type: 'funnelStep' },
            { label: 'Checkout Started', type: 'funnelStep' },
            { label: 'Order Placed', type: 'funnelStep' },
          ].map((item) => (
            <div
              key={item.label}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('application/reactflow', item.type);
                e.dataTransfer.setData('application/reactflow-label', item.label);
                e.dataTransfer.effectAllowed = 'move';
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
              "Based on your industry, adding a 'Wishlist' step before 'Add to Cart' typically increases final conversion by 12%."
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

const Reports = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [ongoingCampaigns, setOngoingCampaigns] = useState<Campaign[]>([]);
  const [activeFlows, setActiveFlows] = useState<Flow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'REALTIME' | 'PERFORMANCE' | 'DELIVERABILITY' | 'FUNNEL' | 'COHORTS' | 'ATTRIBUTION' | 'GAP_ANALYSIS' | 'PREDICTIVE_AI'>('REALTIME');
  const [funnelMode, setFunnelMode] = useState<'VISUAL' | 'BUILDER'>('VISUAL');
  const [deliverability, setDeliverability] = useState<any>(null);
  const [funnel, setFunnel] = useState<any[]>([]);
  const [cohorts, setCohorts] = useState<any[]>([]);
  const [attribution, setAttribution] = useState<any[]>([]);
  const [attributionModel, setAttributionModel] = useState<'LAST_CLICK' | 'FIRST_CLICK' | 'LINEAR'>('LAST_CLICK');
  const [realtimeData, setRealtimeData] = useState<any[]>([]);
  const [liveEvents, setLiveEvents] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const [camps, flows, deliv, fun, coh, attr] = await Promise.all([
        api.getCampaigns(),
        api.getFlows(),
        api.getDeliverabilityAnalytics(),
        api.getFunnelAnalytics(),
        api.getCohortAnalytics(),
        api.getRevenueAttribution(attributionModel)
      ]);
      setCampaigns(camps.filter(c => c.status === 'SENT'));
      setOngoingCampaigns(camps.filter(c => c.status === 'SENDING' || c.status === 'SCHEDULED'));
      setActiveFlows(flows.filter(f => f.status === 'ACTIVE'));
      setDeliverability(deliv);
      setFunnel(fun);
      setCohorts(coh);
      setAttribution(attr);
      
      // Mock real-time data
      const mockRealtime = Array.from({ length: 20 }, (_, i) => ({
        time: format(new Date(Date.now() - (19 - i) * 60000), 'HH:mm'),
        opens: Math.floor(Math.random() * 50) + 10,
        clicks: Math.floor(Math.random() * 20) + 5,
        conversions: Math.floor(Math.random() * 5)
      }));
      setRealtimeData(mockRealtime);

      const mockEvents = [
        { user: 'Sarah K.', action: 'Opened "Spring Collection"', time: 'Just now', icon: <Eye size={12} />, type: 'OPEN' },
        { user: 'John D.', action: 'Clicked "Buy Now"', time: '2m ago', icon: <MousePointerClick size={12} />, type: 'CLICK' },
        { user: 'Elena R.', action: 'Purchased "Linen Shirt"', time: '4m ago', icon: <ShoppingBag size={12} />, type: 'CONVERSION' },
        { user: 'Marcus T.', action: 'Joined "VIP Segment"', time: '7m ago', icon: <Users2 size={12} />, type: 'JOIN' },
      ];
      setLiveEvents(mockEvents);
      
      setLoading(false);
    };
    fetchData();

    const interval = setInterval(() => {
      setRealtimeData(prev => {
        const next = [...prev.slice(1), {
          time: format(new Date(), 'HH:mm'),
          opens: Math.floor(Math.random() * 50) + 10,
          clicks: Math.floor(Math.random() * 20) + 5,
          conversions: Math.floor(Math.random() * 5)
        }];
        return next;
      });

      // Update live events occasionally
      if (Math.random() > 0.7) {
        const users = ['Alice W.', 'Bob M.', 'Charlie P.', 'Diana L.', 'Edward S.'];
        const actions = [
          { label: 'Opened "Weekly Digest"', icon: <Eye size={12} />, type: 'OPEN' },
          { label: 'Clicked "Read More"', icon: <MousePointerClick size={12} />, type: 'CLICK' },
          { label: 'Unsubscribed', icon: <X size={12} />, type: 'UNSUBSCRIBE' },
          { label: 'Completed Flow', icon: <CheckCircle2 size={12} />, type: 'FLOW' }
        ];
        const randomUser = users[Math.floor(Math.random() * users.length)];
        const randomAction = actions[Math.floor(Math.random() * actions.length)];
        
        setLiveEvents(prev => [
          { user: randomUser, action: randomAction.label, time: 'Just now', icon: randomAction.icon, type: randomAction.type },
          ...prev.slice(0, 5)
        ]);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [attributionModel]);

  if (loading) return <div className="p-20 text-center font-editorial italic text-3xl">Loading Intelligence Hub...</div>;

  return (
    <div className="space-y-12">
      <SectionHeader 
        title="Intelligence Hub" 
        subtitle="Aggregate insights and performance data across your editorial network."
        guideKey="reports-analytics"
      />

      <div className="flex gap-8 border-b border-ink pb-2 overflow-x-auto no-scrollbar">
        {[
          { id: 'REALTIME', label: 'Real-time Dashboard' },
          { id: 'PERFORMANCE', label: 'Broadcast Performance' },
          { id: 'DELIVERABILITY', label: 'Deliverability' },
          { id: 'FUNNEL', label: 'Funnel Analytics' },
          { id: 'COHORTS', label: 'Cohort Analysis' },
          { id: 'ATTRIBUTION', label: 'Revenue Attribution' },
          { id: 'PREDICTIVE_AI', label: 'Predictive AI' },
          { id: 'GAP_ANALYSIS', label: 'Enterprise GAP Analysis' },
        ].map(tab => (
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
              <motion.div layoutId="activeTab" className="absolute -bottom-[9px] left-0 w-full h-[1px] bg-burgundy" />
            )}
          </button>
        ))}
      </div>

      {activeTab === 'REALTIME' && (
        <div className="space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="bg-surface border border-border-hairline p-8 space-y-2 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-2">
                <div className="w-2 h-2 bg-status-success rounded-full animate-pulse" />
              </div>
              <p className="metric-label">Active Signals</p>
              <p className="text-4xl font-serif font-bold">1,420</p>
              <p className="text-[10px] font-mono text-ink/40 uppercase">Live in last 5 mins</p>
              <div className="absolute bottom-0 left-0 w-full h-1 bg-status-success/10">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: '65%' }}
                  className="h-full bg-status-success"
                />
              </div>
            </div>
            <div className="bg-surface border border-border-hairline p-8 space-y-2">
              <p className="metric-label">Real-time Opens</p>
              <p className="text-4xl font-serif font-bold">{realtimeData.reduce((acc, d) => acc + d.opens, 0)}</p>
              <p className="text-[10px] font-mono text-ink/40 uppercase">Last 20 minutes</p>
            </div>
            <div className="bg-surface border border-border-hairline p-8 space-y-2">
              <p className="metric-label">Real-time Clicks</p>
              <p className="text-4xl font-serif font-bold">{realtimeData.reduce((acc, d) => acc + d.clicks, 0)}</p>
              <p className="text-[10px] font-mono text-ink/40 uppercase">Last 20 minutes</p>
            </div>
            <div className="bg-surface border border-border-hairline p-8 space-y-2">
              <p className="metric-label">Active Automations</p>
              <p className="text-4xl font-serif font-bold">{activeFlows.length}</p>
              <p className="text-[10px] font-mono text-ink/40 uppercase">Currently processing</p>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-8">
            <div className="col-span-12 lg:col-span-8 space-y-8">
              <div className="bg-surface border border-border-hairline p-8">
                <div className="flex justify-between items-center mb-8 border-b border-ink pb-4">
                  <h3 className="font-sans font-black uppercase tracking-widest text-xs">Live Engagement Stream</h3>
                  <div className="flex items-center gap-2 text-[10px] font-mono uppercase text-ink/40">
                    <RefreshCw size={12} className="animate-spin" />
                    Updating Live
                  </div>
                </div>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={realtimeData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#D4CFC6" vertical={false} />
                      <XAxis dataKey="time" stroke="#1A1814" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#1A1814" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#F5F2EC', border: '1px solid #1A1814', borderRadius: 0 }}
                        itemStyle={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold' }}
                      />
                      <Area type="monotone" dataKey="opens" stroke="#8B0000" fill="#8B0000" fillOpacity={0.1} strokeWidth={2} />
                      <Area type="monotone" dataKey="clicks" stroke="#2D5A27" fill="#2D5A27" fillOpacity={0.1} strokeWidth={2} />
                      <Area type="monotone" dataKey="conversions" stroke="#C9A84C" fill="#C9A84C" fillOpacity={0.1} strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-surface border border-border-hairline p-8">
                <h3 className="font-sans font-black uppercase tracking-widest text-xs border-b border-ink pb-4 mb-6">Ongoing Dispatches</h3>
                {ongoingCampaigns.length > 0 ? (
                  <div className="space-y-6">
                    {ongoingCampaigns.map(camp => (
                      <div key={camp.id} className="space-y-3">
                        <div className="flex justify-between items-end">
                          <div>
                            <p className="text-xs font-bold">{camp.name}</p>
                            <p className="text-[10px] font-mono text-ink/40 uppercase">Status: <span className="text-burgundy">{camp.status}</span></p>
                          </div>
                          <p className="text-[10px] font-mono text-ink/40 uppercase">Progress: 64%</p>
                        </div>
                        <div className="h-1.5 bg-bg border border-border-hairline overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: '64%' }}
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
                  <p className="text-center py-10 font-editorial italic text-ink/20">No dispatches currently in flight.</p>
                )}
              </div>
            </div>

            <div className="col-span-12 lg:col-span-4 space-y-8">
              <div className="bg-surface border border-border-hairline p-8">
                <h3 className="font-sans font-black uppercase tracking-widest text-xs border-b border-ink pb-4 mb-6 flex items-center justify-between">
                  Live Activity Ticker
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
                          <div className={cn(
                            "w-8 h-8 flex items-center justify-center",
                            item.type === 'CONVERSION' ? "bg-brass text-white" : "bg-burgundy/10 text-burgundy"
                          )}>
                            {item.icon}
                          </div>
                          <div>
                            <p className="text-xs font-bold">{item.user}</p>
                            <p className="text-[10px] text-ink/60 italic">{item.action}</p>
                          </div>
                        </div>
                        <span className="text-[9px] font-mono text-ink/40 uppercase whitespace-nowrap">{item.time}</span>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>

              <div className="bg-surface border border-border-hairline p-8">
                <h3 className="font-sans font-black uppercase tracking-widest text-xs border-b border-ink pb-4 mb-6">Automation Health</h3>
                <div className="space-y-6">
                  {activeFlows.slice(0, 4).map((flow, i) => (
                    <div key={flow.id} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <p className="text-xs font-bold">{flow.name}</p>
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-status-success/10 text-status-success">Healthy</span>
                      </div>
                      <div className="h-1 bg-ink/5 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.floor(Math.random() * 40) + 40}%` }}
                          className="h-full bg-ink transition-all duration-1000" 
                        />
                      </div>
                    </div>
                  ))}
                  {activeFlows.length === 0 && (
                    <p className="text-center py-4 font-editorial italic text-ink/20 text-sm">No active automations.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'PERFORMANCE' && (
        <div className="space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="bg-surface border border-border-hairline p-8 space-y-2">
          <p className="metric-label">Avg. Open Rate</p>
          <p className="text-4xl font-serif font-bold">28.4%</p>
          <p className="text-[10px] font-mono text-status-success uppercase">↑ 2.1% vs last month</p>
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
          <p className="text-[10px] font-mono text-status-success uppercase">New signals detected</p>
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="font-sans font-black uppercase tracking-widest text-xs border-b border-ink pb-2">Broadcast Performance Archive</h3>
        <div className="grid grid-cols-12 gap-4 border-b-2 border-ink pb-4 px-4">
          <div className="col-span-5 metric-label">Broadcast</div>
          <div className="col-span-2 metric-label">Opens</div>
          <div className="col-span-2 metric-label">Clicks</div>
          <div className="col-span-2 metric-label">Conversion</div>
          <div className="col-span-1"></div>
        </div>
        
        {campaigns.map((camp) => (
          <div key={camp.id} className="grid grid-cols-12 gap-4 items-center py-6 px-4 hover:bg-surface transition-colors group border-b border-border-hairline">
            <div className="col-span-5">
              <Link to={`/campaigns/${camp.id}`}>
                <h3 className="font-serif text-xl font-bold group-hover:text-burgundy transition-colors">{camp.name}</h3>
              </Link>
              <p className="text-[10px] text-ink/40 font-mono mt-1 uppercase">Sent {format(new Date(camp.sentAt || camp.createdAt), 'MMM d, yyyy')}</p>
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

      {activeTab === 'DELIVERABILITY' && deliverability && (
        <div className="space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-surface border border-border-hairline p-8 space-y-2">
              <p className="metric-label">Inbox Placement</p>
              <p className="text-4xl font-serif font-bold text-status-success">{deliverability.inboxPlacement}%</p>
              <p className="text-[10px] font-mono text-ink/40 uppercase">Primary Inbox</p>
            </div>
            <div className="bg-surface border border-border-hairline p-8 space-y-2">
              <p className="metric-label">Spam Placement</p>
              <p className="text-4xl font-serif font-bold text-status-warning">{deliverability.spamPlacement}%</p>
              <p className="text-[10px] font-mono text-ink/40 uppercase">Filtered as Spam</p>
            </div>
            <div className="bg-surface border border-border-hairline p-8 space-y-2">
              <p className="metric-label">Bounce Rate</p>
              <p className="text-4xl font-serif font-bold">{deliverability.bounceRate}%</p>
              <p className="text-[10px] font-mono text-ink/40 uppercase">Undeliverable Signals</p>
            </div>
          </div>

          <div className="bg-surface border border-border-hairline p-8">
            <h3 className="font-sans font-black uppercase tracking-widest text-xs border-b border-ink pb-4 mb-8">Reputation Over Time</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={deliverability.timeSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#D4CFC6" vertical={false} />
                  <XAxis dataKey="date" stroke="#1A1814" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#1A1814" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#F5F2EC', border: '1px solid #1A1814', borderRadius: 0 }}
                    itemStyle={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold' }}
                  />
                  <Area type="monotone" dataKey="inbox" stroke="#2D5A27" fill="#2D5A27" fillOpacity={0.1} />
                  <Area type="monotone" dataKey="spam" stroke="#9B4A1A" fill="#9B4A1A" fillOpacity={0.1} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'FUNNEL' && funnel.length > 0 && (
        <div className="space-y-12">
          <div className="flex justify-between items-end border-b border-ink pb-6">
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-ink/40">Analytics View</p>
              <h2 className="text-4xl font-serif font-bold">Funnel Architecture</h2>
            </div>
            <div className="flex gap-4">
              <button 
                onClick={() => setFunnelMode('VISUAL')}
                className={cn(
                  "px-6 py-2 text-[10px] font-black uppercase tracking-widest border transition-all",
                  funnelMode === 'VISUAL' ? "bg-ink text-white border-ink" : "border-border-hairline text-ink/40 hover:bg-bg"
                )}
              >
                Visualizer
              </button>
              <button 
                onClick={() => setFunnelMode('BUILDER')}
                className={cn(
                  "px-6 py-2 text-[10px] font-black uppercase tracking-widest border transition-all",
                  funnelMode === 'BUILDER' ? "bg-ink text-white border-ink" : "border-border-hairline text-ink/40 hover:bg-bg"
                )}
              >
                Builder
              </button>
            </div>
          </div>

          {funnelMode === 'BUILDER' ? (
            <div className="space-y-8">
              <div className="bg-surface border border-border-hairline p-8">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="font-sans font-black uppercase tracking-widest text-xs">Draggable Funnel Designer</h3>
                  <div className="flex gap-2">
                    <button className="px-4 py-2 bg-ink text-white text-[10px] font-black uppercase tracking-widest">Save Configuration</button>
                    <button className="px-4 py-2 border border-border-hairline text-[10px] font-black uppercase tracking-widest hover:bg-bg">Reset</button>
                  </div>
                </div>
                <FunnelBuilder initialSteps={funnel} />
              </div>
            </div>
          ) : (
            <div className="newspaper-grid">
              <div className="col-span-12 lg:col-span-8 bg-surface border border-border-hairline p-8">
                <div className="flex justify-between items-center border-b border-ink pb-4 mb-8">
                  <h3 className="font-sans font-black uppercase tracking-widest text-xs">Conversion Funnel</h3>
                  <button 
                    onClick={() => setFunnelMode('BUILDER')}
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
                          <span className="w-5 h-5 bg-ink text-white text-[10px] flex items-center justify-center font-bold">{i + 1}</span>
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
                          <p className="text-[9px] font-black uppercase text-burgundy">Drop-off: {(funnel[i].percentage - funnel[i+1].percentage).toFixed(1)}%</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="col-span-12 lg:col-span-4 space-y-8">
                <div className="bg-ink text-white p-8 space-y-6">
                  <h3 className="font-serif text-2xl font-bold">Efficiency Hub</h3>
                  <div className="space-y-4">
                    <div className="border-b border-white/10 pb-4">
                      <p className="text-[10px] font-black uppercase text-white/40">Open-to-Click Rate</p>
                      <p className="text-3xl font-serif font-bold">14.8%</p>
                    </div>
                    <div className="border-b border-white/10 pb-4">
                      <p className="text-[10px] font-black uppercase text-white/40">Click-to-Convert Rate</p>
                      <p className="text-3xl font-serif font-bold">28.5%</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-white/40">Overall Efficiency</p>
                      <p className="text-3xl font-serif font-bold">1.2%</p>
                    </div>
                  </div>
                </div>
                <div className="bg-surface border border-border-hairline p-8 space-y-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-ink/40">Optimization Suggestion</p>
                  <p className="text-xs font-editorial italic text-ink/80 leading-relaxed">
                    "The largest drop-off (18.6%) occurs between 'Opened' and 'Clicked'. Consider A/B testing your call-to-action buttons to improve transition rates."
                  </p>
                  <button className="text-[10px] font-black uppercase text-burgundy hover:underline">Run AI Optimization</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'COHORTS' && cohorts.length > 0 && (
        <div className="space-y-12">
          {(() => {
            const maxMonths = Math.max(...cohorts.map(c => c.retention.length));
            const cohortChartData = Array.from({ length: maxMonths }).map((_, i) => {
              const point: any = { month: `M${i}` };
              cohorts.forEach(cohort => {
                if (cohort.retention[i] !== undefined) {
                  point[cohort.month] = cohort.retention[i];
                }
              });
              return point;
            });
            const colors = ['#8B1A1A', '#1A1814', '#D4CFC6', '#2D5A27', '#9B4A1A', '#4A1A9B'];

            return (
              <>
                <div className="flex justify-between items-end border-b border-ink pb-6">
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-ink/40">Retention Analysis</p>
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
                    <h3 className="font-sans font-black uppercase tracking-widest text-xs">Retention Matrix (Heatmap)</h3>
                    <p className="text-[10px] font-mono text-ink/40 uppercase">Last updated: {new Date().toLocaleDateString()}</p>
                  </div>
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-bg">
                        <th className="p-6 metric-label border border-border-hairline">Cohort</th>
                        <th className="p-6 metric-label border border-border-hairline">Size</th>
                        {Array.from({ length: maxMonths }).map((_, m) => (
                          <th key={m} className="p-6 metric-label border border-border-hairline text-center">Month {m}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-hairline">
                      {cohorts.map((cohort: any) => (
                        <tr key={cohort.month} className="group">
                          <td className="p-6 font-serif font-bold border border-border-hairline bg-bg/20 group-hover:bg-bg transition-colors">{cohort.month}</td>
                          <td className="p-6 font-mono text-xs border border-border-hairline text-ink/60">{cohort.size.toLocaleString()}</td>
                          {cohort.retention.map((ret: number, i: number) => (
                            <td 
                              key={i} 
                              className="p-6 border border-border-hairline font-mono text-xs text-center transition-all hover:scale-105 hover:z-10 relative cursor-default"
                              style={{ 
                                backgroundColor: `rgba(139, 26, 26, ${ret / 100})`,
                                color: ret > 50 ? 'white' : 'black',
                                fontWeight: ret > 70 ? 'bold' : 'normal'
                              }}
                            >
                              <span className="relative z-10">{ret}%</span>
                              {ret > 80 && (
                                <div className="absolute inset-0 border-2 border-white/20 pointer-events-none" />
                              )}
                            </td>
                          ))}
                          {Array.from({ length: maxMonths - cohort.retention.length }).map((_, i) => (
                            <td key={i} className="p-6 border border-border-hairline bg-bg/30"></td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="newspaper-grid">
                  <div className="col-span-12 lg:col-span-8 bg-surface border border-border-hairline p-8">
                    <h3 className="font-sans font-black uppercase tracking-widest text-xs border-b border-ink pb-4 mb-8">Engagement Curves (All Cohorts)</h3>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={cohortChartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#D4CFC6" vertical={false} />
                          <XAxis dataKey="month" stroke="#1A1814" fontSize={10} tickLine={false} axisLine={false} />
                          <YAxis stroke="#1A1814" fontSize={10} tickLine={false} axisLine={false} unit="%" />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#F5F2EC', border: '1px solid #1A1814', borderRadius: 0 }}
                            itemStyle={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold' }}
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
                  <div className="col-span-12 lg:col-span-4 bg-ink text-white p-8 space-y-6">
                    <h3 className="font-serif text-2xl font-bold">Retention Insights</h3>
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase text-white/40">Top Performing Cohort</p>
                        <p className="text-xl font-bold">{cohorts.sort((a: any, b: any) => (b.retention[1] || 0) - (a.retention[1] || 0))[0].month}</p>
                        <p className="text-[10px] font-mono text-status-success uppercase">Highest Month 1 Retention</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase text-white/40">Avg. 3-Month Retention</p>
                        <p className="text-xl font-bold">
                          {(cohorts.reduce((acc: number, c: any) => acc + (c.retention[3] || 0), 0) / cohorts.filter((c: any) => c.retention[3] !== undefined).length).toFixed(1)}%
                        </p>
                        <p className="text-[10px] font-mono text-white/40 uppercase">Across all valid signals</p>
                      </div>
                      <div className="pt-4 border-t border-white/10">
                        <p className="text-xs font-editorial italic text-white/60 leading-relaxed">
                          "Your Dec 2023 cohort shows a significantly higher long-term retention curve. Analyzing the acquisition source for this period could reveal high-value subscriber patterns."
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

      {activeTab === 'PREDICTIVE_AI' && (
        <div className="space-y-12 animate-in fade-in duration-700">
          <div className="flex justify-between items-end border-b border-ink pb-6">
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-ink/40">AI-Driven Insights</p>
              <h2 className="text-4xl font-serif font-bold">Predictive Intelligence</h2>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-4 py-2 bg-burgundy/5 border border-burgundy/20">
                <Sparkles size={14} className="text-burgundy" />
                <span className="text-[10px] font-black uppercase tracking-widest text-burgundy">Gemini 3.1 Pro Active</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-8">
            <div className="col-span-12 lg:col-span-8 space-y-8">
              <div className="bg-surface border border-border-hairline p-8 space-y-8">
                <div className="flex justify-between items-center">
                  <h3 className="text-2xl font-serif font-bold">Churn Risk Analysis</h3>
                  <button className="text-[10px] font-black uppercase tracking-widest text-burgundy hover:underline">Run Full Scan</button>
                </div>
                <div className="grid grid-cols-3 gap-6">
                  {[
                    { label: 'High Risk', count: 124, trend: '+12%', color: 'text-status-error' },
                    { label: 'Medium Risk', count: 452, trend: '-5%', color: 'text-status-warning' },
                    { label: 'Low Risk', count: 2841, trend: '+3%', color: 'text-status-success' },
                  ].map(risk => (
                    <div key={risk.label} className="p-6 bg-bg border border-border-hairline space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-ink/40">{risk.label}</p>
                      <p className={cn("text-3xl font-bold", risk.color)}>{risk.count}</p>
                      <p className="text-[9px] font-mono text-ink/40 uppercase">{risk.trend} vs last month</p>
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
                    { name: 'Kazuo Ishiguro', email: 'kazuo@example.com', score: 45, prob: '82%', risk: 'HIGH' },
                    { name: 'Elena Ferrante', email: 'elena@example.com', score: 78, prob: '15%', risk: 'LOW' },
                    { name: 'Julian Barnes', email: 'julian@example.com', score: 85, prob: '8%', risk: 'LOW' },
                    { name: 'Zadie Smith', email: 'zadie@example.com', score: 92, prob: '3%', risk: 'LOW' },
                  ].map(sub => (
                    <div key={sub.email} className="p-4 grid grid-cols-12 items-center hover:bg-bg/30 transition-colors">
                      <div className="col-span-5">
                        <p className="text-sm font-bold">{sub.name}</p>
                        <p className="text-[10px] font-mono text-ink/40 uppercase">{sub.email}</p>
                      </div>
                      <div className="col-span-3">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-1.5 bg-bg rounded-full overflow-hidden">
                            <div className="h-full bg-burgundy" style={{ width: `${sub.score}%` }} />
                          </div>
                          <span className="text-[10px] font-mono font-bold">{sub.score}</span>
                        </div>
                      </div>
                      <div className="col-span-2">
                        <span className={cn(
                          "text-[10px] font-mono font-bold",
                          parseInt(sub.prob) > 50 ? "text-status-error" : "text-status-success"
                        )}>{sub.prob}</span>
                      </div>
                      <div className="col-span-2 text-right">
                        <button className="text-[9px] font-black uppercase tracking-widest text-burgundy border border-burgundy/20 px-2 py-1 hover:bg-burgundy hover:text-white transition-all">Win Back</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="col-span-12 lg:col-span-4 space-y-8">
              <div className="bg-ink text-white p-8 space-y-8">
                <h3 className="text-2xl font-serif font-bold">Smart Send-Time</h3>
                <p className="text-sm text-white/60 leading-relaxed font-editorial italic">
                  "Our models indicate that your audience is most active between 09:00 and 11:00 UTC on Tuesdays. Campaigns sent during this window see a 24% higher open rate."
                </p>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Optimal Hour (Today)</p>
                    <div className="flex items-end gap-2">
                      <p className="text-4xl font-bold">10:00</p>
                      <p className="text-xs text-status-success font-mono mb-1 uppercase">UTC</p>
                    </div>
                  </div>
                  <div className="h-32 flex items-end gap-1">
                    {Array.from({ length: 24 }).map((_, i) => {
                      const height = i >= 9 && i <= 11 ? 'h-full' : 
                                   i >= 8 && i <= 12 ? 'h-3/4' : 
                                   i >= 17 && i <= 19 ? 'h-1/2' : 'h-1/4';
                      const opacity = i >= 9 && i <= 11 ? 'opacity-100' : 'opacity-20';
                      return (
                        <div key={i} className={cn("flex-1 bg-white transition-all", height, opacity)} title={`${i}:00`} />
                      );
                    })}
                  </div>
                  <div className="flex justify-between text-[8px] font-mono text-white/40 uppercase">
                    <span>00:00</span>
                    <span>12:00</span>
                    <span>23:00</span>
                  </div>
                </div>
                <button className="w-full py-3 bg-white text-ink text-[10px] font-black uppercase tracking-widest hover:bg-white/90 transition-colors">Apply Globally</button>
              </div>

              <div className="bg-surface border border-border-hairline p-8 space-y-6">
                <h3 className="text-xl font-serif font-bold">AI Recommendations</h3>
                <div className="space-y-4">
                  {[
                    { title: 'Segment High-Risk Users', desc: 'Create a dynamic segment for users with >70% churn probability.', icon: <Users2 size={16} /> },
                    { title: 'Personalized Re-engagement', desc: 'Use Gemini to draft custom win-back offers for dormant subscribers.', icon: <Sparkles size={16} /> },
                    { title: 'Frequency Adjustment', desc: 'Reduce send frequency for users showing signs of fatigue.', icon: <RefreshCw size={16} /> },
                  ].map((rec, i) => (
                    <div key={i} className="flex gap-4 group cursor-pointer">
                      <div className="w-8 h-8 bg-bg border border-border-hairline flex items-center justify-center text-ink/40 group-hover:text-burgundy transition-colors shrink-0">
                        {rec.icon}
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-ink group-hover:text-burgundy transition-colors">{rec.title}</p>
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

      {activeTab === 'GAP_ANALYSIS' && (
        <div className="space-y-12 animate-in fade-in duration-700">
          <div className="flex justify-between items-end border-b border-ink pb-6">
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-ink/40">Stratejik Değerlendirme</p>
              <h2 className="text-4xl font-serif font-bold">Kurumsal GAP Analizi</h2>
            </div>
            <div className="flex items-center gap-6">
              <button className="flex items-center gap-2 px-4 py-2 border border-ink text-[10px] font-black uppercase tracking-widest hover:bg-ink hover:text-white transition-all">
                <ExternalLink size={14} />
                PDF Raporu Dışa Aktar
              </button>
              <div className="text-right">
                <p className="text-[10px] font-black uppercase text-ink/40">Hazırlık Skoru</p>
                <p className="text-2xl font-serif font-bold text-burgundy">82/100</p>
              </div>
              <div className="w-16 h-16 rounded-full border-4 border-burgundy/20 flex items-center justify-center relative">
                <div className="absolute inset-0 border-4 border-burgundy rounded-full" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 82%, 0 82%)' }} />
                <span className="text-xs font-bold">82%</span>
              </div>
            </div>
          </div>

          <div className="newspaper-grid">
            <div className="col-span-12 lg:col-span-8 space-y-8">
              <div className="bg-surface border border-border-hairline p-8 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-burgundy text-white px-4 py-1 text-[8px] font-black uppercase tracking-widest">Gizli Rapor</div>
                <h3 className="font-sans font-black uppercase tracking-widest text-xs border-b border-ink pb-4 mb-6">Yönetici Özeti</h3>
                <p className="font-serif text-lg leading-relaxed text-ink/80 italic">
                  "SIGNAL platformu, temel kampanya yönetimi ve otomasyon süreçlerinde yüksek olgunluğa erişmiştir. Ancak, kurumsal ölçekte tam 'Market Leader' statüsüne ulaşmak için gerçek zamanlı veri senkronizasyonu ve gelişmiş yapay zeka öngörüleri alanlarında geliştirmeler gerekmektedir."
                </p>
              </div>

              <div className="bg-surface border border-border-hairline p-8 shadow-sm">
                <h3 className="font-sans font-black uppercase tracking-widest text-xs border-b border-ink pb-4 mb-6">Gap Matrisi</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-bg/50">
                        <th className="p-4 metric-label border border-border-hairline">Kategori</th>
                        <th className="p-4 metric-label border border-border-hairline">Mevcut Durum</th>
                        <th className="p-4 metric-label border border-border-hairline">Hedef Durum</th>
                        <th className="p-4 metric-label border border-border-hairline">Durum</th>
                      </tr>
                    </thead>
                    <tbody className="text-xs font-mono">
                      <tr>
                        <td className="p-4 border border-border-hairline font-bold">Güvenlik</td>
                        <td className="p-4 border border-border-hairline text-status-success font-bold">SSO & RBAC Aktif</td>
                        <td className="p-4 border border-border-hairline">SAML 2.0 / SCIM</td>
                        <td className="p-4 border border-border-hairline text-status-success font-bold">TAMAMLANDI</td>
                      </tr>
                      <tr>
                        <td className="p-4 border border-border-hairline font-bold">Veri Entegrasyonu</td>
                        <td className="p-4 border border-border-hairline text-status-warning font-bold">Batch Sync (Shopify)</td>
                        <td className="p-4 border border-border-hairline">Real-time Webhook Sync</td>
                        <td className="p-4 border border-border-hairline text-status-success font-bold">TAMAMLANDI</td>
                      </tr>
                      <tr>
                        <td className="p-4 border border-border-hairline font-bold">AI Yetkinlikleri</td>
                        <td className="p-4 border border-border-hairline text-status-warning font-bold">Gemini İçerik Üretimi</td>
                        <td className="p-4 border border-border-hairline">Predictive Churn & Send-time</td>
                        <td className="p-4 border border-border-hairline text-status-success font-bold">TAMAMLANDI</td>
                      </tr>
                      <tr>
                        <td className="p-4 border border-border-hairline font-bold">Kanal Desteği</td>
                        <td className="p-4 border border-border-hairline text-status-warning font-bold">E-posta Odaklı</td>
                        <td className="p-4 border border-border-hairline">Omnichannel (SMS/Push)</td>
                        <td className="p-4 border border-border-hairline text-status-success font-bold">TAMAMLANDI</td>
                      </tr>
                      <tr>
                        <td className="p-4 border border-border-hairline font-bold">Analitik</td>
                        <td className="p-4 border border-border-hairline text-status-success font-bold">Real-time Dashboard</td>
                        <td className="p-4 border border-border-hairline">Advanced Attribution</td>
                        <td className="p-4 border border-border-hairline text-status-success font-bold">TAMAMLANDI</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="col-span-12 lg:col-span-4 space-y-6">
              <div className="bg-ink text-white p-8 space-y-6">
                <h3 className="font-serif text-2xl font-bold">Kritik Eksiklikler</h3>
                <div className="space-y-6">
                  <div className="relative pl-6 border-l border-status-success">
                    <p className="text-[10px] font-black uppercase text-white/40">Geliştirme 1: Gerçek Zamanlılık</p>
                    <p className="text-sm font-bold">Webhook altyapısı ve anlık senkronizasyon Intelligence Hub'a entegre edildi.</p>
                  </div>
                  <div className="relative pl-6 border-l border-status-success">
                    <p className="text-[10px] font-black uppercase text-white/40">Geliştirme 2: Tahminleme</p>
                    <p className="text-sm font-bold">Churn prediction ve Smart Send-Time modelleri aktif olarak çalışıyor.</p>
                  </div>
                  <div className="relative pl-6 border-l border-status-success">
                    <p className="text-[10px] font-black uppercase text-white/40">Geliştirme 3: Çok Kanallılık</p>
                    <p className="text-sm font-bold">SMS ve WhatsApp kanalları kampanya yönetimine tam entegre edildi.</p>
                  </div>
                </div>
              </div>

              <div className="bg-burgundy text-white p-8">
                <div className="flex items-center gap-3 mb-4">
                  <Zap className="w-6 h-6" />
                  <h4 className="font-bold uppercase tracking-tighter">Stratejik Öneri</h4>
                </div>
                <p className="text-xs font-editorial italic leading-relaxed opacity-90">
                  "Q3 sonuna kadar SMS gateway entegrasyonu ve Gemini tabanlı 'Akıllı Gönderim Zamanı' özelliğinin devreye alınması, pazar payımızı %15 artırabilir."
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'ATTRIBUTION' && (
        <div className="space-y-12">
          <div className="flex justify-between items-center bg-surface border border-border-hairline p-6">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-ink/40">Attribution Model</p>
              <h4 className="text-xl font-serif font-bold">Revenue Distribution</h4>
            </div>
            <div className="flex gap-2">
              {(['LAST_CLICK', 'FIRST_CLICK', 'LINEAR'] as const).map(m => (
                <button 
                  key={m}
                  onClick={() => setAttributionModel(m)}
                  className={cn(
                    "px-4 py-2 text-[10px] font-black uppercase tracking-widest border transition-all",
                    attributionModel === m ? "bg-ink text-white border-ink" : "border-border-hairline text-ink/40 hover:bg-bg"
                  )}
                >
                  {m.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="newspaper-grid">
            <div className="col-span-12 lg:col-span-7 bg-surface border border-border-hairline p-8">
              <h3 className="font-sans font-black uppercase tracking-widest text-xs border-b border-ink pb-4 mb-8">Revenue by Channel</h3>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={attribution} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#D4CFC6" horizontal={false} />
                    <XAxis type="number" stroke="#1A1814" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis dataKey="name" type="category" stroke="#1A1814" fontSize={10} tickLine={false} axisLine={false} width={120} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#F5F2EC', border: '1px solid #1A1814', borderRadius: 0 }}
                      itemStyle={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold' }}
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
                <h3 className="font-sans font-black uppercase tracking-widest text-xs border-b border-ink pb-4 mb-8">Model Comparison</h3>
                <div className="space-y-6">
                  {attribution.map(item => (
                    <div key={item.name} className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3" style={{ backgroundColor: item.color }} />
                        <p className="text-sm font-bold">{item.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-serif font-bold">${item.value.toLocaleString()}</p>
                        <p className="text-[9px] font-mono text-ink/40 uppercase">{((item.value / attribution.reduce((a, b) => a + b.value, 0)) * 100).toFixed(1)}% share</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-burgundy text-white p-8 space-y-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Attribution Insight</p>
                <p className="text-xs font-editorial italic leading-relaxed">
                  {attributionModel === 'LAST_CLICK' 
                    ? "Last-click attribution heavily favors 'Abandoned Cart' flows. This suggests these flows are critical for closing sales in the final decision stage."
                    : attributionModel === 'FIRST_CLICK'
                    ? "First-click attribution highlights 'Summer Sale' as the primary acquisition driver. This campaign is excellent at bringing new signals into the funnel."
                    : "Linear attribution shows a balanced contribution across the lifecycle. Your 'Welcome Flow' maintains consistent value throughout the customer journey."
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const contactSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid editorial signal (email address)"),
  tags: z.string().optional(),
});

type ContactFormData = z.infer<typeof contactSchema>;

const Audiences = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isAddingSegment, setIsAddingSegment] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [newSegment, setNewSegment] = useState<{ name: string, rules: any[] }>({ name: '', rules: [] });
  const [segmentCounts, setSegmentCounts] = useState<Record<string, number>>({});
  const [isSimulatingEvent, setIsSimulatingEvent] = useState(false);
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);
  const [preferenceContact, setPreferenceContact] = useState<any>(null);
  const [notificationContact, setNotificationContact] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [churnRisks, setChurnRisks] = useState<Record<string, any>>({});
  const [isPredicting, setIsPredicting] = useState<string | null>(null);
  const [isPredictingAll, setIsPredictingAll] = useState(false);
  const [churnSummary, setChurnSummary] = useState<{ high: number, medium: number, low: number, topAtRisk: any[] } | null>(null);
  const [availableLists, setAvailableLists] = useState<any[]>([]);
  const [selectedLists, setSelectedLists] = useState<string[]>([]);

  const [isImportingCsv, setIsImportingCsv] = useState(false);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvMapping, setCsvMapping] = useState<Record<string, string>>({
    email: '',
    firstName: '',
    lastName: '',
    tags: ''
  });
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number, failed: number } | null>(null);

  const { register, handleSubmit, formState: { errors }, reset, watch } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      tags: '',
    }
  });

  const watchedEmail = watch("email");

  useEffect(() => {
    api.getContacts().then(setContacts);
    api.getSegments().then(async (segs) => {
      setSegments(segs);
      const counts: Record<string, number> = {};
      for (const seg of segs) {
        const { count } = await api.getSegmentCount(seg.id);
        counts[seg.id] = count;
      }
      setSegmentCounts(counts);
    });
  }, []);

  useEffect(() => {
    if (activeSegmentId === 'CHURN_RISK') {
      // Filter locally for demo, or fetch from a specific endpoint
      api.getContacts().then(all => {
        setContacts(all.filter(c => c.engagementScore < 40));
      });
    } else if (activeSegmentId) {
      api.getSegmentContacts(activeSegmentId).then(setContacts);
    } else {
      api.getContacts().then(setContacts);
    }
  }, [activeSegmentId]);

  const handleCreateSegment = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.addSegment({
      name: newSegment.name,
      rules: JSON.stringify(newSegment.rules)
    });
    const updatedSegments = await api.getSegments();
    setSegments(updatedSegments);
    
    const counts: Record<string, number> = {};
    for (const seg of updatedSegments) {
      const { count } = await api.getSegmentCount(seg.id);
      counts[seg.id] = count;
    }
    setSegmentCounts(counts);
    
    setIsAddingSegment(false);
    setNewSegment({ name: '', rules: [] });
  };

  const addRule = (type: 'attribute' | 'event') => {
    const rule = type === 'attribute' 
      ? { type: 'attribute', field: 'status', operator: 'equals', value: 'SUBSCRIBED' }
      : { type: 'event', eventName: 'PRODUCT_VIEWED', timeframe: '3d' };
    setNewSegment({ ...newSegment, rules: [...newSegment.rules, rule] });
  };

  const removeRule = (index: number) => {
    const rules = [...newSegment.rules];
    rules.splice(index, 1);
    setNewSegment({ ...newSegment, rules });
  };

  const updateRule = (index: number, updates: any) => {
    const rules = [...newSegment.rules];
    rules[index] = { ...rules[index], ...updates };
    setNewSegment({ ...newSegment, rules });
  };

  const handleSimulateEvent = async () => {
    if (contacts.length === 0) return;
    setIsSimulatingEvent(true);
    const randomContact = contacts[Math.floor(Math.random() * contacts.length)];
    const events = ['PRODUCT_VIEWED', 'CART_ABANDONED', 'CHECKOUT_STARTED'];
    const eventName = events[Math.floor(Math.random() * events.length)];
    
    await api.trackBehavioralEvent({
      email: randomContact.email,
      name: eventName,
      properties: { productId: 'prod_' + Math.floor(Math.random() * 1000) }
    });
    
    // Refresh counts
    const counts: Record<string, number> = {};
    for (const seg of segments) {
      const { count } = await api.getSegmentCount(seg.id);
      counts[seg.id] = count;
    }
    setSegmentCounts(counts);
    setIsSimulatingEvent(false);
  };

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleManagePreferences = async (contact: Contact) => {
    const data = await api.getContactPreferences(contact.id);
    setPreferenceContact(data.contact);
    setAvailableLists(data.availableLists);
    setSelectedLists(data.memberships);
  };

  const handleSavePreferences = async () => {
    if (!preferenceContact) return;
    await api.updateContactPreferences(preferenceContact.id, selectedLists);
    setPreferenceContact(null);
    api.getContacts().then(setContacts);
  };

  const handleViewNotifications = async (contact: Contact) => {
    const data = await api.getContactNotifications(contact.id);
    setNotifications(data);
    setNotificationContact(contact);
  };

  const handlePredictChurn = async (contactId: string) => {
    setIsPredicting(contactId);
    try {
      const risk = await api.predictChurn(contactId);
      setChurnRisks(prev => ({ ...prev, [contactId]: risk }));
    } catch (e) {
      console.error("Churn prediction failed", e);
    } finally {
      setIsPredicting(null);
    }
  };

  const handlePredictAllChurn = async () => {
    setIsPredictingAll(true);
    try {
      const res = await fetch('/api/ai/churn-prediction', { method: 'POST' });
      const data = await res.json();
      setChurnSummary(data);
      // Also update individual risks for the top ones
      const newRisks = { ...churnRisks };
      data.topAtRisk.forEach((p: any) => {
        const contact = contacts.find(c => c.email === p.email);
        if (contact) {
          newRisks[contact.id] = { riskLevel: p.risk, probability: parseFloat(p.prob) / 100, reasons: p.reasons };
        }
      });
      setChurnRisks(newRisks);
    } catch (e) {
      console.error("Bulk churn prediction failed", e);
    } finally {
      setIsPredictingAll(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setCsvHeaders(results.meta.fields || []);
        setCsvData(results.data);
        
        // Auto-map common headers
        const fields = results.meta.fields || [];
        const newMapping = { email: '', firstName: '', lastName: '', tags: '' };
        
        fields.forEach(f => {
          const lower = f.toLowerCase();
          if (lower.includes('email')) newMapping.email = f;
          else if (lower.includes('first') || lower === 'fname') newMapping.firstName = f;
          else if (lower.includes('last') || lower === 'lname') newMapping.lastName = f;
          else if (lower.includes('tag')) newMapping.tags = f;
        });
        
        setCsvMapping(newMapping);
      }
    });
  };

  const handleImportCsv = async () => {
    if (!csvMapping.email) return;
    
    setIsImporting(true);
    const mappedContacts = csvData.map(row => ({
      email: row[csvMapping.email],
      firstName: csvMapping.firstName ? row[csvMapping.firstName] : '',
      lastName: csvMapping.lastName ? row[csvMapping.lastName] : '',
      tags: csvMapping.tags ? row[csvMapping.tags] : '',
    })).filter(c => c.email);

    try {
      const result = await api.importContacts(mappedContacts);
      setImportResult(result);
      const updated = await api.getContacts();
      setContacts(updated);
    } catch (e) {
      console.error("Import failed", e);
    } finally {
      setIsImporting(false);
    }
  };

  const onSubmit = async (data: ContactFormData) => {
    setIsValidating(true);
    // Simulate a deeper validation check
    await new Promise(resolve => setTimeout(resolve, 800));
    
    try {
      await api.addContact(data as any);
      const updated = await api.getContacts();
      setContacts(updated);
      setIsAdding(false);
      reset();
    } catch (err) {
      // Handle error if needed
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="space-y-12">
      <SectionHeader 
        title="Audiences" 
        subtitle="Curate and segment your network of recipients."
        guideKey="audience-segments"
        action={
          <div className="flex gap-4">
            <button 
              onClick={handleSimulateEvent} 
              disabled={isSimulatingEvent}
              className="px-4 py-2 border border-burgundy text-burgundy text-[10px] font-black uppercase tracking-widest hover:bg-burgundy/5 transition-colors flex items-center gap-2"
            >
              <Zap size={14} className={cn(isSimulatingEvent && "animate-pulse")} />
              {isSimulatingEvent ? "Simulating..." : "Simulate Event"}
            </button>
            <button onClick={() => setIsImportingCsv(true)} className="px-4 py-2 border border-ink text-ink text-[10px] font-black uppercase tracking-widest hover:bg-ink/5 transition-colors flex items-center gap-2">
              <Upload size={14} /> Import CSV
            </button>
            <button onClick={() => setIsAdding(true)} className="btn-primary flex items-center gap-2">
              <Plus size={16} /> Add Contact
            </button>
          </div>
        }
      />

      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-10 bg-ink/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-bg border border-ink w-full max-w-md p-8 shadow-2xl space-y-6"
            >
              <div className="flex justify-between items-center border-b border-border-hairline pb-4">
                <h2 className="font-serif text-2xl font-bold">Register New Signal</h2>
                <button onClick={() => { setIsAdding(false); reset(); }} className="text-ink/40 hover:text-burgundy">✕</button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="metric-label">First Name</label>
                    <input 
                      type="text" 
                      {...register("firstName")}
                      className={cn(
                        "w-full bg-transparent border-b py-1 font-sans font-bold text-sm outline-none transition-colors",
                        errors.firstName ? "border-burgundy" : "border-border-hairline focus:border-burgundy"
                      )}
                    />
                    {errors.firstName && <p className="text-[10px] text-burgundy font-mono uppercase mt-1">{errors.firstName.message}</p>}
                  </div>
                  <div className="space-y-1">
                    <label className="metric-label">Last Name</label>
                    <input 
                      type="text" 
                      {...register("lastName")}
                      className={cn(
                        "w-full bg-transparent border-b py-1 font-sans font-bold text-sm outline-none transition-colors",
                        errors.lastName ? "border-burgundy" : "border-border-hairline focus:border-burgundy"
                      )}
                    />
                    {errors.lastName && <p className="text-[10px] text-burgundy font-mono uppercase mt-1">{errors.lastName.message}</p>}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="metric-label flex justify-between">
                    <span>Email Address</span>
                    {watchedEmail && (
                      <span className={cn(
                        "text-[8px] font-black uppercase tracking-widest",
                        validateEmail(watchedEmail) ? "text-status-success" : "text-burgundy"
                      )}>
                        {validateEmail(watchedEmail) ? "✓ Valid Format" : "⚠ Invalid Format"}
                      </span>
                    )}
                  </label>
                  <input 
                    type="email" 
                    {...register("email")}
                    className={cn(
                      "w-full bg-transparent border-b py-1 font-mono text-xs outline-none transition-colors",
                      errors.email ? "border-burgundy" : "border-border-hairline focus:border-burgundy"
                    )}
                  />
                  {errors.email && <p className="text-[10px] text-burgundy font-mono uppercase mt-1">{errors.email.message}</p>}
                </div>

                <div className="space-y-1">
                  <label className="metric-label">Tags (comma separated)</label>
                  <input 
                    type="text" 
                    placeholder="VIP, Tech, Early Adopter"
                    {...register("tags")}
                    className="w-full bg-transparent border-b border-border-hairline py-1 font-sans font-bold text-sm outline-none focus:border-burgundy"
                  />
                </div>

                <div className="pt-4">
                  <button 
                    type="submit" 
                    disabled={isValidating}
                    className="btn-primary w-full py-3 text-sm flex items-center justify-center gap-2"
                  >
                    {isValidating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Validating Signal...
                      </>
                    ) : (
                      "Register Contact"
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isImportingCsv && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-10 bg-ink/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-bg border border-ink w-full max-w-2xl p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <div className="flex justify-between items-center border-b border-border-hairline pb-4">
                <h2 className="font-serif text-2xl font-bold">Import Contacts (CSV)</h2>
                <button onClick={() => { setIsImportingCsv(false); setCsvData([]); setCsvHeaders([]); setImportResult(null); }} className="text-ink/40 hover:text-burgundy">✕</button>
              </div>

              {!importResult ? (
                <div className="space-y-6">
                  {csvData.length === 0 ? (
                    <div className="border-2 border-dashed border-border-hairline p-12 flex flex-col items-center justify-center text-center space-y-4">
                      <Upload size={32} className="text-ink/40" />
                      <div>
                        <p className="font-bold">Upload CSV File</p>
                        <p className="text-xs text-ink/60 mt-1">Must include an email column.</p>
                      </div>
                      <input 
                        type="file" 
                        accept=".csv"
                        onChange={handleFileUpload}
                        className="text-xs file:mr-4 file:py-2 file:px-4 file:border-0 file:text-xs file:font-black file:uppercase file:tracking-widest file:bg-ink/5 file:text-ink hover:file:bg-ink/10 cursor-pointer"
                      />
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="bg-surface p-4 border border-border-hairline flex justify-between items-center">
                        <div>
                          <p className="font-bold">File uploaded successfully</p>
                          <p className="text-xs text-ink/60">{csvData.length} rows detected.</p>
                        </div>
                        <button onClick={() => { setCsvData([]); setCsvHeaders([]); }} className="text-xs font-bold text-burgundy hover:underline">
                          Upload different file
                        </button>
                      </div>

                      <div className="space-y-4">
                        <h3 className="font-bold border-b border-border-hairline pb-2">Map Columns</h3>
                        
                        <div className="grid grid-cols-2 gap-4 items-center">
                          <label className="text-sm font-bold">Email Address <span className="text-burgundy">*</span></label>
                          <select 
                            value={csvMapping.email} 
                            onChange={e => setCsvMapping({...csvMapping, email: e.target.value})}
                            className="bg-transparent border border-border-hairline p-2 text-sm outline-none focus:border-burgundy"
                          >
                            <option value="">-- Select Column --</option>
                            {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                          </select>

                          <label className="text-sm font-bold">First Name</label>
                          <select 
                            value={csvMapping.firstName} 
                            onChange={e => setCsvMapping({...csvMapping, firstName: e.target.value})}
                            className="bg-transparent border border-border-hairline p-2 text-sm outline-none focus:border-burgundy"
                          >
                            <option value="">-- Select Column --</option>
                            {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                          </select>

                          <label className="text-sm font-bold">Last Name</label>
                          <select 
                            value={csvMapping.lastName} 
                            onChange={e => setCsvMapping({...csvMapping, lastName: e.target.value})}
                            className="bg-transparent border border-border-hairline p-2 text-sm outline-none focus:border-burgundy"
                          >
                            <option value="">-- Select Column --</option>
                            {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                          </select>

                          <label className="text-sm font-bold">Tags (comma separated)</label>
                          <select 
                            value={csvMapping.tags} 
                            onChange={e => setCsvMapping({...csvMapping, tags: e.target.value})}
                            className="bg-transparent border border-border-hairline p-2 text-sm outline-none focus:border-burgundy"
                          >
                            <option value="">-- Select Column --</option>
                            {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                          </select>
                        </div>
                      </div>

                      <div className="pt-4 flex justify-end">
                        <button 
                          onClick={handleImportCsv}
                          disabled={!csvMapping.email || isImporting}
                          className="btn-primary flex items-center gap-2 disabled:opacity-50"
                        >
                          {isImporting ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              Importing...
                            </>
                          ) : (
                            "Import Contacts"
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-6 text-center py-8">
                  <div className="w-16 h-16 bg-status-success/10 text-status-success rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check size={32} />
                  </div>
                  <h3 className="font-serif text-2xl font-bold">Import Complete</h3>
                  <div className="flex justify-center gap-8 text-sm">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-status-success">{importResult.imported}</p>
                      <p className="text-ink/60 uppercase tracking-widest text-[10px] font-black mt-1">Imported</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-bold text-burgundy">{importResult.failed}</p>
                      <p className="text-ink/60 uppercase tracking-widest text-[10px] font-black mt-1">Failed</p>
                    </div>
                  </div>
                  <div className="pt-6">
                    <button onClick={() => { setIsImportingCsv(false); setCsvData([]); setCsvHeaders([]); setImportResult(null); }} className="btn-primary">
                      Done
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAddingSegment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-10 bg-ink/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-bg border border-ink w-full max-w-md p-8 shadow-2xl space-y-6"
            >
              <div className="flex justify-between items-center border-b border-border-hairline pb-4">
                <h2 className="font-serif text-2xl font-bold">New Rule-based Segment</h2>
                <button onClick={() => setIsAddingSegment(false)} className="text-ink/40 hover:text-burgundy">✕</button>
              </div>

              <form onSubmit={handleCreateSegment} className="space-y-6">
                <div className="space-y-1">
                  <label className="metric-label">Segment Name</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. High Value Customers"
                    className="w-full bg-transparent border-b border-border-hairline py-1 font-sans font-bold text-sm outline-none focus:border-burgundy"
                    value={newSegment.name}
                    onChange={e => setNewSegment({...newSegment, name: e.target.value})}
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <p className="text-[10px] font-black uppercase tracking-widest text-ink/40">Criteria Rules</p>
                    <div className="flex gap-2">
                      <button 
                        type="button" 
                        onClick={() => addRule('attribute')}
                        className="text-[9px] font-black uppercase text-burgundy hover:underline"
                      >
                        + Attribute
                      </button>
                      <button 
                        type="button" 
                        onClick={() => addRule('event')}
                        className="text-[9px] font-black uppercase text-burgundy hover:underline"
                      >
                        + Event
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                    {newSegment.rules.map((rule, idx) => (
                      <div key={idx} className="p-4 bg-surface border border-border-hairline space-y-3 relative group">
                        <button 
                          type="button"
                          onClick={() => removeRule(idx)}
                          className="absolute top-2 right-2 text-ink/20 hover:text-burgundy opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 size={12} />
                        </button>

                        {rule.type === 'attribute' ? (
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[8px] font-black uppercase text-ink/40">Field</label>
                              <select 
                                value={rule.field}
                                onChange={e => updateRule(idx, { field: e.target.value })}
                                className="w-full bg-transparent border-b border-border-hairline text-[10px] font-bold outline-none"
                              >
                                <option value="status">Status</option>
                                <option value="engagementScore">Engagement Score</option>
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[8px] font-black uppercase text-ink/40">Value</label>
                              <input 
                                type="text"
                                value={rule.value}
                                onChange={e => updateRule(idx, { value: e.target.value })}
                                className="w-full bg-transparent border-b border-border-hairline text-[10px] font-bold outline-none"
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[8px] font-black uppercase text-ink/40">Event Name</label>
                              <select 
                                value={rule.eventName}
                                onChange={e => updateRule(idx, { eventName: e.target.value })}
                                className="w-full bg-transparent border-b border-border-hairline text-[10px] font-bold outline-none"
                              >
                                <option value="PRODUCT_VIEWED">Product Viewed</option>
                                <option value="CART_ABANDONED">Cart Abandoned</option>
                                <option value="CHECKOUT_STARTED">Checkout Started</option>
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[8px] font-black uppercase text-ink/40">Timeframe</label>
                              <select 
                                value={rule.timeframe}
                                onChange={e => updateRule(idx, { timeframe: e.target.value })}
                                className="w-full bg-transparent border-b border-border-hairline text-[10px] font-bold outline-none"
                              >
                                <option value="2h">Last 2 Hours</option>
                                <option value="1d">Last 24 Hours</option>
                                <option value="3d">Last 3 Days</option>
                                <option value="7d">Last 7 Days</option>
                                <option value="30d">Last 30 Days</option>
                              </select>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}

                    {newSegment.rules.length === 0 && (
                      <div className="p-8 border border-dashed border-border-hairline text-center">
                        <p className="text-xs font-editorial italic text-ink/40">No rules defined. This segment will include all contacts.</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4">
                  <button 
                    type="submit"
                    className="btn-primary w-full py-3 text-sm"
                  >
                    Create Segment
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="newspaper-grid">
        <div className="col-span-12 lg:col-span-3 space-y-8 border-r border-border-hairline pr-8">
          <div className="space-y-4">
            <div className="flex justify-between items-end border-b border-ink pb-2">
              <h3 className="font-sans font-black uppercase tracking-widest text-xs">Segments</h3>
              <button 
                onClick={() => setIsAddingSegment(true)}
                className="text-[10px] font-black uppercase text-burgundy hover:underline"
              >
                New
              </button>
            </div>
            <div className="space-y-1">
              <button 
                onClick={() => setActiveSegmentId(null)}
                className={cn(
                  "w-full text-left px-4 py-2 text-sm font-medium transition-colors",
                  activeSegmentId === null ? "bg-burgundy text-white" : "hover:bg-surface"
                )}
              >
                All Contacts
              </button>
              {segments.map((s) => (
                <button 
                  key={s.id} 
                  onClick={() => setActiveSegmentId(s.id)}
                  className={cn(
                    "w-full text-left px-4 py-2 text-sm font-medium transition-colors flex justify-between items-center group",
                    activeSegmentId === s.id ? "bg-burgundy text-white" : "hover:bg-surface"
                  )}
                >
                  <span>{s.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-ink/40">{segmentCounts[s.id] ?? '...'}</span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Filter size={10} />
                    </div>
                  </div>
                </button>
              ))}
              <button 
                onClick={() => setActiveSegmentId('CHURN_RISK')}
                className={cn(
                  "w-full text-left px-4 py-2 text-sm font-medium transition-colors flex justify-between items-center group",
                  activeSegmentId === 'CHURN_RISK' ? "bg-burgundy text-white" : "hover:bg-surface"
                )}
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle size={14} className={activeSegmentId === 'CHURN_RISK' ? "text-white" : "text-burgundy"} />
                  <span>High Churn Risk</span>
                </div>
                <span className="text-[10px] font-black text-ink/40">{churnSummary?.high ?? '...'}</span>
              </button>
            </div>
          </div>
          
          <div className="bg-surface p-6 space-y-4">
            <h4 className="font-serif text-xl font-bold">Audience Health</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-black uppercase">
                <span>Growth</span>
                <span className="text-status-success">+4.2%</span>
              </div>
              <div className="flex justify-between text-[10px] font-black uppercase">
                <span>Churn</span>
                <span className="text-burgundy">0.8%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-9 space-y-8">
          {churnSummary && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-burgundy/5 border border-burgundy/20 p-6 newspaper-grid gap-6"
            >
              <div className="col-span-12 md:col-span-4 space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-burgundy">AI Churn Analysis</p>
                <div className="flex items-end gap-4">
                  <div className="text-4xl font-serif font-bold">{churnSummary.high}</div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-burgundy pb-1">High Risk Contacts</div>
                </div>
              </div>
              <div className="col-span-12 md:col-span-8">
                <p className="text-[10px] font-black uppercase tracking-widest text-ink/40 mb-3">Top At-Risk Subscribers</p>
                <div className="grid grid-cols-2 gap-4">
                  {churnSummary.topAtRisk.slice(0, 4).map((p, i) => (
                    <div key={i} className="flex justify-between items-center border-b border-border-hairline pb-2">
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold">{p.name}</p>
                        <p className="text-[9px] font-mono text-ink/40">{p.email}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black text-burgundy">{p.prob}</p>
                        <p className="text-[8px] font-black uppercase text-ink/40">Risk</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          <div className="flex justify-between items-center">
            <div className="flex gap-4">
              <button 
                onClick={handlePredictAllChurn}
                disabled={isPredictingAll}
                className="text-[10px] font-black uppercase tracking-widest text-burgundy hover:underline flex items-center gap-2 disabled:opacity-50"
              >
                <Sparkles size={12} />
                {isPredictingAll ? 'Analyzing Audience...' : 'Predict Churn for All'}
              </button>
              <button 
                onClick={handleSimulateEvent}
                disabled={isSimulatingEvent}
                className="text-[10px] font-black uppercase tracking-widest text-ink/40 hover:text-burgundy flex items-center gap-2 disabled:opacity-50"
              >
                <Zap size={12} />
                {isSimulatingEvent ? 'Simulating...' : 'Simulate Event'}
              </button>
            </div>
          </div>

          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-ink">
                <th className="px-4 py-3 metric-label">Contact</th>
                <th className="px-4 py-3 metric-label">Signal Quality</th>
                <th className="px-4 py-3 metric-label">Status</th>
                <th className="px-4 py-3 metric-label">Engagement</th>
                <th className="px-4 py-3 metric-label">Consent</th>
                <th className="px-4 py-3 metric-label">Churn Risk</th>
                <th className="px-4 py-3 metric-label">Tags</th>
                <th className="px-4 py-3 metric-label text-right">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-hairline">
              {contacts.map(contact => (
                <tr key={contact.id} className="hover:bg-surface transition-colors group">
                  <td className="px-4 py-4">
                    <div className="font-serif text-lg font-bold group-hover:text-burgundy transition-colors">
                      {contact.firstName} {contact.lastName}
                    </div>
                    <div className="font-mono text-[10px] text-ink/40 uppercase flex items-center gap-2">
                      {contact.email}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1.5">
                      <div className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        validateEmail(contact.email) ? "bg-status-success shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-burgundy shadow-[0_0_8px_rgba(139,26,26,0.6)]"
                      )} />
                      <span className="text-[9px] font-black uppercase tracking-widest text-ink/60">
                        {validateEmail(contact.email) ? "Verified Signal" : "Invalid Signal"}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={cn(
                      "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 border",
                      contact.status === 'SUBSCRIBED' ? "border-status-success text-status-success bg-status-success/5" :
                      "border-burgundy text-burgundy bg-burgundy/5"
                    )}>
                      {contact.status}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1 bg-bg">
                        <div className="h-full bg-brass" style={{ width: `${contact.engagementScore}%` }} />
                      </div>
                      <span className="font-mono text-[10px] text-ink/40">{contact.engagementScore}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex gap-2">
                      <div className={cn("p-1 border", contact.emailConsent ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-600" : "border-ink/10 bg-ink/5 text-ink/20")} title="Email Consent">
                        <Mail size={10} />
                      </div>
                      <div className={cn("p-1 border", contact.smsConsent ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-600" : "border-ink/10 bg-ink/5 text-ink/20")} title="SMS Consent">
                        <Smartphone size={10} />
                      </div>
                      <div className={cn("p-1 border", contact.whatsappConsent ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-600" : "border-ink/10 bg-ink/5 text-ink/20")} title="WhatsApp Consent">
                        <MessageSquare size={10} />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    {churnRisks[contact.id] ? (
                      <div className="flex flex-col gap-1">
                        <span className={cn(
                          "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 border w-fit",
                          churnRisks[contact.id].riskLevel === 'HIGH' ? "border-burgundy text-burgundy bg-burgundy/5" :
                          churnRisks[contact.id].riskLevel === 'MEDIUM' ? "border-brass text-brass bg-brass/5" :
                          "border-status-success text-status-success bg-status-success/5"
                        )}>
                          {churnRisks[contact.id].riskLevel} RISK
                        </span>
                        <span className="text-[8px] font-mono text-ink/40">{(churnRisks[contact.id].probability * 100).toFixed(0)}% Prob.</span>
                      </div>
                    ) : (
                      <button 
                        onClick={() => handlePredictChurn(contact.id)}
                        disabled={isPredicting === contact.id}
                        className="text-[9px] font-black uppercase tracking-widest text-ink/40 hover:text-burgundy transition-colors disabled:opacity-50"
                      >
                        {isPredicting === contact.id ? "Predicting..." : "Analyze Risk"}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-1">
                      {contact.tags?.map(tag => (
                        <span key={tag.id} className="px-1.5 py-0.5 bg-surface border border-border-hairline text-[8px] font-black uppercase tracking-tighter">
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right font-mono text-[10px] text-ink/40 uppercase">
                    <div className="flex items-center justify-end gap-3">
                      <span>{format(new Date(contact.createdAt), 'MMM d, yyyy')}</span>
                      <button 
                        onClick={() => handleViewNotifications(contact)}
                        className="text-ink/20 hover:text-burgundy opacity-0 group-hover:opacity-100 transition-opacity"
                        title="View In-App Notifications"
                      >
                        <Bell size={14} />
                      </button>
                      <button 
                        onClick={() => handleManagePreferences(contact)}
                        className="text-ink/20 hover:text-burgundy opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Manage Preferences"
                      >
                        <Settings size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {contacts.length === 0 && (
            <div className="py-32 text-center">
              <p className="font-editorial italic text-4xl text-ink/20">Your audience is quiet.</p>
            </div>
          )}
        </div>
      </div>

      {/* Notifications Modal */}
      <AnimatePresence>
        {notificationContact && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-10 bg-ink/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-bg border border-ink w-full max-w-lg p-8 shadow-2xl space-y-8"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-3xl font-serif font-bold text-ink">In-App Notifications</h3>
                  <p className="text-sm font-editorial italic text-ink/60">{notificationContact.firstName} {notificationContact.lastName}</p>
                </div>
                <button onClick={() => setNotificationContact(null)} className="text-ink/40 hover:text-burgundy">✕</button>
              </div>

              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-4 custom-scrollbar">
                {notifications.length > 0 ? (
                  notifications.map(notif => (
                    <div key={notif.id} className="p-4 border border-border-hairline bg-surface space-y-2">
                      <div className="flex justify-between items-start">
                        <h4 className="font-serif font-bold text-lg">{notif.title}</h4>
                        <span className="font-mono text-[8px] text-ink/40">{format(new Date(notif.createdAt), 'MMM d, HH:mm')}</span>
                      </div>
                      <p className="text-sm text-ink/80">{notif.body}</p>
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center">
                    <p className="font-editorial italic text-xl text-ink/20">No notifications sent yet.</p>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-border-hairline flex justify-end">
                <button 
                  onClick={() => setNotificationContact(null)}
                  className="btn-primary py-2 px-8"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Preference Center Modal */}
      <AnimatePresence>
        {preferenceContact && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-10 bg-ink/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-bg border border-ink w-full max-w-md p-8 shadow-2xl space-y-6"
            >
              <div className="flex justify-between items-center border-b border-border-hairline pb-4">
                <div>
                  <h2 className="font-serif text-2xl font-bold">Subscription Center</h2>
                  <p className="text-[10px] font-mono text-ink/40 uppercase mt-1">{preferenceContact.email}</p>
                </div>
                <button onClick={() => setPreferenceContact(null)} className="text-ink/40 hover:text-burgundy">✕</button>
              </div>

              <div className="space-y-4">
                <p className="text-xs font-editorial italic text-ink/60">
                  Manage which lists this signal is subscribed to. This ensures compliance with GDPR/KVKK preference requirements.
                </p>
                
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                  {availableLists.map(list => (
                    <label key={list.id} className="flex items-center justify-between p-3 border border-border-hairline hover:bg-surface transition-colors cursor-pointer">
                      <div className="flex items-center gap-3">
                        <input 
                          type="checkbox" 
                          className="accent-burgundy"
                          checked={selectedLists.includes(list.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedLists([...selectedLists, list.id]);
                            } else {
                              setSelectedLists(selectedLists.filter(id => id !== list.id));
                            }
                          }}
                        />
                        <div>
                          <p className="text-sm font-bold">{list.name}</p>
                          <p className="text-[9px] font-mono text-ink/40 uppercase">{list.description || 'General subscription list'}</p>
                        </div>
                      </div>
                    </label>
                  ))}
                  {availableLists.length === 0 && (
                    <p className="text-center py-8 font-editorial italic text-ink/20">No lists available.</p>
                  )}
                </div>
              </div>

              <div className="pt-4 flex gap-4">
                <button onClick={handleSavePreferences} className="btn-primary flex-1 py-3">Update Preferences</button>
                <button onClick={() => setPreferenceContact(null)} className="flex-1 py-3 font-sans font-black uppercase tracking-widest text-[10px] border border-border-hairline">Cancel</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const DataLayer = () => {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>([]);
  const [isAddingSegment, setIsAddingSegment] = useState(false);
  const [isAddingField, setIsAddingField] = useState(false);
  const [newSegment, setNewSegment] = useState({ name: '', rules: '' });
  const [newField, setNewField] = useState({ name: '', key: '', type: 'TEXT' as any });
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isAiSegmentActive, setIsAiSegmentActive] = useState(false);
  const [aiSegmentData, setAiSegmentData] = useState<{ count: number, riskLevel: string } | null>(null);

  useEffect(() => {
    api.getSegments().then(setSegments);
    api.getCustomFields().then(setCustomFields);
    api.getContacts().then(setContacts);
  }, []);

  const handleAddField = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.addCustomField(newField);
    api.getCustomFields().then(setCustomFields);
    setIsAddingField(false);
    setNewField({ name: '', key: '', type: 'TEXT' });
  };

  const handleAddSegment = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.addSegment(newSegment);
    api.getSegments().then(setSegments);
    setIsAddingSegment(false);
    setNewSegment({ name: '', rules: '' });
  };

  const activateAiSegment = () => {
    const churnRisks = contacts.filter(c => (c.engagementScore || 0) < 50);
    setAiSegmentData({
      count: churnRisks.length,
      riskLevel: churnRisks.length > 1 ? 'CRITICAL' : 'MODERATE'
    });
    setIsAiSegmentActive(true);
  };

  return (
    <div className="space-y-16">
      <SectionHeader 
        title="Data Layer" 
        subtitle="Manage dynamic segments, custom fields, and personalization logic."
        guideKey="data-layer"
      />

      <div className="newspaper-grid">
        {/* Segments Section */}
        <div className="col-span-12 lg:col-span-7 space-y-8 pr-8 border-r border-border-hairline">
          <div className="flex justify-between items-end border-b border-ink pb-2">
            <h3 className="font-sans font-black uppercase tracking-widest text-xs">Dynamic Segments</h3>
            <button onClick={() => setIsAddingSegment(true)} className="text-[10px] font-black uppercase text-burgundy hover:underline flex items-center gap-1">
              <Plus size={12} /> Create Segment
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {segments.map(segment => (
              <div key={segment.id} className="bg-surface border border-border-hairline p-6 group hover:border-burgundy transition-all">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-serif text-xl font-bold">{segment.name}</h4>
                    <p className="text-[10px] font-mono text-ink/40 uppercase mt-1">
                      {JSON.parse(segment.rules).length} Rules Applied &bull; Dynamic
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <span className="px-1.5 py-0.5 bg-status-success/10 text-status-success text-[8px] font-black uppercase border border-status-success/20">Real-time</span>
                    <button className="text-ink/20 hover:text-burgundy opacity-0 group-hover:opacity-100 transition-opacity">
                      <Settings size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {segments.length === 0 && (
              <div className="py-12 text-center border border-dashed border-border-hairline">
                <p className="font-editorial italic text-xl text-ink/20">No dynamic segments defined.</p>
              </div>
            )}
          </div>

          {/* AI Predictive Segment */}
          <div className={cn(
            "p-8 space-y-4 transition-all duration-500",
            isAiSegmentActive ? "bg-burgundy text-white" : "bg-ink text-white"
          )}>
            <div className="flex items-center gap-2 text-burgundy">
              <Sparkles size={16} className={isAiSegmentActive ? "text-white animate-pulse" : "text-burgundy"} />
              <span className={cn("text-[10px] font-black uppercase tracking-widest", isAiSegmentActive ? "text-white" : "text-burgundy")}>
                AI Predictive Intelligence
              </span>
            </div>
            <h4 className="font-serif text-2xl font-bold">Likely to Churn (Next 30 Days)</h4>
            <p className={cn("text-sm leading-relaxed", isAiSegmentActive ? "text-white/80" : "text-white/60")}>
              {isAiSegmentActive 
                ? `Analysis complete. ${aiSegmentData?.count} subscribers identified as ${aiSegmentData?.riskLevel} churn risk based on behavioral decay.`
                : "Our AI model identifies subscribers who show behavioral patterns consistent with high churn risk."
              }
            </p>
            {!isAiSegmentActive ? (
              <button 
                onClick={activateAiSegment}
                className="text-[10px] font-black uppercase tracking-widest border border-white/20 px-4 py-2 hover:bg-white hover:text-ink transition-all"
              >
                Activate AI Segment
              </button>
            ) : (
              <div className="flex items-center gap-4">
                <span className="text-[10px] font-black uppercase tracking-widest bg-white/10 px-3 py-1 border border-white/20">
                  Segment Active
                </span>
                <button 
                  onClick={() => setIsAiSegmentActive(false)}
                  className="text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-white underline"
                >
                  Deactivate
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Custom Fields Section */}
        <div className="col-span-12 lg:col-span-5 space-y-8">
          <div className="flex justify-between items-end border-b border-ink pb-2">
            <h3 className="font-sans font-black uppercase tracking-widest text-xs">Custom Fields Manager</h3>
            <button onClick={() => setIsAddingField(true)} className="text-[10px] font-black uppercase text-burgundy hover:underline flex items-center gap-1">
              <Plus size={12} /> Add Field
            </button>
          </div>

          <div className="space-y-4">
            {customFields.map(field => (
              <div key={field.id} className="flex justify-between items-center py-3 border-b border-border-hairline">
                <div>
                  <p className="font-sans font-bold text-sm">{field.name}</p>
                  <p className="font-mono text-[9px] text-ink/40 uppercase">Token: {'{{'}{field.key}{'}}'}</p>
                </div>
                <span className="px-2 py-0.5 bg-surface border border-border-hairline text-[9px] font-mono text-ink/60 uppercase">
                  {field.type}
                </span>
              </div>
            ))}
            {customFields.length === 0 && (
              <p className="text-center py-8 font-editorial italic text-ink/20">No custom fields defined.</p>
            )}
          </div>

          <div className="bg-surface p-6 space-y-4 border border-border-hairline">
            <h4 className="font-serif text-xl font-bold">Personalization Engine</h4>
            <p className="text-xs text-ink/60 leading-relaxed">
              Use Liquid-style syntax for conditional rendering and dynamic content blocks.
            </p>
            <div className="bg-bg p-4 font-mono text-[10px] text-ink/60 space-y-1">
              <p className="text-burgundy">{"{{#if is_premium}}"}</p>
              <p className="pl-4">Welcome back, VIP!</p>
              <p className="text-burgundy">{"{{else}}"}</p>
              <p className="pl-4">Upgrade to Pro today.</p>
              <p className="text-burgundy">{"{{/if}}"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {isAddingField && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-10 bg-ink/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-bg border border-ink w-full max-w-md p-8 shadow-2xl space-y-6"
            >
              <h2 className="font-serif text-2xl font-bold">New Custom Field</h2>
              <form onSubmit={handleAddField} className="space-y-4">
                <div className="space-y-1">
                  <label className="metric-label">Field Name</label>
                  <input 
                    type="text" 
                    required
                    className="w-full bg-transparent border-b border-border-hairline py-1 font-sans font-bold text-sm outline-none focus:border-burgundy"
                    value={newField.name}
                    onChange={e => setNewField({...newField, name: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="metric-label">Token Key</label>
                  <input 
                    type="text" 
                    required
                    className="w-full bg-transparent border-b border-border-hairline py-1 font-mono text-xs outline-none focus:border-burgundy"
                    value={newField.key}
                    onChange={e => setNewField({...newField, key: e.target.value.toLowerCase().replace(/\s+/g, '_')})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="metric-label">Data Type</label>
                  <select 
                    className="w-full bg-transparent border-b border-border-hairline py-1 font-sans font-bold text-sm outline-none focus:border-burgundy"
                    value={newField.type}
                    onChange={e => setNewField({...newField, type: e.target.value as any})}
                  >
                    <option value="TEXT">TEXT</option>
                    <option value="NUMBER">NUMBER</option>
                    <option value="DATE">DATE</option>
                    <option value="BOOLEAN">BOOLEAN</option>
                  </select>
                </div>
                <div className="pt-4 flex gap-4">
                  <button type="submit" className="btn-primary flex-1 py-3">Create Field</button>
                  <button type="button" onClick={() => setIsAddingField(false)} className="flex-1 py-3 font-sans font-black uppercase tracking-widest text-[10px] border border-border-hairline">Cancel</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Infrastructure = () => {
  const { user, refreshUser } = useAuth();
  const [consentLogs, setConsentLogs] = useState<any[]>([]);
  const [dataRequests, setDataRequests] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [ssoConfig, setSsoConfig] = useState<any>(null);
  const [isMfaLoading, setIsMfaLoading] = useState(false);
  const [isAddingKey, setIsAddingKey] = useState(false);
  const [isEditingSSO, setIsEditingSSO] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [ssoFormData, setSsoFormData] = useState({
    ssoEnabled: false,
    ssoDomain: '',
    ssoClientId: '',
    ssoClientSecret: '',
    ssoIssuer: '',
    ssoEntryPoint: '',
    ssoCert: ''
  });

  useEffect(() => {
    api.getConsentLogs().then(setConsentLogs);
    api.getDataRequests().then(setDataRequests);
    api.getAuditLogs().then(setAuditLogs);
    api.getApiKeys().then(setApiKeys);
    api.getSSOConfig().then(config => {
      setSsoConfig(config);
      setSsoFormData({
        ssoEnabled: config.ssoEnabled,
        ssoDomain: config.ssoDomain || '',
        ssoClientId: config.ssoClientId || '',
        ssoClientSecret: '', // Don't populate secret
        ssoIssuer: config.ssoIssuer || '',
        ssoEntryPoint: config.ssoEntryPoint || '',
        ssoCert: config.ssoCert || ''
      });
    });
  }, []);

  const handleSaveSSO = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated = await api.updateSSOConfig(ssoFormData);
    setSsoConfig(updated);
    setIsEditingSSO(false);
    alert("SSO Configuration updated successfully.");
  };

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.createApiKey({ name: newKeyName, scopes: ['all'] });
    api.getApiKeys().then(setApiKeys);
    setIsAddingKey(false);
    setNewKeyName('');
  };

  const handleDeleteKey = async (id: string) => {
    if (window.confirm("Revoke this API key? External integrations using this key will fail.")) {
      await api.deleteApiKey(id);
      api.getApiKeys().then(setApiKeys);
    }
  };

  const handleDataRequest = async (type: 'EXPORT' | 'DELETE') => {
    const contacts = await api.getContacts();
    if (contacts.length === 0) return alert("No contacts available for demo request.");
    
    await api.addDataRequest({ contactId: contacts[0].id, type });
    api.getDataRequests().then(setDataRequests);
    alert(`${type} request logged and queued for processing.`);
  };

  const handleMfaToggle = async () => {
    setIsMfaLoading(true);
    try {
      await api.updateMFA(!user?.mfaEnabled);
      await refreshUser();
    } catch (error) {
      console.error("MFA update failed", error);
    } finally {
      setIsMfaLoading(false);
    }
  };

  const handleSSOConnect = async () => {
    try {
      const { url } = await api.getSSOUrl();
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      const popup = window.open(
        url,
        'SSO_LOGIN',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      if (!popup) {
        alert("Popup blocked! Please allow popups for this site.");
        return;
      }

      const handleMessage = async (event: MessageEvent) => {
        if (event.data?.type === 'SSO_AUTH_SUCCESS') {
          await refreshUser();
          window.removeEventListener('message', handleMessage);
          alert("Enterprise SSO linked successfully!");
        }
      };

      window.addEventListener('message', handleMessage);
    } catch (error) {
      console.error("SSO initiation failed", error);
    }
  };

  return (
    <div className="space-y-16">
      <SectionHeader 
        title="Deliverability & Infrastructure" 
        subtitle="Manage sender reputation, compliance, and global suppression lists."
        guideKey="infrastructure-api"
      />

      <div className="newspaper-grid">
        {/* Security & SSO */}
        <div className="col-span-12 lg:col-span-4 space-y-8 pr-8 border-r border-border-hairline">
          <div className="space-y-4">
            <h3 className="font-sans font-black uppercase tracking-widest text-xs border-b border-ink pb-2">Security & Enterprise SSO</h3>
            
            <div className="space-y-6">
              {/* MFA Toggle */}
              <div className="bg-surface p-6 border border-border-hairline space-y-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <p className="text-xs font-bold uppercase tracking-tight">Multi-Factor Auth (MFA)</p>
                    <p className="text-[10px] text-ink/60">Add an extra layer of security to your account.</p>
                  </div>
                  <button 
                    onClick={handleMfaToggle}
                    disabled={isMfaLoading}
                    className={cn(
                      "w-10 h-5 rounded-full relative transition-colors",
                      user?.mfaEnabled ? "bg-status-success" : "bg-ink/10"
                    )}
                  >
                    <motion.div 
                      animate={{ x: user?.mfaEnabled ? 20 : 2 }}
                      className="absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm"
                    />
                  </button>
                </div>
                {user?.mfaEnabled && (
                  <div className="flex items-center gap-2 text-[9px] font-mono text-status-success uppercase">
                    <ShieldCheck size={12} />
                    <span>MFA is active for your account</span>
                  </div>
                )}
              </div>

              {/* SSO Configuration */}
              <div className="bg-ink text-white p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/10 flex items-center justify-center">
                    <Lock size={20} className="text-burgundy" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest">Enterprise SSO</p>
                    <p className="text-[9px] text-white/40">Auth0 / Okta / Azure AD</p>
                  </div>
                </div>
                
                <p className="text-[10px] text-white/60 leading-relaxed italic">
                  "Connect your corporate identity provider to enable seamless, secure access for your entire team."
                </p>

                {user?.ssoId ? (
                  <div className="space-y-3">
                    <div className="p-3 bg-white/5 border border-white/10 rounded flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={12} className="text-status-success" />
                        <span className="text-[10px] font-mono uppercase">Connected</span>
                      </div>
                      <span className="text-[10px] font-mono text-white/40">{user.ssoProvider}</span>
                    </div>
                    <button className="w-full py-2 text-[9px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors">
                      Disconnect Provider
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <button 
                      onClick={handleSSOConnect}
                      className="w-full py-3 bg-burgundy hover:bg-burgundy/90 text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                    >
                      <ExternalLink size={14} />
                      Link Enterprise ID
                    </button>
                    <button 
                      onClick={() => setIsEditingSSO(true)}
                      className="w-full py-2 border border-white/20 text-[9px] font-black uppercase tracking-widest text-white/60 hover:text-white transition-colors"
                    >
                      Configure SSO
                    </button>
                  </div>
                )}
              </div>

              {/* SSO Config Modal */}
              <AnimatePresence>
                {isEditingSSO && (
                  <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setIsEditingSSO(false)}
                      className="absolute inset-0 bg-ink/80 backdrop-blur-sm"
                    />
                    <motion.div 
                      initial={{ scale: 0.95, opacity: 0, y: 20 }}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      exit={{ scale: 0.95, opacity: 0, y: 20 }}
                      className="relative w-full max-w-md bg-bg border border-ink p-10 shadow-2xl"
                    >
                      <h3 className="text-2xl font-serif font-bold mb-6">SSO Configuration</h3>
                      <form onSubmit={handleSaveSSO} className="space-y-6">
                        <div className="flex items-center justify-between p-4 bg-surface border border-border-hairline">
                          <label className="text-[10px] font-black uppercase tracking-widest">Enable SSO</label>
                          <button 
                            type="button"
                            onClick={() => setSsoFormData(prev => ({ ...prev, ssoEnabled: !prev.ssoEnabled }))}
                            className={cn(
                              "w-10 h-5 rounded-full relative transition-colors",
                              ssoFormData.ssoEnabled ? "bg-status-success" : "bg-ink/10"
                            )}
                          >
                            <div className={cn(
                              "absolute top-1 w-3 h-3 bg-white rounded-full transition-all",
                              ssoFormData.ssoEnabled ? "left-6" : "left-1"
                            )} />
                          </button>
                        </div>

                        <div className="space-y-4">
                          <div className="space-y-1">
                            <label className="metric-label">Corporate Domain</label>
                            <input 
                              type="text" 
                              placeholder="e.g. signal.app"
                              className="w-full p-3 bg-surface border border-border-hairline font-mono text-xs focus:border-burgundy outline-none"
                              value={ssoFormData.ssoDomain}
                              onChange={e => setSsoFormData(prev => ({ ...prev, ssoDomain: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="metric-label">OIDC Issuer URL</label>
                            <input 
                              type="text" 
                              placeholder="https://auth.okta.com/..."
                              className="w-full p-3 bg-surface border border-border-hairline font-mono text-xs focus:border-burgundy outline-none"
                              value={ssoFormData.ssoIssuer}
                              onChange={e => setSsoFormData(prev => ({ ...prev, ssoIssuer: e.target.value }))}
                            />
                          </div>
                          
                          <div className="relative py-2">
                            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border-hairline"></div></div>
                            <div className="relative flex justify-center text-[8px] uppercase font-bold"><span className="bg-bg px-2 text-ink/40">SAML 2.0 Settings</span></div>
                          </div>

                          <div className="space-y-1">
                            <label className="metric-label">SAML Entry Point</label>
                            <input 
                              type="text" 
                              placeholder="https://idp.example.com/saml/sso"
                              className="w-full p-3 bg-surface border border-border-hairline font-mono text-xs focus:border-burgundy outline-none"
                              value={ssoFormData.ssoEntryPoint}
                              onChange={e => setSsoFormData(prev => ({ ...prev, ssoEntryPoint: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="metric-label">X.509 Certificate</label>
                            <textarea 
                              placeholder="-----BEGIN CERTIFICATE----- ..."
                              className="w-full p-3 bg-surface border border-border-hairline font-mono text-[10px] h-20 focus:border-burgundy outline-none resize-none"
                              value={ssoFormData.ssoCert}
                              onChange={e => setSsoFormData(prev => ({ ...prev, ssoCert: e.target.value }))}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="metric-label">Client ID</label>
                              <input 
                                type="text" 
                                className="w-full p-3 bg-surface border border-border-hairline font-mono text-xs focus:border-burgundy outline-none"
                                value={ssoFormData.ssoClientId}
                                onChange={e => setSsoFormData(prev => ({ ...prev, ssoClientId: e.target.value }))}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="metric-label">Client Secret</label>
                              <input 
                                type="password" 
                                placeholder="••••••••"
                                className="w-full p-3 bg-surface border border-border-hairline font-mono text-xs focus:border-burgundy outline-none"
                                value={ssoFormData.ssoClientSecret}
                                onChange={e => setSsoFormData(prev => ({ ...prev, ssoClientSecret: e.target.value }))}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="pt-4 flex gap-4">
                          <button type="submit" className="btn-primary flex-1 py-3">Save Configuration</button>
                          <button type="button" onClick={() => setIsEditingSSO(false)} className="flex-1 py-3 border border-border-hairline text-[10px] font-black uppercase tracking-widest">Cancel</button>
                        </div>
                      </form>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Sender Management */}
        <div className="col-span-12 lg:col-span-4 space-y-8 px-8 border-r border-border-hairline">
          <div className="space-y-4">
            <h3 className="font-sans font-black uppercase tracking-widest text-xs border-b border-ink pb-2">Sender Management</h3>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <p className="text-sm font-bold font-serif">signal.run.app</p>
                  <span className="px-1.5 py-0.5 bg-status-success/10 text-status-success text-[8px] font-black uppercase border border-status-success/20">Verified</span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {['DKIM', 'SPF', 'DMARC'].map(t => (
                    <div key={t} className="bg-surface border border-border-hairline p-2 text-center">
                      <p className="text-[8px] font-black uppercase text-ink/40">{t}</p>
                      <CheckCircle2 size={10} className="mx-auto mt-1 text-status-success" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-surface p-4 space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-ink/40">Dedicated IP Status</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-ink text-white flex items-center justify-center font-mono text-xs">IP</div>
                  <div>
                    <p className="text-xs font-bold">192.168.1.104</p>
                    <p className="text-[9px] text-status-success font-black uppercase">Warm-up: 84% Complete</p>
                  </div>
                </div>
                <div className="w-full h-1 bg-bg">
                  <div className="h-full bg-burgundy" style={{ width: '84%' }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Compliance & Privacy */}
        <div className="col-span-12 lg:col-span-4 space-y-8 pl-8">
          <div className="space-y-4">
            <h3 className="font-sans font-black uppercase tracking-widest text-xs border-b border-ink pb-2">Compliance & Privacy</h3>
            
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-tight">GDPR / KVKK Tools</p>
                  <div className="w-8 h-4 bg-status-success rounded-full relative">
                    <div className="absolute right-0.5 top-0.5 w-3 h-3 bg-white rounded-full" />
                  </div>
                </div>
                <p className="text-[10px] text-ink/60 leading-relaxed">
                  Automated Right to be Forgotten and Data Portability requests are active.
                </p>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleDataRequest('EXPORT')}
                    className="flex-1 py-1.5 border border-border-hairline text-[8px] font-black uppercase tracking-widest hover:bg-surface transition-colors"
                  >
                    Data Export
                  </button>
                  <button 
                    onClick={() => handleDataRequest('DELETE')}
                    className="flex-1 py-1.5 border border-border-hairline text-[8px] font-black uppercase tracking-widest hover:bg-surface transition-colors"
                  >
                    Forget Me
                  </button>
                </div>
              </div>

              <div className="bg-burgundy/5 border border-burgundy/20 p-4 space-y-2">
                <div className="flex items-center gap-2 text-burgundy">
                  <AlertCircle size={14} />
                  <p className="text-[10px] font-black uppercase">Compliance Alert</p>
                </div>
                <p className="text-[10px] text-ink/80 italic">
                  "Your privacy policy was last updated 184 days ago. We recommend a review."
                </p>
              </div>

              <div className="pt-4 border-t border-border-hairline">
                <p className="text-[10px] font-black uppercase tracking-widest text-ink/40 mb-4">Suppression Stats</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xl font-serif font-bold">124</p>
                    <p className="text-[8px] font-black uppercase text-ink/40">Global Unsubs</p>
                  </div>
                  <div>
                    <p className="text-xl font-serif font-bold">42</p>
                    <p className="text-[8px] font-black uppercase text-ink/40">Bounces</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-12">
        {/* Audit Logs (SOC2) */}
        <div className="col-span-12 lg:col-span-8 space-y-8 pr-8 border-r border-border-hairline">
          <div className="flex justify-between items-end">
            <h3 className="text-2xl font-serif font-bold text-ink">SOC2 Audit Trail</h3>
            <span className="text-[10px] font-mono text-status-success font-bold uppercase tracking-widest">Compliance Level: High</span>
          </div>
          <div className="border border-border-hairline overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface border-b border-border-hairline">
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-ink/40">Action</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-ink/40">Entity</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-ink/40">User</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-ink/40">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-hairline">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-12 text-center font-editorial italic text-ink/20">No audit logs recorded.</td>
                  </tr>
                ) : (
                  auditLogs.slice(0, 10).map(log => (
                    <tr key={log.id} className="hover:bg-surface transition-colors">
                      <td className="px-4 py-3">
                        <span className="text-xs font-bold text-ink">{log.action}</span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-[10px] font-mono text-ink/60 uppercase">{log.entityType}</p>
                        <p className="text-[8px] font-mono text-ink/40">{log.entityId}</p>
                      </td>
                      <td className="px-4 py-3 text-[10px] font-mono text-ink/60 uppercase">{log.userId}</td>
                      <td className="px-4 py-3 text-[9px] font-mono text-ink/40 uppercase">
                        {format(new Date(log.timestamp), 'MMM d, HH:mm:ss')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Public API Management */}
        <div className="col-span-12 lg:col-span-4 space-y-8">
          <div className="flex justify-between items-center">
            <h3 className="text-2xl font-serif font-bold text-ink">Public API</h3>
            <button 
              onClick={() => setIsAddingKey(true)}
              className="text-[10px] font-black uppercase text-burgundy hover:underline"
            >
              Generate Key
            </button>
          </div>
          <div className="space-y-4">
            {apiKeys.length === 0 ? (
              <div className="p-12 bg-surface border border-dashed border-border-hairline text-center">
                <p className="text-xs font-editorial italic text-ink/40">No API keys generated.</p>
              </div>
            ) : (
              apiKeys.map(key => (
                <div key={key.id} className="bg-surface border border-border-hairline p-6 space-y-4 group">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-ink">{key.name}</p>
                      <p className="text-xs font-mono text-burgundy mt-1">{key.key.substring(0, 8)}••••••••</p>
                    </div>
                    <button 
                      onClick={() => handleDeleteKey(key.id)}
                      className="text-ink/20 hover:text-burgundy transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-border-hairline">
                    <p className="text-[8px] font-mono text-ink/40 uppercase">
                      Last used: {key.lastUsedAt ? format(new Date(key.lastUsedAt), 'MMM d') : 'Never'}
                    </p>
                    <span className="px-1.5 py-0.5 bg-status-success/10 text-status-success text-[7px] font-black uppercase border border-status-success/20">Active</span>
                  </div>
                </div>
              ))
            )}
            
            <div className="bg-ink text-white p-6 space-y-4">
              <div className="flex items-center gap-3">
                <Globe size={20} className="text-burgundy" />
                <p className="text-xs font-bold uppercase tracking-widest">Developer Gateway</p>
              </div>
              <p className="text-[10px] text-white/60 leading-relaxed">
                Integrate SIGNAL with your external systems using our RESTful API.
              </p>
              <button 
                onClick={() => window.open('/api/v1/documentation', '_blank')}
                className="w-full py-2 border border-white/20 text-[9px] font-black uppercase tracking-widest hover:bg-white/10 transition-colors"
              >
                View API Documentation
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Consent Logs & SAR Requests */}
      <div className="grid grid-cols-12 gap-12">
        {/* Consent Logs */}
        <div className="col-span-12 lg:col-span-7 space-y-8 pr-8 border-r border-border-hairline">
          <h3 className="text-2xl font-serif font-bold text-ink">Consent Audit Trail</h3>
          <div className="border border-border-hairline overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface border-b border-border-hairline">
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-ink/40">Signal</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-ink/40">Action</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-ink/40">Source</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-ink/40">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-hairline">
                {consentLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-12 text-center font-editorial italic text-ink/20">No consent logs recorded.</td>
                  </tr>
                ) : (
                  consentLogs.map(log => (
                    <tr key={log.id} className="hover:bg-surface transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-xs font-bold">{log.contact?.email}</p>
                        <p className="text-[8px] font-mono text-ink/40 uppercase">{log.ipAddress || '0.0.0.0'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-1.5 py-0.5 bg-ink/5 text-ink text-[8px] font-black uppercase border border-ink/10">
                          {log.action.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[9px] font-mono text-ink/60 uppercase">{log.source}</td>
                      <td className="px-4 py-3 text-[9px] font-mono text-ink/40 uppercase">
                        {format(new Date(log.timestamp), 'MMM d, HH:mm:ss')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Data Requests */}
        <div className="col-span-12 lg:col-span-5 space-y-8">
          <h3 className="text-2xl font-serif font-bold text-ink">SAR & Data Requests</h3>
          <div className="space-y-4">
            {dataRequests.length === 0 ? (
              <div className="p-12 bg-surface border border-dashed border-border-hairline text-center">
                <p className="text-xs font-editorial italic text-ink/40">No active Subject Access Requests.</p>
              </div>
            ) : (
              dataRequests.map(req => (
                <div key={req.id} className="bg-surface border border-border-hairline p-6 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-burgundy">{req.type} REQUEST</p>
                      <p className="text-sm font-bold text-ink">{req.contact?.email}</p>
                      <p className="text-[9px] font-mono text-ink/40 uppercase mt-1">
                        Received {format(new Date(req.createdAt), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <span className={cn(
                      "px-2 py-0.5 text-[8px] font-black uppercase border",
                      req.status === 'COMPLETED' ? "border-status-success text-status-success" : "border-burgundy text-burgundy"
                    )}>
                      {req.status}
                    </span>
                  </div>
                  {req.status === 'PENDING' && (
                    <button 
                      onClick={async () => {
                        await api.updateDataRequestStatus(req.id, 'COMPLETED');
                        api.getDataRequests().then(setDataRequests);
                      }}
                      className="w-full py-2 bg-ink text-white text-[9px] font-black uppercase tracking-widest hover:bg-ink/80 transition-colors"
                    >
                      Process Request
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      <AnimatePresence>
        {isAddingKey && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-10 bg-ink/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-bg border border-ink w-full max-w-md p-8 shadow-2xl space-y-6"
            >
              <h2 className="font-serif text-2xl font-bold">Generate API Key</h2>
              <form onSubmit={handleCreateKey} className="space-y-4">
                <div className="space-y-1">
                  <label className="metric-label">Key Name</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Production Webhook"
                    className="w-full bg-transparent border-b border-border-hairline py-1 font-sans font-bold text-sm outline-none focus:border-burgundy"
                    value={newKeyName}
                    onChange={e => setNewKeyName(e.target.value)}
                  />
                </div>
                <div className="pt-4 flex gap-4">
                  <button type="submit" className="btn-primary flex-1 py-3">Generate Key</button>
                  <button type="button" onClick={() => setIsAddingKey(false)} className="flex-1 py-3 font-sans font-black uppercase tracking-widest text-[10px] border border-border-hairline">Cancel</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Automation Components ---

const iconMap: Record<string, any> = {
  Zap, Globe, Sparkles, Mail, Tag: TagIcon, Clock, Split, FileText, MousePointerClick, Eye
};

const CustomNode = ({ data, selected }: any) => {
  if (!data) return null;
  const Icon = typeof data.icon === 'string' ? (iconMap[data.icon] || Zap) : (data.icon || Zap);
  const stats = data.stats;
  const isHeatmapOn = data.isHeatmapOn;
  const errors = data.errors;
  const isSimulationStep = data.isSimulationStep;
  const dropOff = stats && stats.entries > 0 ? ((stats.entries - (stats.processed || 0)) / stats.entries) * 100 : 0;
  const isBottleneck = isHeatmapOn && dropOff > 30;

  return (
    <div className={cn(
      "bg-bg border p-4 shadow-sm min-w-[200px] transition-all relative",
      selected ? "border-burgundy ring-1 ring-burgundy/20" : "border-ink/10",
      isBottleneck ? "ring-2 ring-burgundy animate-pulse border-burgundy shadow-lg shadow-burgundy/20" : "",
      errors && errors.length > 0 ? "border-burgundy ring-1 ring-burgundy/50" : "",
      isSimulationStep ? "ring-4 ring-brass border-brass shadow-xl scale-105 z-50" : ""
    )}>
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
          <p className="text-[8px] font-black uppercase tracking-widest text-ink/40">{data.type || 'Node'}</p>
          <p className="text-xs font-bold font-serif">{data.label || 'Untitled'}</p>
        </div>
      </div>

      {data.label === 'If/Else' ? (
        <>
          <Handle type="source" position={Position.Bottom} id="true" className="w-2 h-2 bg-status-success border-none left-1/4" />
          <Handle type="source" position={Position.Bottom} id="false" className="w-2 h-2 bg-burgundy border-none left-3/4" />
          <div className="flex justify-between px-2 mt-1">
            <span className="text-[6px] font-black uppercase text-status-success">True</span>
            <span className="text-[6px] font-black uppercase text-burgundy">False</span>
          </div>
        </>
      ) : data.label === 'A/B Test' ? (
        <>
          <Handle type="source" position={Position.Bottom} id="a" className="w-2 h-2 bg-brass border-none left-1/4" />
          <Handle type="source" position={Position.Bottom} id="b" className="w-2 h-2 bg-ink border-none left-3/4" />
          <div className="flex justify-between px-2 mt-1">
            <span className="text-[6px] font-black uppercase text-brass">Var A</span>
            <span className="text-[6px] font-black uppercase text-ink">Var B</span>
          </div>
        </>
      ) : data.label === 'Multi-path Split' ? (
        <div className="relative h-4 mt-1">
          {(data.config?.paths || ['Path 1', 'Path 2']).map((path: string, idx: number, arr: any[]) => (
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
                style={{ left: `${((idx + 1) / (arr.length + 1)) * 100}%`, transform: 'translateX(-50%)', bottom: '-8px' }}
              >
                {path}
              </span>
            </React.Fragment>
          ))}
        </div>
      ) : (
        <Handle type="source" position={Position.Bottom} className="w-2 h-2 bg-burgundy border-none" />
      )}

      {isHeatmapOn && stats && (
        <div className="mt-2 space-y-1">
          <div className="flex justify-between items-center text-[7px] font-black uppercase">
            <span className="text-ink/40">Drop-off Rate</span>
            <span className={cn(dropOff > 30 ? "text-burgundy" : "text-ink/60")}>{Math.round(dropOff)}%</span>
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
          {data.type === 'Trigger' && (
            <div className="col-span-2">
              <p className="text-[7px] font-black uppercase text-ink/40">Total Entries</p>
              <p className="text-sm font-serif font-bold text-ink">{stats.entries?.toLocaleString()}</p>
            </div>
          )}
          {data.type === 'Action' && data.label === 'Send Email' && (
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
          {data.type === 'Logic' && (
            <>
              <div>
                <p className="text-[7px] font-black uppercase text-ink/40">True</p>
                <p className="text-xs font-serif font-bold text-status-success">{stats.truePath?.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[7px] font-black uppercase text-ink/40">False</p>
                <p className="text-xs font-serif font-bold text-burgundy">{stats.falsePath?.toLocaleString()}</p>
              </div>
            </>
          )}
          {data.type === 'Action' && data.label !== 'Send Email' && (
            <div className="col-span-2">
              <p className="text-[7px] font-black uppercase text-ink/40">Processed</p>
              <p className="text-sm font-serif font-bold text-ink">{stats.processed?.toLocaleString()}</p>
            </div>
          )}
        </div>
      )}

    </div>
  );
};

const automationNodeTypes = {
  custom: CustomNode,
  trigger: CustomNode,
  action: CustomNode,
  logic: CustomNode,
};

const Automations = () => {
  const [flows, setFlows] = useState<Flow[]>([]);
  const [activeFlow, setActiveFlow] = useState<Flow | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newFlowName, setNewFlowName] = useState('');
  const [events, setEvents] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [view, setView] = useState<'FLOWS' | 'EVENTS' | 'TEMPLATES'>('FLOWS');

  // React Flow state
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(false);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [emailTemplates, setEmailTemplates] = useState<Template[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showFunnel, setShowFunnel] = useState(false);
  const [showSimulation, setShowSimulation] = useState(false);
  const [simulatedContact, setSimulatedContact] = useState({
    email: 'test@example.com',
    tags: ['newsletter'],
    purchases: 0,
    lastOpen: null as string | null,
  });
  const [simulationPath, setSimulationPath] = useState<string[]>([]);
  const [simulationStep, setSimulationStep] = useState(-1);
  const [history, setHistory] = useState<{ nodes: Node[]; edges: Edge[] }[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Undo/Redo Logic
  const saveToHistory = useCallback((currentNodes: Node[], currentEdges: Edge[]) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      return [...newHistory, { nodes: currentNodes, edges: currentEdges }].slice(-20); // Keep last 20
    });
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

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
    g.setGraph({ rankdir: 'TB', nodesep: 100, ranksep: 100 });
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
    setNodes(nds => nds.map(node => ({
      ...node,
      data: { 
        ...node.data, 
        isHeatmapOn: showHeatmap,
        isSimulationStep: simulationPath[simulationStep] === node.id
      }
    })));
  }, [showHeatmap, simulationPath, simulationStep, setNodes]);

  useEffect(() => {
    api.getFlows().then(setFlows);
    api.getEvents().then(setEvents);
    api.getWorkflowTemplates().then(setTemplates);
    api.getTemplates().then(setEmailTemplates);
    // Assuming there's a way to get tags, if not we'll mock or use a generic list
    // For now let's just use some mock tags if api doesn't have it
    setAvailableTags([
      { id: '1', name: 'VIP' },
      { id: '2', name: 'New User' },
      { id: '3', name: 'Churn Risk' },
      { id: '4', name: 'Purchased' },
    ]);
  }, []);

  const loadAnalytics = async (flowId: string) => {
    setIsAnalyticsLoading(true);
    try {
      const analytics = await api.getFlowAnalytics(flowId);
      
      // Inject mock data for demo purposes if analytics is empty
      const mockAnalytics: Record<string, any> = { ...analytics };
      if (Object.keys(mockAnalytics).length === 0) {
        nodes.forEach((node, idx) => {
          const baseEntries = 10000 - (idx * 1500);
          const entries = Math.max(100, baseEntries + Math.floor(Math.random() * 500));
          const processed = Math.floor(entries * (0.6 + Math.random() * 0.35));
          
          mockAnalytics[node.id] = {
            entries,
            processed,
            openRate: node.data.label === 'Send Email' ? `${Math.floor(20 + Math.random() * 40)}%` : undefined,
            clickRate: node.data.label === 'Send Email' ? `${Math.floor(5 + Math.random() * 15)}%` : undefined,
            truePath: node.data.label === 'If/Else' ? Math.floor(processed * 0.6) : undefined,
            falsePath: node.data.label === 'If/Else' ? Math.floor(processed * 0.4) : undefined,
          };
        });
      }

      setNodes((nds) => 
        nds.map((node) => ({
          ...node,
          data: {
            ...node.data,
            stats: mockAnalytics[node.id] || null
          }
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
    const triggerNodes = nodes.filter(n => n.data.type === 'Trigger');
    if (triggerNodes.length === 0) {
      errors.push("At least one trigger node is required.");
    }

    // 2. Check for disconnected nodes
    nodes.forEach(node => {
      if (node.data.type !== 'Trigger') {
        const hasIncoming = edges.some(e => e.target === node.id);
        if (!hasIncoming) {
          addNodeError(node.id, `Node "${node.data.label}" is not connected to the workflow.`);
        }
      }
      
      // Check for outgoing (unless it's an end node - though in VJB most nodes should lead somewhere)
      const hasOutgoing = edges.some(e => e.source === node.id);
      if (!hasOutgoing && node.data.type !== 'Action') { // Actions can be end nodes
         // Maybe just a warning for now
      }
    });

    // 3. Check for missing configuration
    nodes.forEach(node => {
      const config = node.data.config;
      if (node.data.label === 'Send Email' && !config?.templateId) {
        addNodeError(node.id, `Email node is missing a template.`);
      }
      if (node.data.label === 'Add Tag' && !config?.tagId) {
        addNodeError(node.id, `Tag node is missing a tag selection.`);
      }
      if (node.data.label === 'Wait' && (!config?.duration || config.duration <= 0)) {
        addNodeError(node.id, `Delay node has an invalid duration.`);
      }
      if (node.data.label === 'If/Else' && !node.data.config?.conditionType) {
        addNodeError(node.id, `Logic node is missing a condition.`);
      }
    });

    // Update nodes with error state
    setNodes((nds) => 
      nds.map((node) => ({
        ...node,
        data: {
          ...node.data,
          errors: nodeErrors[node.id] || null
        }
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

  const onNodesDelete = useCallback((deleted: Node[]) => {
    const newNodes = nodes.filter(n => !deleted.find(d => d.id === n.id));
    saveToHistory(newNodes, edges);
  }, [nodes, edges, saveToHistory]);

  const onEdgesDelete = useCallback((deleted: Edge[]) => {
    const newEdges = edges.filter(e => !deleted.find(d => d.id === e.id));
    saveToHistory(nodes, newEdges);
  }, [nodes, edges, saveToHistory]);

  const handleCreateFlow = async (e: React.FormEvent) => {
    e.preventDefault();
    const flow = await api.addFlow({ name: newFlowName, status: 'DRAFT' });
    setFlows([flow, ...flows]);
    setIsCreating(false);
    setNewFlowName('');
    openFlow(flow);
  };

  const handleCreateFromTemplate = async (templateId: string) => {
    try {
      const flow = await api.createFlowFromTemplate(templateId);
      if ((flow as any).error) {
        alert("Error creating flow: " + (flow as any).error);
        return;
      }
      setFlows([flow, ...flows]);
      setView('FLOWS');
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
      if (flow.status === 'ACTIVE') {
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
    const updated = await api.updateFlow(activeFlow.id, {
      nodes: JSON.stringify(nodes),
      edges: JSON.stringify(edges),
    });
    setFlows(flows.map(f => f.id === updated.id ? updated : f));
    alert("Workflow saved.");
  };

  const addNode = (type: string, label: string, iconName: string, color: string) => {
    const newNode: Node = {
      id: `node-${Date.now()}`,
      type: 'custom',
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
      setNodes(nds => {
        setEdges(eds => {
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
              <p className="text-[10px] font-mono text-ink/40 uppercase">Status: {activeFlow.status}</p>
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
                showHeatmap ? "bg-brass text-white border-brass" : "bg-white text-ink border-border-hairline hover:border-ink"
              )}
            >
              <Zap size={14} />
              {showHeatmap ? "Heatmap On" : "Heatmap Off"}
            </button>
            <button 
              onClick={() => setShowFunnel(!showFunnel)}
              className={cn(
                "flex items-center gap-2 px-3 py-1 border text-[10px] font-bold uppercase transition-colors",
                showFunnel ? "bg-ink text-white border-ink" : "bg-white text-ink border-border-hairline hover:border-ink"
              )}
            >
              <BarChart3 size={14} />
              {showFunnel ? "Close Funnel" : "Funnel View"}
            </button>
            <button 
              onClick={() => setShowSimulation(true)}
              className="flex items-center gap-2 px-3 py-1 bg-white border border-border-hairline hover:border-ink text-[10px] font-bold uppercase transition-colors"
            >
              <Play size={14} />
              Simulate
            </button>
            <div className="relative group">
              <button 
                className={cn(
                  "flex items-center gap-2 px-3 py-1 border text-[10px] font-bold uppercase transition-colors",
                  activeFlow.scheduledAt ? "bg-emerald-500 text-white border-emerald-500" : "bg-white text-ink border-border-hairline hover:border-ink"
                )}
              >
                <Clock size={14} />
                {activeFlow.scheduledAt ? `Scheduled: ${new Date(activeFlow.scheduledAt).toLocaleDateString()}` : "Schedule Start"}
              </button>
              <div className="absolute right-0 top-full mt-2 w-64 bg-surface border border-border-hairline p-4 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[60]">
                <p className="text-[10px] font-black uppercase tracking-widest text-ink/40 mb-3">Workflow Schedule</p>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase">Start Date & Time</label>
                    <input 
                      type="datetime-local"
                      className="w-full bg-bg border border-border-hairline p-2 text-xs"
                      value={activeFlow.scheduledAt || ''}
                      onChange={(e) => {
                        const updated = { ...activeFlow, scheduledAt: e.target.value };
                        setActiveFlow(updated);
                        api.updateFlow(activeFlow.id, { scheduledAt: e.target.value });
                        setFlows(flows.map(f => f.id === activeFlow.id ? updated : f));
                      }}
                    />
                  </div>
                  {activeFlow.scheduledAt && (
                    <button 
                      onClick={() => {
                        const updated = { ...activeFlow, scheduledAt: undefined };
                        setActiveFlow(updated);
                        api.updateFlow(activeFlow.id, { scheduledAt: null as any });
                        setFlows(flows.map(f => f.id === activeFlow.id ? updated : f));
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
            {activeFlow.status === 'ACTIVE' && (
              <button 
                onClick={() => loadAnalytics(activeFlow.id)} 
                disabled={isAnalyticsLoading}
                className="btn-secondary flex items-center gap-2"
              >
                <RefreshCw size={14} className={cn(isAnalyticsLoading && "animate-spin")} />
                Refresh Stats
              </button>
            )}
            <button onClick={saveFlow} className="btn-secondary">Save Changes</button>
            <button 
              onClick={async () => {
                if (!validateFlow()) {
                  alert("Please fix validation errors before activating the flow.");
                  return;
                }
                const updated = await api.updateFlow(activeFlow.id, { status: 'ACTIVE' });
                setActiveFlow(updated);
                setFlows(flows.map(f => f.id === updated.id ? updated : f));
                loadAnalytics(updated.id);
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
                <span>Workflow has {validationErrors.length} validation errors that prevent activation</span>
              </div>
              <button onClick={() => setValidationErrors([])} className="hover:opacity-50">Dismiss</button>
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
              nodes={nodes.map(n => ({
                ...n,
                data: { 
                  ...n.data, 
                  isSimulated: simulationPath.includes(n.id),
                  isSimulationStep: simulationPath[simulationStep] === n.id
                }
              }))}
              edges={edges.map(e => ({
                ...e,
                animated: simulationPath.includes(e.source) && simulationPath.includes(e.target)
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
                nodeStrokeColor={(n: any) => n.data?.color?.split(' ')[1] || '#141414'}
                nodeColor={(n: any) => n.data?.color?.split(' ')[0] || '#f5f5f5'}
              />
              <Panel position="top-right" className="bg-bg border border-ink p-4 shadow-xl space-y-4 w-64">
                <p className="text-[10px] font-black uppercase tracking-widest border-b border-border-hairline pb-2">Workflow Components</p>
                
                <div className="space-y-4">
                  <div>
                    <p className="text-[8px] font-black uppercase text-ink/40 mb-2">Triggers</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => addNode('Trigger', 'On Signup', 'Zap', 'bg-burgundy/10 text-burgundy')} className="p-2 border border-border-hairline hover:border-burgundy text-[9px] font-bold uppercase text-left">Signup</button>
                      <button onClick={() => addNode('Trigger', 'Webhook', 'Globe', 'bg-burgundy/10 text-burgundy')} className="p-2 border border-border-hairline hover:border-burgundy text-[9px] font-bold uppercase text-left">Webhook</button>
                      <button onClick={() => addNode('Trigger', 'Custom Event', 'Sparkles', 'bg-burgundy/10 text-burgundy')} className="p-2 border border-border-hairline hover:border-burgundy text-[9px] font-bold uppercase text-left">Event</button>
                      <button onClick={() => addNode('Trigger', 'Scheduled', 'Clock', 'bg-burgundy/10 text-burgundy')} className="p-2 border border-border-hairline hover:border-burgundy text-[9px] font-bold uppercase text-left">Scheduled</button>
                    </div>
                  </div>

                  <div>
                    <p className="text-[8px] font-black uppercase text-ink/40 mb-2">Actions</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => addNode('Action', 'Send Email', 'Mail', 'bg-ink/5 text-ink')} className="p-2 border border-border-hairline hover:border-burgundy text-[9px] font-bold uppercase text-left">Email</button>
                      <button onClick={() => addNode('Action', 'Add Tag', 'Tag', 'bg-ink/5 text-ink')} className="p-2 border border-border-hairline hover:border-burgundy text-[9px] font-bold uppercase text-left">Tag</button>
                      <button onClick={() => addNode('Action', 'Wait', 'Clock', 'bg-ink/5 text-ink')} className="p-2 border border-border-hairline hover:border-burgundy text-[9px] font-bold uppercase text-left">Delay</button>
                    </div>
                  </div>

                  <div>
                    <p className="text-[8px] font-black uppercase text-ink/40 mb-2">Logic</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => addNode('Logic', 'If/Else', 'Split', 'bg-brass/10 text-brass')} className="p-2 border border-border-hairline hover:border-burgundy text-[9px] font-bold uppercase text-left">Split</button>
                      <button onClick={() => addNode('Logic', 'A/B Test', 'GitBranch', 'bg-brass/10 text-brass')} className="p-2 border border-border-hairline hover:border-burgundy text-[9px] font-bold uppercase text-left">A/B Test</button>
                      <button onClick={() => addNode('Logic', 'Multi-path Split', 'Filter', 'bg-brass/10 text-brass')} className="p-2 border border-border-hairline hover:border-burgundy text-[9px] font-bold uppercase text-left">Multi-path</button>
                    </div>
                  </div>
                </div>
              </Panel>
            </ReactFlow>
          </div>

          {/* Node Configuration Panel */}
          <AnimatePresence>
            {showFunnel && (
        <div className="fixed inset-0 bg-ink/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border-2 border-ink w-full max-w-4xl p-8 space-y-8"
          >
            <div className="flex justify-between items-center border-b border-border-hairline pb-4">
              <div className="flex items-center gap-3">
                <BarChart3 className="text-burgundy" size={24} />
                <h3 className="text-2xl font-serif font-black uppercase italic">Journey Funnel Analysis</h3>
              </div>
              <button onClick={() => setShowFunnel(false)} className="hover:opacity-50"><X size={24} /></button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <p className="text-[10px] font-black uppercase tracking-widest text-ink/40">Step-by-Step Conversion</p>
                <div className="space-y-4">
                  {nodes
                    .filter(n => n.data.stats)
                    .sort((a, b) => (b.data.stats.entries || 0) - (a.data.stats.entries || 0))
                    .slice(0, 6)
                    .map((node, idx, arr) => {
                      const stats = node.data.stats;
                      const dropOff = stats.entries > 0 ? ((stats.entries - (stats.processed || 0)) / stats.entries) * 100 : 0;
                      const width = (stats.entries / arr[0].data.stats.entries) * 100;

                      return (
                        <div key={node.id} className="space-y-1">
                          <div className="flex justify-between items-end">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono text-ink/40">0{idx + 1}</span>
                              <span className="text-xs font-bold uppercase">{node.data.label}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-xs font-serif font-bold">{stats.entries.toLocaleString()}</span>
                              <span className="text-[8px] font-black uppercase text-ink/40 ml-2">Entries</span>
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
                <p className="text-[10px] font-black uppercase tracking-widest text-ink/40">Critical Bottlenecks</p>
                <div className="space-y-4">
                  {nodes
                    .filter(n => n.data.stats)
                    .map(n => ({
                      id: n.id,
                      label: n.data.label,
                      dropOff: n.data.stats.entries > 0 ? ((n.data.stats.entries - (n.data.stats.processed || 0)) / n.data.stats.entries) * 100 : 0
                    }))
                    .sort((a, b) => b.dropOff - a.dropOff)
                    .filter(n => n.dropOff > 20)
                    .slice(0, 4)
                    .map((b, idx) => (
                      <div key={b.id} className="p-4 border border-burgundy/20 bg-burgundy/5 space-y-2">
                        <div className="flex justify-between items-start">
                          <span className="text-[9px] font-black uppercase text-burgundy">Priority 0{idx + 1}</span>
                          <AlertTriangle size={14} className="text-burgundy" />
                        </div>
                        <p className="text-sm font-serif font-bold">{b.label}</p>
                        <div className="flex justify-between items-center">
                          <span className="text-[8px] font-black uppercase text-ink/40">Drop-off Rate</span>
                          <span className="text-xs font-bold text-burgundy">{Math.round(b.dropOff)}%</span>
                        </div>
                      </div>
                    ))}
                  
                  {nodes.filter(n => n.data.stats && ((n.data.stats.entries - (n.data.stats.processed || 0)) / n.data.stats.entries) * 100 > 20).length === 0 && (
                    <div className="p-8 border border-dashed border-border-hairline text-center">
                      <CheckCircle2 size={24} className="mx-auto text-status-success mb-2 opacity-20" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-ink/20">No major bottlenecks detected</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {showSimulation && (
        <div className="fixed inset-0 bg-ink/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border-2 border-ink w-full max-w-md p-8 space-y-6"
          >
            <div className="flex justify-between items-center border-b border-border-hairline pb-4">
              <h3 className="text-xl font-serif font-black uppercase italic">Simulate Journey</h3>
              <button onClick={() => { setShowSimulation(false); setSimulationPath([]); }} className="hover:opacity-50"><X size={20} /></button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-ink/40">Test Contact Profile</label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase">Tags (comma separated)</label>
                    <input 
                      type="text" 
                      className="w-full p-2 border border-border-hairline text-xs font-mono"
                      value={simulatedContact.tags.join(', ')}
                      onChange={(e) => setSimulatedContact({ ...simulatedContact, tags: e.target.value.split(',').map(t => t.trim()) })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase">Purchases</label>
                    <input 
                      type="number" 
                      className="w-full p-2 border border-border-hairline text-xs font-mono"
                      value={simulatedContact.purchases}
                      onChange={(e) => setSimulatedContact({ ...simulatedContact, purchases: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    const path: string[] = [];
                    let currentNode = nodes.find(n => n.data.type === 'Trigger');
                    
                    if (currentNode) {
                      path.push(currentNode.id);
                      
                      for (let i = 0; i < 20; i++) {
                        const outgoingEdges = edges.filter(e => e.source === currentNode?.id);
                        if (outgoingEdges.length === 0) break;

                        if (currentNode?.data.label === 'If/Else') {
                          const config = currentNode.data.config;
                          let result = false;
                          if (config?.condition === 'tag_exists') {
                            result = simulatedContact.tags.includes(config.tagId);
                          } else if (config?.condition === 'has_purchased') {
                            result = simulatedContact.purchases > 0;
                          }
                          
                          const targetEdge = outgoingEdges.find(e => e.sourceHandle === (result ? 'true' : 'false'));
                          if (targetEdge) {
                            currentNode = nodes.find(n => n.id === targetEdge.target);
                          } else {
                            break;
                          }
                        } else if (currentNode?.data.label === 'A/B Test') {
                          const result = Math.random() * 100 < (currentNode.data.config?.splitPercentage || 50) ? 'a' : 'b';
                          const targetEdge = outgoingEdges.find(e => e.sourceHandle === result);
                          if (targetEdge) {
                            currentNode = nodes.find(n => n.id === targetEdge.target);
                          } else {
                            break;
                          }
                        } else if (currentNode?.data.label === 'Multi-path Split') {
                          const paths = currentNode.data.config?.paths || ['Path 1', 'Path 2'];
                          const randomIdx = Math.floor(Math.random() * paths.length);
                          const targetEdge = outgoingEdges.find(e => e.sourceHandle === `path-${randomIdx}`);
                          if (targetEdge) {
                            currentNode = nodes.find(n => n.id === targetEdge.target);
                          } else {
                            currentNode = nodes.find(n => n.id === outgoingEdges[0].target);
                          }
                        } else {
                          currentNode = nodes.find(n => n.id === outgoingEdges[0].target);
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
                        setSimulationStep(prev => prev + 1);
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
                    className="p-3 bg-ink text-white hover:bg-ink/90 transition-colors"
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
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                className="w-80 bg-surface border-l border-border-hairline p-6 overflow-y-auto z-50"
              >
                <div className="flex justify-between items-center mb-8">
                  <h3 className="font-serif text-xl font-bold">Configure Node</h3>
                  <button onClick={() => setSelectedNode(null)} className="text-ink/40 hover:text-burgundy">
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-8">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-ink/40 mb-2">Node Type</p>
                    <div className="flex items-center gap-3 p-3 bg-bg border border-border-hairline">
                      <div className={cn("p-2", selectedNode.data.color)}>
                        {React.createElement(iconMap[selectedNode.data.icon] || Zap, { size: 16 })}
                      </div>
                      <div>
                        <p className="text-xs font-bold">{selectedNode.data.label}</p>
                        <p className="text-[8px] font-black uppercase text-ink/40">{selectedNode.data.type}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-border-hairline">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-black uppercase tracking-widest text-ink/40">Step Schedule</p>
                      <button 
                        onClick={() => updateNodeConfig(selectedNode.id, { hasStepSchedule: !selectedNode.data.config?.hasStepSchedule })}
                        className={cn(
                          "text-[8px] font-bold uppercase px-2 py-0.5 border transition-colors",
                          selectedNode.data.config?.hasStepSchedule ? "bg-emerald-500 text-white border-emerald-500" : "text-ink/40 border-border-hairline hover:border-ink"
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
                            className="w-full bg-white border border-border-hairline p-2 text-xs"
                            value={selectedNode.data.config?.stepScheduleType || 'delay'}
                            onChange={(e) => updateNodeConfig(selectedNode.id, { stepScheduleType: e.target.value })}
                          >
                            <option value="delay">Relative Delay</option>
                            <option value="fixed">Fixed Date/Time</option>
                          </select>
                        </div>
                        {selectedNode.data.config?.stepScheduleType === 'fixed' ? (
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold uppercase">Run At</label>
                            <input 
                              type="datetime-local"
                              className="w-full bg-white border border-border-hairline p-2 text-xs"
                              value={selectedNode.data.config?.stepScheduledAt || ''}
                              onChange={(e) => updateNodeConfig(selectedNode.id, { stepScheduledAt: e.target.value })}
                            />
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold uppercase">Delay</label>
                              <input 
                                type="number"
                                className="w-full bg-white border border-border-hairline p-2 text-xs"
                                value={selectedNode.data.config?.stepDelay || 0}
                                onChange={(e) => updateNodeConfig(selectedNode.id, { stepDelay: parseInt(e.target.value) })}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold uppercase">Unit</label>
                              <select 
                                className="w-full bg-white border border-border-hairline p-2 text-xs"
                                value={selectedNode.data.config?.stepDelayUnit || 'hours'}
                                onChange={(e) => updateNodeConfig(selectedNode.id, { stepDelayUnit: e.target.value })}
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
                  {selectedNode.data.label === 'Send Email' && (
                    <div className="space-y-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-ink/40">Email Settings</p>
                      <div className="space-y-2">
                        <label className="text-[9px] font-bold uppercase">Select Template</label>
                        <select 
                          className="w-full bg-bg border border-border-hairline p-2 text-xs"
                          value={selectedNode.data.config?.templateId || ''}
                          onChange={(e) => updateNodeConfig(selectedNode.id, { templateId: e.target.value })}
                        >
                          <option value="">Choose a template...</option>
                          {emailTemplates.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-bold uppercase">Subject Override (Optional)</label>
                        <input 
                          type="text"
                          className="w-full bg-bg border border-border-hairline p-2 text-xs"
                          placeholder="Leave empty to use template subject"
                          value={selectedNode.data.config?.subject || ''}
                          onChange={(e) => updateNodeConfig(selectedNode.id, { subject: e.target.value })}
                        />
                      </div>
                    </div>
                  )}

                  {selectedNode.data.label === 'Scheduled' && (
                    <div className="space-y-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-ink/40">Schedule Settings</p>
                      <div className="space-y-2">
                        <label className="text-[9px] font-bold uppercase">Schedule Type</label>
                        <select 
                          className="w-full bg-bg border border-border-hairline p-2 text-xs"
                          value={selectedNode.data.config?.scheduleType || 'once'}
                          onChange={(e) => updateNodeConfig(selectedNode.id, { scheduleType: e.target.value })}
                        >
                          <option value="once">One-time</option>
                          <option value="recurring">Recurring</option>
                        </select>
                      </div>
                      {selectedNode.data.config?.scheduleType === 'once' ? (
                        <div className="space-y-2">
                          <label className="text-[9px] font-bold uppercase">Date & Time</label>
                          <input 
                            type="datetime-local"
                            className="w-full bg-bg border border-border-hairline p-2 text-xs"
                            value={selectedNode.data.config?.scheduledAt || ''}
                            onChange={(e) => updateNodeConfig(selectedNode.id, { scheduledAt: e.target.value })}
                          />
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <label className="text-[9px] font-bold uppercase">Frequency</label>
                          <select 
                            className="w-full bg-bg border border-border-hairline p-2 text-xs"
                            value={selectedNode.data.config?.frequency || 'daily'}
                            onChange={(e) => updateNodeConfig(selectedNode.id, { frequency: e.target.value })}
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

                  {selectedNode.data.label === 'Wait' && (
                    <div className="space-y-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-ink/40">Delay Settings</p>
                      <div className="space-y-2">
                        <label className="text-[9px] font-bold uppercase">Wait Type</label>
                        <select 
                          className="w-full bg-bg border border-border-hairline p-2 text-xs"
                          value={selectedNode.data.config?.waitType || 'duration'}
                          onChange={(e) => updateNodeConfig(selectedNode.id, { waitType: e.target.value })}
                        >
                          <option value="duration">Specific Duration</option>
                          <option value="until">Until Specific Date</option>
                        </select>
                      </div>
                      
                      {selectedNode.data.config?.waitType === 'until' ? (
                        <div className="space-y-2">
                          <label className="text-[9px] font-bold uppercase">Wait Until</label>
                          <input 
                            type="datetime-local"
                            className="w-full bg-bg border border-border-hairline p-2 text-xs"
                            value={selectedNode.data.config?.waitUntil || ''}
                            onChange={(e) => updateNodeConfig(selectedNode.id, { waitUntil: e.target.value })}
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
                              onChange={(e) => updateNodeConfig(selectedNode.id, { duration: parseInt(e.target.value) })}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[9px] font-bold uppercase">Unit</label>
                            <select 
                              className="w-full bg-bg border border-border-hairline p-2 text-xs"
                              value={selectedNode.data.config?.unit || 'days'}
                              onChange={(e) => updateNodeConfig(selectedNode.id, { unit: e.target.value })}
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

                  {selectedNode.data.label === 'Add Tag' && (
                    <div className="space-y-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-ink/40">Tag Settings</p>
                      <div className="space-y-2">
                        <label className="text-[9px] font-bold uppercase">Select Tag</label>
                        <select 
                          className="w-full bg-bg border border-border-hairline p-2 text-xs"
                          value={selectedNode.data.config?.tagId || ''}
                          onChange={(e) => updateNodeConfig(selectedNode.id, { tagId: e.target.value })}
                        >
                          <option value="">Choose a tag...</option>
                          {availableTags.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {selectedNode.data.label === 'If/Else' && (
                    <div className="space-y-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-ink/40">Logic Settings</p>
                      <div className="space-y-2">
                        <label className="text-[9px] font-bold uppercase">Condition Type</label>
                        <select 
                          className="w-full bg-bg border border-border-hairline p-2 text-xs"
                          value={selectedNode.data.config?.conditionType || 'email_open'}
                          onChange={(e) => updateNodeConfig(selectedNode.id, { conditionType: e.target.value })}
                        >
                          <option value="email_open">Email Opened</option>
                          <option value="email_click">Link Clicked</option>
                          <option value="tag_exists">Has Tag</option>
                          <option value="purchase_made">Made Purchase</option>
                        </select>
                      </div>
                      {selectedNode.data.config?.conditionType === 'tag_exists' && (
                        <div className="space-y-2">
                          <label className="text-[9px] font-bold uppercase">Tag to Check</label>
                          <select 
                            className="w-full bg-bg border border-border-hairline p-2 text-xs"
                            value={selectedNode.data.config?.checkTagId || ''}
                            onChange={(e) => updateNodeConfig(selectedNode.id, { checkTagId: e.target.value })}
                          >
                            <option value="">Choose a tag...</option>
                            {availableTags.map(t => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  )}

                  {selectedNode.data.label === 'A/B Test' && (
                    <div className="space-y-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-ink/40">A/B Test Settings</p>
                      <div className="space-y-2">
                        <label className="text-[9px] font-bold uppercase">Split Percentage (Var A)</label>
                        <div className="flex items-center gap-4">
                          <input 
                            type="range"
                            min="0"
                            max="100"
                            className="flex-1 accent-burgundy"
                            value={selectedNode.data.config?.splitPercentage || 50}
                            onChange={(e) => updateNodeConfig(selectedNode.id, { splitPercentage: parseInt(e.target.value) })}
                          />
                          <span className="text-xs font-mono font-bold w-12">{selectedNode.data.config?.splitPercentage || 50}%</span>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-[9px] font-bold uppercase">Winner Criteria</label>
                        <select 
                          className="w-full bg-bg border border-border-hairline p-2 text-xs"
                          value={selectedNode.data.config?.winnerCriteria || 'OPEN_RATE'}
                          onChange={(e) => updateNodeConfig(selectedNode.id, { winnerCriteria: e.target.value })}
                        >
                          <option value="OPEN_RATE">Highest Open Rate</option>
                          <option value="CLICK_RATE">Highest Click Rate</option>
                          <option value="REVENUE">Highest Revenue</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[9px] font-bold uppercase">Test Duration (Hours)</label>
                        <input 
                          type="number"
                          className="w-full bg-bg border border-border-hairline p-2 text-xs"
                          value={selectedNode.data.config?.testDuration || 24}
                          onChange={(e) => updateNodeConfig(selectedNode.id, { testDuration: parseInt(e.target.value) })}
                        />
                      </div>

                      <div className="p-3 bg-bg border border-border-hairline text-[10px] text-ink/60 italic">
                        Contacts will be randomly split between Path A and Path B. After the duration, the winner will be determined based on the selected criteria.
                      </div>
                    </div>
                  )}

                  {selectedNode.data.label === 'Multi-path Split' && (
                    <div className="space-y-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-ink/40">Multi-path Settings</p>
                      <div className="space-y-3">
                        <label className="text-[9px] font-bold uppercase">Paths</label>
                        {(selectedNode.data.config?.paths || ['Path 1', 'Path 2']).map((path: string, idx: number) => (
                          <div key={idx} className="flex gap-2">
                            <input 
                              type="text"
                              className="flex-1 bg-bg border border-border-hairline p-2 text-xs"
                              value={path}
                              onChange={(e) => {
                                const newPaths = [...(selectedNode.data.config?.paths || ['Path 1', 'Path 2'])];
                                newPaths[idx] = e.target.value;
                                updateNodeConfig(selectedNode.id, { paths: newPaths });
                              }}
                            />
                            <button 
                              onClick={() => {
                                const newPaths = (selectedNode.data.config?.paths || ['Path 1', 'Path 2']).filter((_: any, i: number) => i !== idx);
                                updateNodeConfig(selectedNode.id, { paths: newPaths });
                              }}
                              className="p-2 text-burgundy hover:bg-burgundy/5"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                        <button 
                          onClick={() => {
                            const newPaths = [...(selectedNode.data.config?.paths || ['Path 1', 'Path 2']), `Path ${(selectedNode.data.config?.paths || ['Path 1', 'Path 2']).length + 1}`];
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
                        setNodes((nds) => nds.filter(n => n.id !== selectedNode.id));
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
        title="Automations" 
        subtitle="Design visual workflows and track real-time subscriber events."
        guideKey="automation-flows"
        action={
          <div className="flex gap-4">
            <div className="flex bg-surface border border-border-hairline p-1">
              <button 
                onClick={() => setView('FLOWS')} 
                className={cn("px-4 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all", view === 'FLOWS' ? "bg-ink text-white" : "text-ink/40 hover:text-ink")}
              >
                Workflows
              </button>
              <button 
                onClick={() => setView('TEMPLATES')} 
                className={cn("px-4 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all", view === 'TEMPLATES' ? "bg-ink text-white" : "text-ink/40 hover:text-ink")}
              >
                Templates
              </button>
              <button 
                onClick={() => setView('EVENTS')} 
                className={cn("px-4 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all", view === 'EVENTS' ? "bg-ink text-white" : "text-ink/40 hover:text-ink")}
              >
                Events
              </button>
            </div>
            <button onClick={() => setIsCreating(true)} className="btn-primary flex items-center gap-2">
              <Plus size={16} /> Create Workflow
            </button>
          </div>
        }
      />

      {view === 'FLOWS' && (
        <div className="newspaper-grid">
          {flows.map(flow => (
            <div key={flow.id} className="col-span-12 lg:col-span-4 bg-surface border border-border-hairline p-8 group hover:border-burgundy transition-all cursor-pointer" onClick={() => openFlow(flow)}>
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 bg-ink text-white flex items-center justify-center">
                  <Zap size={24} />
                </div>
                <span className={cn(
                  "px-2 py-0.5 text-[8px] font-black uppercase border",
                  flow.status === 'ACTIVE' ? "border-status-success text-status-success bg-status-success/5" : "border-ink/20 text-ink/40"
                )}>
                  {flow.status}
                </span>
              </div>
              <h3 className="font-serif text-2xl font-bold group-hover:text-burgundy transition-colors">{flow.name}</h3>
              <p className="text-[10px] font-mono text-ink/40 uppercase mt-2">
                Last updated {format(new Date(flow.updatedAt), 'MMM d, yyyy')}
              </p>
              <div className="mt-8 pt-6 border-t border-border-hairline flex justify-between items-center">
                <div className="flex -space-x-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="w-6 h-6 rounded-full border border-bg bg-surface flex items-center justify-center text-[8px] font-bold">
                      {i}
                    </div>
                  ))}
                </div>
                <ChevronRight size={16} className="text-ink/20 group-hover:text-burgundy group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          ))}

          {flows.length === 0 && (
            <div className="col-span-12 py-32 text-center border border-dashed border-border-hairline">
              <p className="font-editorial italic text-4xl text-ink/20">No automation workflows defined.</p>
            </div>
          )}
        </div>
      )}

      {view === 'TEMPLATES' && (
        <div className="space-y-12">
          {['ONBOARDING', 'ENGAGEMENT', 'REVENUE', 'SUPPORT', 'EVENT_DRIVEN', 'AI_POWERED'].map(category => {
            const categoryTemplates = templates.filter(t => t.category === category);
            if (categoryTemplates.length === 0) return null;

            return (
              <div key={category} className="space-y-6">
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-ink/40 border-b border-border-hairline pb-2">{category.replace('_', ' ')}</h3>
                <div className="grid grid-cols-12 gap-6">
                  {categoryTemplates.map(template => (
                    <div key={template.id} className="col-span-12 lg:col-span-4 bg-surface border border-border-hairline p-8 space-y-6 group hover:border-burgundy transition-all">
                      <div className="flex justify-between items-start">
                        <div className="w-10 h-10 bg-bg border border-border-hairline flex items-center justify-center text-ink/20 group-hover:text-burgundy">
                          <FileText size={20} />
                        </div>
                        {category === 'AI_POWERED' && (
                          <span className="px-2 py-0.5 bg-burgundy text-white text-[8px] font-black uppercase tracking-widest">AI</span>
                        )}
                      </div>
                      <div>
                        <h4 className="text-lg font-serif font-bold text-ink">{template.name}</h4>
                        <p className="text-xs font-editorial italic text-ink/60 mt-1">{template.description}</p>
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
          })}
        </div>
      )}

      {view === 'EVENTS' && (
        <div className="space-y-8">
          <div className="newspaper-grid">
            <div className="col-span-12 lg:col-span-8">
              <div className="bg-surface border border-border-hairline p-8">
                <h3 className="font-sans font-black uppercase tracking-widest text-xs border-b border-ink pb-4 mb-8">Real-time Event Stream</h3>
                <div className="space-y-4">
                  {events.map((event, i) => (
                    <div key={event.id} className="flex items-center gap-6 py-4 border-b border-border-hairline last:border-0">
                      <div className="w-10 h-10 bg-bg flex items-center justify-center text-burgundy">
                        {event.type === 'CLICK' ? <MousePointerClick size={16} /> : 
                         event.type === 'OPEN' ? <Eye size={16} /> : 
                         event.type === 'PURCHASE' ? <Zap size={16} /> : <Globe size={16} />}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <p className="text-sm font-bold">
                            {event.contact?.firstName} {event.contact?.lastName}
                          </p>
                          <p className="text-[10px] font-mono text-ink/40 uppercase">
                            {format(new Date(event.timestamp), 'HH:mm:ss')}
                          </p>
                        </div>
                        <p className="text-xs text-ink/60">
                          <span className="font-black uppercase text-[10px] text-burgundy mr-2">{event.type}</span>
                          {JSON.parse(event.metadata).url || 'Interaction detected'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="col-span-12 lg:col-span-4 space-y-8">
              <div className="bg-ink text-white p-8 space-y-6">
                <h3 className="font-serif text-2xl font-bold">Event Analytics</h3>
                <div className="space-y-4">
                  {[
                    { label: 'Page Visits', value: '12.4k', delta: '+12%' },
                    { label: 'Button Clicks', value: '3.8k', delta: '+5%' },
                    { label: 'Purchases', value: '412', delta: '+18%' },
                  ].map(stat => (
                    <div key={stat.label} className="flex justify-between items-end border-b border-white/10 pb-2">
                      <div>
                        <p className="text-[10px] font-black uppercase text-white/40">{stat.label}</p>
                        <p className="text-3xl font-serif font-bold">{stat.value}</p>
                      </div>
                      <p className="text-status-success text-xs font-mono">{stat.delta}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-surface border border-border-hairline p-8 space-y-4">
                <h4 className="font-serif text-xl font-bold">Custom Events API</h4>
                <p className="text-xs text-ink/60 leading-relaxed">
                  Track custom behavioral data using our SDK or Webhook endpoint.
                </p>
                <div className="bg-bg p-4 font-mono text-[10px] text-ink/60 overflow-x-auto">
                  <p className="text-burgundy">POST /api/events</p>
                  <p className="mt-2">{"{"}</p>
                  <p className="pl-4">"type": "PURCHASE",</p>
                  <p className="pl-4">"metadata": {"{ \"amount\": 99 }"}</p>
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-10 bg-ink/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-bg border border-ink w-full max-w-md p-8 shadow-2xl space-y-6"
            >
              <h2 className="font-serif text-2xl font-bold">New Automation Workflow</h2>
              <form onSubmit={handleCreateFlow} className="space-y-4">
                <div className="space-y-1">
                  <label className="metric-label">Workflow Name</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Welcome Series"
                    className="w-full bg-transparent border-b border-border-hairline py-1 font-sans font-bold text-sm outline-none focus:border-burgundy"
                    value={newFlowName}
                    onChange={e => setNewFlowName(e.target.value)}
                  />
                </div>
                <div className="pt-4 flex gap-4">
                  <button type="submit" className="btn-primary flex-1 py-3">Create Workflow</button>
                  <button type="button" onClick={() => setIsCreating(false)} className="flex-1 py-3 font-sans font-black uppercase tracking-widest text-[10px] border border-border-hairline">Cancel</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const VisualStudio = () => {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '16:9' | '9:16' | '4:3' | '3:4'>('1:1');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [assets, setAssets] = useState<any[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(true);

  useEffect(() => {
    loadAssets();
  }, []);

  const loadAssets = async () => {
    setLoadingAssets(true);
    try {
      const data = await api.getAssets();
      setAssets(data);
    } catch (err) {
      console.error("Failed to load assets", err);
    } finally {
      setLoadingAssets(false);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setGeneratedImage(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: prompt }],
        },
        config: {
          imageConfig: {
            aspectRatio,
          },
        },
      });

      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          const base64Data = part.inlineData.data;
          setGeneratedImage(`data:image/png;base64,${base64Data}`);
          break;
        }
      }
    } catch (err) {
      console.error("Generation failed", err);
      alert("Failed to generate image. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!generatedImage) return;
    
    try {
      await api.addAsset({
        name: prompt.slice(0, 30) || "Generated Image",
        url: generatedImage,
        type: 'IMAGE',
        metadata: { prompt, aspectRatio }
      });
      setGeneratedImage(null);
      setPrompt('');
      loadAssets();
    } catch (err) {
      console.error("Failed to save asset", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Delete this asset?")) {
      await api.deleteAsset(id);
      loadAssets();
    }
  };

  return (
    <div className="space-y-16">
      <SectionHeader 
        title="AI Visual Studio" 
        subtitle="Generate bespoke editorial illustrations and brand assets using Gemini 2.5."
        guideKey="visual-studio-canvas"
      />

      <div className="newspaper-grid">
        <div className="col-span-12 lg:col-span-5 space-y-8 pr-8 lg:border-r border-border-hairline">
          <div className="space-y-6">
            <h3 className="font-sans font-black uppercase tracking-widest text-xs border-b border-ink pb-2">Generation Controls</h3>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="metric-label">Prompt</label>
                <textarea 
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe the image you want to create... (e.g., 'A minimalist editorial illustration of a robot reading a newspaper in a futuristic cafe, muted earth tones')"
                  className="w-full h-32 bg-surface border border-border-hairline p-4 font-serif text-sm focus:border-burgundy outline-none transition-all resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="metric-label">Aspect Ratio</label>
                <div className="grid grid-cols-5 gap-2">
                  {(['1:1', '16:9', '9:16', '4:3', '3:4'] as const).map(ratio => (
                    <button
                      key={ratio}
                      onClick={() => setAspectRatio(ratio)}
                      className={cn(
                        "py-2 border text-[10px] font-black uppercase tracking-widest transition-all",
                        aspectRatio === ratio ? "bg-ink text-white border-ink" : "border-border-hairline text-ink/40 hover:border-ink hover:text-ink"
                      )}
                    >
                      {ratio}
                    </button>
                  ))}
                </div>
              </div>

              <button 
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="w-full py-4 bg-burgundy text-white font-black uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-burgundy/90 transition-all"
              >
                {isGenerating ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Generating Signal...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    Generate Asset
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="bg-surface p-8 space-y-4">
            <h4 className="font-serif text-xl font-bold">Pro Tips</h4>
            <ul className="space-y-3">
              {[
                "Use 'editorial illustration' for a magazine feel.",
                "Specify 'muted tones' or 'high contrast' for style.",
                "Describe the lighting: 'cinematic', 'soft morning light'.",
                "Mention the medium: 'oil painting', 'vector art', 'pencil sketch'."
              ].map((tip, i) => (
                <li key={i} className="text-xs text-ink/60 flex gap-3 italic">
                  <span className="text-burgundy font-black">0{i+1}</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-7 space-y-8">
          <h3 className="font-sans font-black uppercase tracking-widest text-xs border-b border-ink pb-2">Output Preview</h3>
          
          <div className="aspect-video bg-surface border border-border-hairline flex items-center justify-center relative overflow-hidden group">
            {isGenerating ? (
              <div className="text-center space-y-4">
                <div className="w-12 h-12 border-2 border-burgundy border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="font-editorial italic text-ink/40">Synthesizing visual data...</p>
              </div>
            ) : generatedImage ? (
              <>
                <img 
                  src={generatedImage} 
                  alt="Generated" 
                  className="max-w-full max-h-full object-contain"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-ink/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                  <button 
                    onClick={handleSave}
                    className="bg-white text-ink px-6 py-2 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-burgundy hover:text-white transition-all"
                  >
                    <CheckCircle2 size={14} />
                    Save to Library
                  </button>
                  <button 
                    onClick={() => setGeneratedImage(null)}
                    className="bg-white/10 text-white border border-white/20 px-6 py-2 text-[10px] font-black uppercase tracking-widest hover:bg-white/20 transition-all"
                  >
                    Discard
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center space-y-4 opacity-20">
                <ImageIcon size={64} className="mx-auto" />
                <p className="font-editorial italic">Awaiting transmission...</p>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-ink pb-2">
              <h3 className="font-sans font-black uppercase tracking-widest text-xs">Asset Library</h3>
              <p className="text-[10px] font-mono text-ink/40 uppercase">{assets.length} Assets Stored</p>
            </div>

            {loadingAssets ? (
              <div className="py-12 text-center font-editorial italic text-ink/40">Loading library...</div>
            ) : (
              <div className="grid grid-cols-4 gap-4">
                {assets.map(asset => (
                  <div key={asset.id} className="group relative aspect-square bg-surface border border-border-hairline overflow-hidden">
                    <img 
                      src={asset.url} 
                      alt={asset.name} 
                      className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-ink/80 opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-between">
                      <div className="flex justify-end gap-2">
                        <a 
                          href={asset.url} 
                          download={`${asset.name}.png`}
                          className="w-8 h-8 bg-white/10 text-white flex items-center justify-center hover:bg-burgundy transition-colors"
                        >
                          <Download size={14} />
                        </a>
                        <button 
                          onClick={() => handleDelete(asset.id)}
                          className="w-8 h-8 bg-white/10 text-white flex items-center justify-center hover:bg-burgundy transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-white truncate">{asset.name}</p>
                        <p className="text-[8px] font-mono text-white/40 uppercase">{format(new Date(asset.createdAt), 'MMM d, yyyy')}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {assets.length === 0 && (
                  <div className="col-span-4 py-12 text-center border border-dashed border-border-hairline">
                    <p className="font-editorial italic text-ink/40">Library is empty. Generate your first asset above.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const DispatchView = () => {
  const { id } = useParams<{ id: string }>();
  const [campaign, setCampaign] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [scrollDepth, setScrollDepth] = useState(0);
  const startTime = useRef(Date.now());
  const [searchParams] = useSearchParams();
  const contactId = searchParams.get('cid') || undefined;

  useEffect(() => {
    if (id) {
      api.getCampaignAnalytics(id).then(res => {
        setCampaign(res.campaign);
        setLoading(false);
      });
    }
  }, [id]);

  useEffect(() => {
    if (!campaign) return;

    const handleScroll = () => {
      const winHeight = window.innerHeight;
      const docHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY;
      const depth = Math.round((scrollTop / (docHeight - winHeight)) * 100);
      
      if (depth > scrollDepth && depth <= 100) {
        setScrollDepth(depth);
        // Track milestone every 10%
        if (depth % 10 === 0 && depth > 0) {
          api.trackEngagement({
            campaignId: campaign.id,
            contactId,
            type: 'scroll',
            value: depth
          });
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [campaign, scrollDepth, contactId]);

  useEffect(() => {
    const trackTime = () => {
      if (campaign) {
        const duration = Math.round((Date.now() - startTime.current) / 1000);
        if (duration > 2) { // Only track if they stayed more than 2 seconds
          api.trackEngagement({
            campaignId: campaign.id,
            contactId,
            type: 'read_time',
            value: duration
          });
        }
      }
    };

    window.addEventListener('beforeunload', trackTime);
    return () => {
      trackTime();
      window.removeEventListener('beforeunload', trackTime);
    };
  }, [campaign, contactId]);

  if (loading) return <div className="p-20 text-center font-editorial italic text-3xl">Loading dispatch...</div>;
  if (!campaign) return <div className="p-20 text-center font-editorial italic text-3xl">Dispatch not found.</div>;

  return (
    <div className="bg-bg min-h-screen py-20 px-4">
      <div className="max-w-3xl mx-auto bg-white border border-ink p-12 md:p-20 shadow-[16px_16px_0px_0px_rgba(26,24,20,1)]">
        <div className="border-b-2 border-ink pb-8 mb-12 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-burgundy mb-4">SIGNAL BROADCAST SYSTEM</p>
          <h1 className="text-5xl font-serif font-bold text-ink mb-4">{campaign.name}</h1>
          <p className="text-xl font-editorial italic text-ink/60">{campaign.subject}</p>
        </div>
        <div className="prose prose-lg font-serif mx-auto" dangerouslySetInnerHTML={{ __html: campaign.content }} />
        <div className="mt-20 pt-12 border-t border-border-hairline text-center">
          <p className="text-[10px] font-mono text-ink/40 uppercase tracking-widest">End of Dispatch • Sent via SIGNAL</p>
        </div>
      </div>
    </div>
  );
};

// --- Command Palette ---

const CommandPalette = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen) {
      api.getCampaigns().then(setCampaigns);
      api.getContacts().then(setContacts);
    }
  }, [isOpen]);

  const navItems = [
    { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={16} /> },
    { name: 'Broadcasts', path: '/campaigns', icon: <Send size={16} /> },
    { name: 'Audience', path: '/audiences', icon: <Users size={16} /> },
    { name: 'Automations', path: '/automations', icon: <Zap size={16} /> },
    { name: 'Visual Studio', path: '/visual-studio', icon: <Sparkles size={16} /> },
    { name: 'Reports', path: '/reports', icon: <BarChart3 size={16} /> },
    { name: 'Infrastructure', path: '/infrastructure', icon: <Shield size={16} /> },
    { name: 'Data Layer', path: '/data-layer', icon: <Activity size={16} /> },
  ];

  const filteredNav = navItems.filter(item => item.name.toLowerCase().includes(query.toLowerCase()));
  const filteredCampaigns = campaigns.filter(c => c.name.toLowerCase().includes(query.toLowerCase())).slice(0, 5);
  const filteredContacts = contacts.filter(c => `${c.firstName} ${c.lastName}`.toLowerCase().includes(query.toLowerCase())).slice(0, 5);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh] px-6 bg-ink/20 backdrop-blur-sm" onClick={() => setIsOpen(false)}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.98, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-bg border border-ink w-full max-w-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-4 p-6 border-b border-border-hairline bg-surface">
          <Search size={20} className="text-ink/40" />
          <input 
            autoFocus
            type="text" 
            placeholder="Search broadcasts, contacts, or navigate..." 
            className="flex-1 bg-transparent border-none outline-none font-serif text-2xl placeholder:text-ink/20"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <div className="px-2 py-1 border border-border-hairline text-[9px] font-black uppercase tracking-widest text-ink/40">ESC</div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-6">
          {filteredNav.length > 0 && (
            <div className="space-y-2">
              <p className="text-[9px] font-black uppercase tracking-widest text-ink/40 px-2">Navigation</p>
              <div className="grid grid-cols-2 gap-1">
                {filteredNav.map(item => (
                  <button 
                    key={item.path}
                    onClick={() => { navigate(item.path); setIsOpen(false); }}
                    className="flex items-center gap-3 p-3 hover:bg-surface text-left transition-colors group"
                  >
                    <span className="text-ink/40 group-hover:text-burgundy">{item.icon}</span>
                    <span className="font-sans font-bold text-sm">{item.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {filteredCampaigns.length > 0 && (
            <div className="space-y-2">
              <p className="text-[9px] font-black uppercase tracking-widest text-ink/40 px-2">Broadcasts</p>
              <div className="space-y-1">
                {filteredCampaigns.map(camp => (
                  <button 
                    key={camp.id}
                    onClick={() => { navigate(`/campaigns/${camp.id}`); setIsOpen(false); }}
                    className="flex items-center justify-between w-full p-3 hover:bg-surface text-left transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <FileText size={16} className="text-ink/40" />
                      <span className="font-serif font-bold">{camp.name}</span>
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-ink/20">{camp.status}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {filteredContacts.length > 0 && (
            <div className="space-y-2">
              <p className="text-[9px] font-black uppercase tracking-widest text-ink/40 px-2">Contacts</p>
              <div className="space-y-1">
                {filteredContacts.map(contact => (
                  <button 
                    key={contact.id}
                    onClick={() => { navigate('/audiences'); setIsOpen(false); }}
                    className="flex items-center gap-3 p-3 hover:bg-surface w-full text-left transition-colors group"
                  >
                    <div className="w-8 h-8 bg-burgundy/5 border border-burgundy/10 flex items-center justify-center text-burgundy font-serif font-bold text-xs">
                      {contact.firstName[0]}{contact.lastName[0]}
                    </div>
                    <div>
                      <p className="font-sans font-bold text-sm">{contact.firstName} {contact.lastName}</p>
                      <p className="text-[10px] font-mono text-ink/40 uppercase">{contact.email}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {query && filteredNav.length === 0 && filteredCampaigns.length === 0 && filteredContacts.length === 0 && (
            <div className="py-12 text-center">
              <p className="font-editorial italic text-2xl text-ink/20">No results for "{query}"</p>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-border-hairline bg-surface flex justify-between items-center">
          <div className="flex gap-4">
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 border border-border-hairline bg-bg rounded text-[9px] font-black">↑↓</kbd>
              <span className="text-[9px] font-black uppercase tracking-widest text-ink/40">Navigate</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 border border-border-hairline bg-bg rounded text-[9px] font-black">ENTER</kbd>
              <span className="text-[9px] font-black uppercase tracking-widest text-ink/40">Select</span>
            </div>
          </div>
          <p className="text-[9px] font-black uppercase tracking-widest text-burgundy">SIGNAL Command Center</p>
        </div>
      </motion.div>
    </div>
  );
};

// --- Main App Layout ---

export default function App() {
  const location = useLocation();
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('signal-theme');
      if (saved === 'dark' || saved === 'light') return saved;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('signal-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  return (
    <div className="min-h-screen bg-bg selection:bg-burgundy selection:text-white transition-colors duration-300">
      <CommandPalette />
      <Masthead 
        onOpenGuide={() => setIsGuideOpen(true)} 
        theme={theme}
        toggleTheme={toggleTheme}
      />
      
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 py-8 sm:py-16">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/campaigns" element={<ProtectedRoute><Campaigns /></ProtectedRoute>} />
              <Route path="/campaigns/:id" element={<ProtectedRoute><CampaignDetail /></ProtectedRoute>} />
              <Route path="/audiences" element={<ProtectedRoute permission="contact:edit"><Audiences /></ProtectedRoute>} />
              <Route path="/automations" element={<ProtectedRoute permission="automation:edit"><Automations /></ProtectedRoute>} />
              <Route path="/media" element={<ProtectedRoute><MediaLibrary /></ProtectedRoute>} />
              <Route path="/commerce" element={<ProtectedRoute><Commerce /></ProtectedRoute>} />
              <Route path="/validation" element={<ProtectedRoute><EmailValidation /></ProtectedRoute>} />
              <Route path="/collaboration" element={<ProtectedRoute permission="team:manage"><Collaboration /></ProtectedRoute>} />
              <Route path="/integrations" element={<ProtectedRoute permission="integration:manage"><Integrations /></ProtectedRoute>} />
              <Route path="/templates" element={<ProtectedRoute><Templates /></ProtectedRoute>} />
              <Route path="/visual-studio" element={<ProtectedRoute><VisualStudio /></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute permission="report:view"><Reports /></ProtectedRoute>} />
              <Route path="/infrastructure" element={<ProtectedRoute permission="infrastructure:manage"><Infrastructure /></ProtectedRoute>} />
              <Route path="/data-layer" element={<ProtectedRoute permission="infrastructure:manage"><DataLayer /></ProtectedRoute>} />
              <Route path="/dispatch/:id" element={<DispatchView />} />
              <Route path="/preferences/:token" element={<PreferenceCenter />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </main>

      <UserGuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />

      <footer className="max-w-[1600px] mx-auto px-6 sm:px-10 py-12 border-t border-border-hairline flex flex-col sm:flex-row justify-between items-center gap-6 text-[10px] font-mono text-ink/40 uppercase tracking-widest text-center sm:text-left">
        <div>© 2026 SIGNAL BROADCAST SYSTEMS</div>
        <div className="flex flex-wrap justify-center sm:justify-end gap-4 sm:gap-8">
          <a href="#" className="hover:text-burgundy transition-colors">Terms of Service</a>
          <a href="#" className="hover:text-burgundy transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-burgundy transition-colors">System Status</a>
        </div>
      </footer>
    </div>
  );
}
