import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, useParams, Navigate, useSearchParams } from 'react-router-dom';
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
  CreditCard,
  Users2,
  Link2,
  Activity,
  Package,
  Lock,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from './services/api';
import { geminiService } from './services/geminiService';
import { User, Contact, Template, Campaign, DashboardStats, Segment, CustomFieldDefinition, Flow, Event } from './types';
import { format } from 'date-fns';
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

const Masthead = () => {
  const { user } = useAuth();
  const location = useLocation();
  
  return (
    <header className="bg-surface border-b-2 border-burgundy sticky top-0 z-50">
      <div className="max-w-[1600px] mx-auto px-10 h-20 flex items-center justify-between">
        <div className="flex items-center gap-12">
          <Link to="/" className="text-4xl font-serif font-black tracking-tighter text-ink">
            SIGNAL<span className="text-burgundy">.</span>
          </Link>
          
          <nav className="hidden lg:flex items-center gap-8">
            <Link to="/campaigns" className={cn("masthead-link", location.pathname.startsWith('/campaigns') && "active")}>Campaigns</Link>
            <Link to="/audiences" className={cn("masthead-link", location.pathname.startsWith('/audiences') && "active")}>Audiences</Link>
            <Link to="/automations" className={cn("masthead-link", location.pathname.startsWith('/automations') && "active")}>Automations</Link>
            <Link to="/commerce" className={cn("masthead-link", location.pathname.startsWith('/commerce') && "active")}>Commerce</Link>
            <Link to="/collaboration" className={cn("masthead-link", location.pathname.startsWith('/collaboration') && "active")}>Collaboration</Link>
            <Link to="/integrations" className={cn("masthead-link", location.pathname.startsWith('/integrations') && "active")}>Integrations</Link>
            <Link to="/reports" className={cn("masthead-link", location.pathname.startsWith('/reports') && "active")}>Reports</Link>
            <Link to="/templates" className={cn("masthead-link", location.pathname.startsWith('/templates') && "active")}>Templates</Link>
            <Link to="/infrastructure" className={cn("masthead-link", location.pathname.startsWith('/infrastructure') && "active")}>Infrastructure</Link>
          </nav>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-surface border border-border-hairline rounded text-[10px] font-mono text-ink/40">
            <Search size={12} />
            <span>CMD + K TO SEARCH</span>
          </div>
          
          <div className="flex items-center gap-4 border-l border-border-hairline pl-6">
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
    </header>
  );
};

const SectionHeader = ({ title, subtitle, action }: { title: string, subtitle?: string, action?: React.ReactNode }) => (
  <div className="flex justify-between items-end border-b border-border-hairline pb-4 mb-8">
    <div>
      <h1 className="text-5xl font-serif font-bold text-ink mb-2">{title}</h1>
      {subtitle && <p className="text-lg font-editorial italic text-ink/60">{subtitle}</p>}
    </div>
    {action}
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
  const { hasPermission } = useAuth();
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
  }, []);

  const refreshData = () => {
    api.getTeam().then(setTeam);
    api.getBrands().then(setBrands);
    api.getApprovals().then(setApprovals);
    api.getRoles().then(setRoles);
  };

  const handleApproval = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    if (!hasPermission('campaign:send')) return;
    await api.updateApprovalStatus(id, status);
    api.getApprovals().then(setApprovals);
  };

  const handleAddRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasPermission('team:manage')) return;
    await api.addRole(newRole);
    api.getRoles().then(setRoles);
    setIsAddingRole(false);
    setNewRole({ name: '', permissions: [] });
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasPermission('team:manage')) return;
    await api.inviteTeamMember(inviteData);
    refreshData();
    setIsInviting(false);
    setInviteData({ email: '', name: '', role: 'VIEWER' });
  };

  const handleUpdateRole = async (userId: string, role: string) => {
    if (!hasPermission('team:manage')) return;
    await api.updateTeamMember(userId, { role });
    refreshData();
  };

  const handleDeleteMember = async (userId: string) => {
    if (!hasPermission('team:manage')) return;
    if (window.confirm("Are you sure you want to remove this team member?")) {
      const res = await api.deleteTeamMember(userId);
      if (res.success) {
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
    <div className="space-y-16">
      <SectionHeader 
        title="Collaboration & Enterprise" 
        subtitle="Manage your editorial team and multi-brand infrastructure."
      />

      <div className="grid grid-cols-12 gap-12">
        <div className="col-span-12 lg:col-span-7 space-y-12">
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

  useEffect(() => {
    api.getIntegrations().then(setIntegrations);
    api.getWebhooks().then(setWebhooks);
  }, []);

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
      />

      <div className="space-y-8">
        <h3 className="text-2xl font-serif font-bold text-ink">Integrations Marketplace</h3>
        <div className="grid grid-cols-12 gap-6">
          {marketplace.map(item => (
            <div key={item.id} className="col-span-12 md:col-span-6 lg:col-span-3 bg-surface border border-border-hairline p-8 space-y-6 hover:border-burgundy transition-colors group">
              <div className="w-12 h-12 bg-bg border border-border-hairline flex items-center justify-center text-ink/60 group-hover:text-burgundy transition-colors">
                {item.icon}
              </div>
              <div>
                <p className="text-sm font-black uppercase tracking-widest text-ink">{item.name}</p>
                <p className="text-[11px] font-editorial italic text-ink/60 mt-1">{item.desc}</p>
              </div>
              <button className={cn(
                "w-full py-2 text-[10px] font-black uppercase tracking-widest transition-all",
                item.status === 'Connected' ? "bg-status-success/10 text-status-success border border-status-success/20" : "border border-border-hairline text-ink/60 hover:bg-bg"
              )}>
                {item.status}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-12">
        <div className="col-span-12 lg:col-span-7 space-y-8">
          <div className="flex justify-between items-center">
            <h3 className="text-2xl font-serif font-bold text-ink">Webhooks</h3>
            <button className="btn-primary py-2 px-4 text-[10px]">Add Webhook</button>
          </div>
          <div className="border border-border-hairline divide-y divide-border-hairline">
            {webhooks.length === 0 ? (
              <div className="p-12 text-center font-editorial italic text-ink/40">No webhooks configured.</div>
            ) : (
              webhooks.map(hook => (
                <div key={hook.id} className="p-6 flex items-center justify-between hover:bg-surface transition-colors">
                  <div className="space-y-1">
                    <p className="text-xs font-mono font-bold text-ink">{hook.url}</p>
                    <p className="text-[9px] font-mono text-ink/40 uppercase">Events: {hook.events}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="w-2 h-2 bg-status-success rounded-full"></span>
                    <button className="text-ink/40 hover:text-burgundy transition-colors"><Trash2 size={16} /></button>
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

const Home = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentCampaigns, setRecentCampaigns] = useState<Campaign[]>([]);
  const [scheduledCampaigns, setScheduledCampaigns] = useState<Campaign[]>([]);

  useEffect(() => {
    api.getSummary().then(setStats);
    api.getCampaigns().then(res => {
      setRecentCampaigns(res.filter(c => c.status === 'SENT').slice(0, 3));
      setScheduledCampaigns(res.filter(c => c.status === 'SCHEDULED').slice(0, 3));
    });
  }, []);

  if (!stats) return <div className="p-20 text-center font-editorial italic text-3xl">Loading dispatch...</div>;

  const leadCampaign = recentCampaigns[0];

  return (
    <div className="space-y-16">
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
        <div className="col-span-12 lg:col-span-8 space-y-8 pr-8 border-r border-border-hairline">
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
    type: 'REGULAR' as 'REGULAR' | 'AB',
    testPercentage: 20,
    testDuration: 4,
    winnerCriteria: 'OPEN_RATE' as 'OPEN_RATE' | 'CLICK_RATE',
    scheduledAt: '',
    timezone: 'UTC',
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
  const [approvals, setApprovals] = useState<any[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [previewCampaign, setPreviewCampaign] = useState<Campaign | null>(null);
  const [previewContact, setPreviewContact] = useState<Contact | null>(null);
  const [abResults, setAbResults] = useState<any>(null);
  const [selectedAbCampaign, setSelectedAbCampaign] = useState<Campaign | null>(null);
  const [personalizedContent, setPersonalizedContent] = useState<string>('');
  const [contacts, setContacts] = useState<Contact[]>([]);

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
    return matchesStatus && matchesType;
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
      type: 'REGULAR',
      testPercentage: 20,
      testDuration: 4,
      winnerCriteria: 'OPEN_RATE',
      scheduledAt: '',
      timezone: 'UTC',
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
                </div>
              </div>
              <button onClick={() => setIsCreating(false)} className="text-ink/40 hover:text-burgundy">✕</button>
            </div>

            <form onSubmit={handleCreate} className="newspaper-grid">
              <div className="col-span-12 lg:col-span-7 space-y-8">
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
                        <button 
                          type="button"
                          onClick={() => setNewCampaign({...newCampaign, contentB: newCampaign.content})}
                          className="text-[10px] font-black uppercase tracking-widest text-ink/40 hover:text-burgundy"
                        >
                          Copy from Variation A
                        </button>
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
                            selected={newCampaign.scheduledAt ? new Date(newCampaign.scheduledAt) : null}
                            onChange={(date) => setNewCampaign({...newCampaign, scheduledAt: date ? date.toISOString() : ''})}
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
                                setNewCampaign({ ...newCampaign, scheduledAt: date.toISOString() });
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
              {['ALL', 'DRAFT', 'IN_REVIEW', 'SCHEDULED', 'SENT'].map(s => (
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
                {camp.type === 'AB' && (
                  <span className="px-1.5 py-0.5 bg-burgundy/10 text-burgundy text-[8px] font-black uppercase tracking-widest border border-burgundy/20">A/B</span>
                )}
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
              <span className={cn(
                "px-2 py-0.5 text-[9px] font-black uppercase tracking-widest border",
                camp.status === 'SENT' ? "border-status-success text-status-success" :
                camp.status === 'SCHEDULED' ? "border-status-scheduled text-status-scheduled" :
                camp.status === 'IN_REVIEW' ? "border-burgundy text-burgundy" :
                "border-status-draft text-status-draft"
              )}>
                {camp.status.replace('_', ' ')}
              </span>
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
                  <div className="space-y-4 p-6 border border-border-hairline bg-surface">
                    <p className="font-sans font-black uppercase tracking-widest text-[10px] text-burgundy">Variation A</p>
                    <p className="font-serif text-lg font-bold">"{selectedAbCampaign.subject}"</p>
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border-hairline">
                      <div>
                        <p className="metric-label">Open Rate</p>
                        <p className="text-2xl font-serif font-bold">{abResults.variationA.rate}%</p>
                      </div>
                      <div>
                        <p className="metric-label">Clicks</p>
                        <p className="text-2xl font-serif font-bold">{abResults.variationA.clicks}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handlePickWinner(selectedAbCampaign.id, 'A')}
                      className="w-full mt-4 py-2 border border-burgundy text-burgundy font-sans font-black uppercase tracking-widest text-[10px] hover:bg-burgundy hover:text-white transition-all"
                    >
                      Select as Winner
                    </button>
                  </div>
                  <div className="space-y-4 p-6 border border-burgundy bg-burgundy/5">
                    <p className="font-sans font-black uppercase tracking-widest text-[10px] text-burgundy">Variation B</p>
                    <p className="font-serif text-lg font-bold">"{selectedAbCampaign.subjectB}"</p>
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-burgundy/20">
                      <div>
                        <p className="metric-label">Open Rate</p>
                        <p className="text-2xl font-serif font-bold">{abResults.variationB.rate}%</p>
                      </div>
                      <div>
                        <p className="metric-label">Clicks</p>
                        <p className="text-2xl font-serif font-bold">{abResults.variationB.clicks}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handlePickWinner(selectedAbCampaign.id, 'B')}
                      className="w-full mt-4 py-2 bg-burgundy text-white font-sans font-black uppercase tracking-widest text-[10px] hover:bg-burgundy/90 transition-all"
                    >
                      Select as Winner
                    </button>
                  </div>
                </div>
                <div className="p-4 bg-ink text-white text-center">
                  <p className="text-[10px] font-mono uppercase tracking-widest">
                    AI Recommendation: <span className="text-burgundy font-black">Variation B</span> is performing 15% better in open rates.
                  </p>
                </div>
              </div>
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      api.getCampaignAnalytics(id).then(res => {
        setAnalytics(res);
        setLoading(false);
      });
    }
  }, [id]);

  if (loading) return <div className="p-20 text-center font-editorial italic text-3xl">Loading analytics...</div>;
  if (!analytics) return <div className="p-20 text-center font-editorial italic text-3xl">Campaign not found.</div>;

  const { campaign, stats, timeSeries, deviceData } = analytics;

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
        <div className="text-right space-y-1">
          <p className="metric-label">Sent on</p>
          <p className="font-mono text-sm uppercase">{campaign.sentAt ? format(new Date(campaign.sentAt), 'MMMM d, yyyy HH:mm') : 'Not sent yet'}</p>
        </div>
      </div>

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
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'PERFORMANCE' | 'DELIVERABILITY' | 'FUNNEL' | 'COHORTS' | 'ATTRIBUTION' | 'GAP_ANALYSIS'>('PERFORMANCE');
  const [funnelMode, setFunnelMode] = useState<'VISUAL' | 'BUILDER'>('VISUAL');
  const [deliverability, setDeliverability] = useState<any>(null);
  const [funnel, setFunnel] = useState<any[]>([]);
  const [cohorts, setCohorts] = useState<any[]>([]);
  const [attribution, setAttribution] = useState<any[]>([]);
  const [attributionModel, setAttributionModel] = useState<'LAST_CLICK' | 'FIRST_CLICK' | 'LINEAR'>('LAST_CLICK');

  useEffect(() => {
    const fetchData = async () => {
      const [camps, deliv, fun, coh, attr] = await Promise.all([
        api.getCampaigns(),
        api.getDeliverabilityAnalytics(),
        api.getFunnelAnalytics(),
        api.getCohortAnalytics(),
        api.getRevenueAttribution(attributionModel)
      ]);
      setCampaigns(camps.filter(c => c.status === 'SENT'));
      setDeliverability(deliv);
      setFunnel(fun);
      setCohorts(coh);
      setAttribution(attr);
      setLoading(false);
    };
    fetchData();
  }, [attributionModel]);

  if (loading) return <div className="p-20 text-center font-editorial italic text-3xl">Loading Intelligence Hub...</div>;

  return (
    <div className="space-y-12">
      <SectionHeader 
        title="Intelligence Hub" 
        subtitle="Aggregate insights and performance data across your editorial network."
      />

      <div className="flex gap-8 border-b border-ink pb-2">
        {[
          { id: 'PERFORMANCE', label: 'Broadcast Performance' },
          { id: 'DELIVERABILITY', label: 'Deliverability' },
          { id: 'FUNNEL', label: 'Funnel Analytics' },
          { id: 'COHORTS', label: 'Cohort Analysis' },
          { id: 'ATTRIBUTION', label: 'Revenue Attribution' },
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

      {activeTab === 'GAP_ANALYSIS' && (
        <div className="space-y-12 animate-in fade-in duration-700">
          <div className="flex justify-between items-end border-b border-ink pb-6">
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-ink/40">Strategic Assessment</p>
              <h2 className="text-4xl font-serif font-bold">Enterprise GAP Analysis</h2>
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
                <div className="absolute inset-0 border-4 border-burgundy rounded-full" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 82%, 0 82%)' }} />
                <span className="text-xs font-bold">82%</span>
              </div>
            </div>
          </div>

          <div className="newspaper-grid">
            <div className="col-span-12 lg:col-span-8 space-y-8">
              <div className="bg-surface border border-border-hairline p-8 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-burgundy text-white px-4 py-1 text-[8px] font-black uppercase tracking-widest">Confidential</div>
                <h3 className="font-sans font-black uppercase tracking-widest text-xs border-b border-ink pb-4 mb-6">Executive Summary</h3>
                <p className="font-serif text-lg leading-relaxed text-ink/80 italic">
                  "Platformun editoryal zekası ve veri altyapısı kurumsal standartlara yaklaştı. RBAC ve GDPR uyumluluk katmanları başarıyla devreye alındı. %100 hedefine ulaşmak için SSO entegrasyonu ve SOC2 sertifikasyon süreçleri kritik öneme sahiptir."
                </p>
              </div>

              <div className="bg-surface border border-border-hairline p-8 shadow-sm">
                <h3 className="font-sans font-black uppercase tracking-widest text-xs border-b border-ink pb-4 mb-6">Gap Matrix</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-bg/50">
                        <th className="p-4 metric-label border border-border-hairline">Kategori</th>
                        <th className="p-4 metric-label border border-border-hairline">Mevcut Durum</th>
                        <th className="p-4 metric-label border border-border-hairline">Enterprise Hedef</th>
                        <th className="p-4 metric-label border border-border-hairline">Öncelik</th>
                      </tr>
                    </thead>
                    <tbody className="text-xs font-mono">
                      <tr>
                        <td className="p-4 border border-border-hairline font-bold">Güvenlik</td>
                        <td className="p-4 border border-border-hairline text-status-success font-bold">RBAC Aktif</td>
                        <td className="p-4 border border-border-hairline">SSO, MFA Entegrasyonu</td>
                        <td className="p-4 border border-border-hairline text-burgundy font-bold">KRİTİK</td>
                      </tr>
                      <tr>
                        <td className="p-4 border border-border-hairline font-bold">Veri Altyapısı</td>
                        <td className="p-4 border border-border-hairline text-status-success font-bold">Prisma/SQLite</td>
                        <td className="p-4 border border-border-hairline">PostgreSQL, Redis</td>
                        <td className="p-4 border border-border-hairline text-status-warning font-bold">YÜKSEK</td>
                      </tr>
                      <tr>
                        <td className="p-4 border border-border-hairline font-bold">Uyumluluk</td>
                        <td className="p-4 border border-border-hairline text-status-success font-bold">GDPR/KVKK Hazır</td>
                        <td className="p-4 border border-border-hairline">SOC2 Tip II</td>
                        <td className="p-4 border border-border-hairline text-status-warning font-bold">YÜKSEK</td>
                      </tr>
                      <tr>
                        <td className="p-4 border border-border-hairline font-bold">Entegrasyon</td>
                        <td className="p-4 border border-border-hairline text-status-success font-bold">Webhooks Aktif</td>
                        <td className="p-4 border border-border-hairline">Public API Gateway</td>
                        <td className="p-4 border border-border-hairline text-ink/40 font-bold">ORTA</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="col-span-12 lg:col-span-4 space-y-6">
              <div className="bg-ink text-white p-8 space-y-6">
                <h3 className="font-serif text-2xl font-bold">Yol Haritası (Q2-Q4)</h3>
                <div className="space-y-6">
                  <div className="relative pl-6 border-l border-white/20">
                    <div className="absolute left-[-5px] top-0 w-2 h-2 rounded-full bg-status-success" />
                    <p className="text-[10px] font-black uppercase text-white/40">Faz 1: Temel Altyapı (TAMAMLANDI)</p>
                    <p className="text-sm font-bold">RBAC, GDPR uyumluluk araçları ve Webhook altyapısı devreye alındı.</p>
                  </div>
                  <div className="relative pl-6 border-l border-white/20">
                    <div className="absolute left-[-5px] top-0 w-2 h-2 rounded-full bg-burgundy" />
                    <p className="text-[10px] font-black uppercase text-white/40">Faz 2: Enterprise Güvenlik</p>
                    <p className="text-sm font-bold">Auth0/Okta Entegrasyonu ve SSO desteğinin sağlanması.</p>
                  </div>
                  <div className="relative pl-6 border-l border-white/20">
                    <div className="absolute left-[-5px] top-0 w-2 h-2 rounded-full bg-white/20" />
                    <p className="text-[10px] font-black uppercase text-white/40">Faz 3: Sertifikasyon ve Ölçeklenme</p>
                    <p className="text-sm font-bold">SOC2 Tip II denetimi ve Public API Gateway yayını.</p>
                  </div>
                </div>
              </div>

              <div className="bg-burgundy text-white p-8">
                <div className="flex items-center gap-3 mb-4">
                  <Shield className="w-6 h-6" />
                  <h4 className="font-bold uppercase tracking-tighter">AI Compliance Note</h4>
                </div>
                <p className="text-xs font-editorial italic leading-relaxed opacity-90">
                  "Enterprise müşteriler için Gemini API kullanımında 'Data Opt-out' politikası uygulanmalı ve modellerin müşteri verisiyle eğitilmediği garanti edilmelidir."
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
  const [newSegment, setNewSegment] = useState({ name: '', rules: '[]' });
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);
  const [preferenceContact, setPreferenceContact] = useState<any>(null);
  const [availableLists, setAvailableLists] = useState<any[]>([]);
  const [selectedLists, setSelectedLists] = useState<string[]>([]);

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
    api.getSegments().then(setSegments);
  }, []);

  const handleCreateSegment = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.addSegment(newSegment);
    api.getSegments().then(setSegments);
    setIsAddingSegment(false);
    setNewSegment({ name: '', rules: '[]' });
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
        action={
          <button onClick={() => setIsAdding(true)} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Add Contact
          </button>
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

              <form onSubmit={handleCreateSegment} className="space-y-4">
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
                  <p className="text-[10px] font-black uppercase tracking-widest text-ink/40">Criteria Rules</p>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 p-3 bg-surface border border-border-hairline">
                      <div className="flex-1">
                        <p className="text-[10px] font-black uppercase">Engagement Score</p>
                        <p className="text-xs font-serif italic">is greater than 80</p>
                      </div>
                      <Filter size={14} className="text-burgundy" />
                    </div>
                    
                    <div className="flex items-center gap-2 p-3 bg-surface border border-border-hairline">
                      <div className="flex-1">
                        <p className="text-[10px] font-black uppercase">Last Interaction</p>
                        <p className="text-xs font-serif italic">within last 30 days</p>
                      </div>
                      <Clock size={14} className="text-burgundy" />
                    </div>
                  </div>

                  <div className="p-4 border border-dashed border-border-hairline text-center">
                    <button type="button" className="text-[10px] font-black uppercase text-ink/40 hover:text-burgundy flex items-center gap-1 mx-auto">
                      <Plus size={12} /> Add Rule
                    </button>
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
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Filter size={10} />
                  </div>
                </button>
              ))}
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

        <div className="col-span-12 lg:col-span-9">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-ink">
                <th className="px-4 py-3 metric-label">Contact</th>
                <th className="px-4 py-3 metric-label">Signal Quality</th>
                <th className="px-4 py-3 metric-label">Status</th>
                <th className="px-4 py-3 metric-label">Engagement</th>
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

  useEffect(() => {
    api.getSegments().then(setSegments);
    api.getCustomFields().then(setCustomFields);
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

  return (
    <div className="space-y-16">
      <SectionHeader 
        title="Data Layer" 
        subtitle="Manage dynamic segments, custom fields, and personalization logic."
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

          {/* AI Predictive Segment Mockup */}
          <div className="bg-ink text-white p-8 space-y-4">
            <div className="flex items-center gap-2 text-burgundy">
              <Sparkles size={16} />
              <span className="text-[10px] font-black uppercase tracking-widest">AI Predictive Intelligence</span>
            </div>
            <h4 className="font-serif text-2xl font-bold">Likely to Churn (Next 30 Days)</h4>
            <p className="text-sm text-white/60 leading-relaxed">
              Our AI model has identified 124 subscribers who show behavioral patterns consistent with high churn risk.
            </p>
            <button className="text-[10px] font-black uppercase tracking-widest border border-white/20 px-4 py-2 hover:bg-white hover:text-ink transition-all">
              Activate AI Segment
            </button>
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
  const [isMfaLoading, setIsMfaLoading] = useState(false);
  const [isAddingKey, setIsAddingKey] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');

  useEffect(() => {
    api.getConsentLogs().then(setConsentLogs);
    api.getDataRequests().then(setDataRequests);
    api.getAuditLogs().then(setAuditLogs);
    api.getApiKeys().then(setApiKeys);
  }, []);

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
                  <button 
                    onClick={handleSSOConnect}
                    className="w-full py-3 bg-burgundy hover:bg-burgundy/90 text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                  >
                    <ExternalLink size={14} />
                    Link Enterprise ID
                  </button>
                )}
              </div>
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
              <button className="w-full py-2 border border-white/20 text-[9px] font-black uppercase tracking-widest hover:bg-white/10 transition-colors">
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
  return (
    <div className={cn(
      "bg-bg border p-4 shadow-sm min-w-[180px] transition-all",
      selected ? "border-burgundy ring-1 ring-burgundy/20" : "border-ink/10"
    )}>
      <Handle type="target" position={Position.Top} className="w-2 h-2 bg-burgundy border-none" />
      <div className="flex items-center gap-3">
        <div className={cn("p-2", data.color || "bg-ink/5 text-ink")}>
          <Icon size={16} />
        </div>
        <div>
          <p className="text-[8px] font-black uppercase tracking-widest text-ink/40">{data.type || 'Node'}</p>
          <p className="text-xs font-bold font-serif">{data.label || 'Untitled'}</p>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="w-2 h-2 bg-burgundy border-none" />
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

  useEffect(() => {
    api.getFlows().then(setFlows);
    api.getEvents().then(setEvents);
    api.getWorkflowTemplates().then(setTemplates);
  }, []);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

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
      setNodes(flow.nodes ? JSON.parse(flow.nodes) : []);
      setEdges(flow.edges ? JSON.parse(flow.edges) : []);
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
      data: { label, type, icon: iconName, color },
    };
    setNodes((nds) => nds.concat(newNode));
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
            <button onClick={saveFlow} className="btn-secondary">Save Changes</button>
            <button className="btn-primary">Activate Flow</button>
          </div>
        </div>
        
        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={automationNodeTypes}
            fitView
          >
            <Background color="#D4CFC6" gap={20} />
            <Controls />
            <MiniMap nodeColor={(n) => n.data?.color === 'bg-burgundy/10' ? '#8B1A1A' : '#1A1814'} />
            <Panel position="top-right" className="bg-bg border border-ink p-4 shadow-xl space-y-4 w-64">
              <p className="text-[10px] font-black uppercase tracking-widest border-b border-border-hairline pb-2">Workflow Components</p>
              
              <div className="space-y-4">
                <div>
                  <p className="text-[8px] font-black uppercase text-ink/40 mb-2">Triggers</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => addNode('Trigger', 'On Signup', 'Zap', 'bg-burgundy/10 text-burgundy')} className="p-2 border border-border-hairline hover:border-burgundy text-[9px] font-bold uppercase">Signup</button>
                    <button onClick={() => addNode('Trigger', 'Webhook', 'Globe', 'bg-burgundy/10 text-burgundy')} className="p-2 border border-border-hairline hover:border-burgundy text-[9px] font-bold uppercase">Webhook</button>
                    <button onClick={() => addNode('Trigger', 'Custom Event', 'Sparkles', 'bg-burgundy/10 text-burgundy')} className="p-2 border border-border-hairline hover:border-burgundy text-[9px] font-bold uppercase">Event</button>
                  </div>
                </div>

                <div>
                  <p className="text-[8px] font-black uppercase text-ink/40 mb-2">Actions</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => addNode('Action', 'Send Email', 'Mail', 'bg-ink/5 text-ink')} className="p-2 border border-border-hairline hover:border-burgundy text-[9px] font-bold uppercase">Email</button>
                    <button onClick={() => addNode('Action', 'Add Tag', 'Tag', 'bg-ink/5 text-ink')} className="p-2 border border-border-hairline hover:border-burgundy text-[9px] font-bold uppercase">Tag</button>
                    <button onClick={() => addNode('Action', 'Wait', 'Clock', 'bg-ink/5 text-ink')} className="p-2 border border-border-hairline hover:border-burgundy text-[9px] font-bold uppercase">Delay</button>
                  </div>
                </div>

                <div>
                  <p className="text-[8px] font-black uppercase text-ink/40 mb-2">Logic</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => addNode('Logic', 'If/Else', 'Split', 'bg-brass/10 text-brass')} className="p-2 border border-border-hairline hover:border-burgundy text-[9px] font-bold uppercase">Split</button>
                  </div>
                </div>
              </div>
            </Panel>
          </ReactFlow>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-16">
      <SectionHeader 
        title="Automations" 
        subtitle="Design visual workflows and track real-time subscriber events."
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

// --- Main App Layout ---

export default function App() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-bg selection:bg-burgundy selection:text-white">
      <Masthead />
      
      <main className="max-w-[1600px] mx-auto px-10 py-16">
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
              <Route path="/commerce" element={<ProtectedRoute><Commerce /></ProtectedRoute>} />
              <Route path="/collaboration" element={<ProtectedRoute permission="team:manage"><Collaboration /></ProtectedRoute>} />
              <Route path="/integrations" element={<ProtectedRoute permission="integration:manage"><Integrations /></ProtectedRoute>} />
              <Route path="/templates" element={<ProtectedRoute><Templates /></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute permission="report:view"><Reports /></ProtectedRoute>} />
              <Route path="/infrastructure" element={<ProtectedRoute permission="infrastructure:manage"><Infrastructure /></ProtectedRoute>} />
              <Route path="/data-layer" element={<ProtectedRoute permission="infrastructure:manage"><DataLayer /></ProtectedRoute>} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="max-w-[1600px] mx-auto px-10 py-12 border-t border-border-hairline flex justify-between items-center text-[10px] font-mono text-ink/40 uppercase tracking-widest">
        <div>© 2026 SIGNAL BROADCAST SYSTEMS</div>
        <div className="flex gap-8">
          <a href="#" className="hover:text-burgundy transition-colors">Terms of Service</a>
          <a href="#" className="hover:text-burgundy transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-burgundy transition-colors">System Status</a>
        </div>
      </footer>
    </div>
  );
}
