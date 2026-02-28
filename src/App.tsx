import React, { useState, useEffect } from 'react';
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
  Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from './services/api';
import { geminiService } from './services/geminiService';
import { User, Contact, Template, Campaign, DashboardStats, Segment, CustomFieldDefinition } from './types';
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
  Area
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

// --- Utils ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Components ---

const Masthead = ({ user }: { user: User | null }) => {
  const location = useLocation();
  
  return (
    <header className="bg-bg border-b-2 border-burgundy sticky top-0 z-50">
      <div className="max-w-[1600px] mx-auto px-10 h-20 flex items-center justify-between">
        <div className="flex items-center gap-12">
          <Link to="/" className="text-4xl font-serif font-black tracking-tighter text-ink">
            SIGNAL<span className="text-burgundy">.</span>
          </Link>
          
          <nav className="hidden lg:flex items-center gap-8">
            <Link to="/campaigns" className={cn("masthead-link", location.pathname.startsWith('/campaigns') && "active")}>Campaigns</Link>
            <Link to="/audiences" className={cn("masthead-link", location.pathname.startsWith('/audiences') && "active")}>Audiences</Link>
            <Link to="/data-layer" className={cn("masthead-link", location.pathname.startsWith('/data-layer') && "active")}>Data Layer</Link>
            <Link to="/automations" className={cn("masthead-link", location.pathname.startsWith('/automations') && "active")}>Automations</Link>
            <Link to="/reports" className={cn("masthead-link", location.pathname.startsWith('/reports') && "active")}>Reports</Link>
            <Link to="/templates" className={cn("masthead-link", location.pathname.startsWith('/templates') && "active")}>Templates</Link>
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
                <p className="text-[9px] font-mono text-ink/40 uppercase">{user?.organization?.name || 'SIGNAL'}</p>
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
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [previewCampaign, setPreviewCampaign] = useState<Campaign | null>(null);
  const [previewContact, setPreviewContact] = useState<Contact | null>(null);
  const [personalizedContent, setPersonalizedContent] = useState<string>('');
  const [contacts, setContacts] = useState<Contact[]>([]);

  useEffect(() => {
    api.getCampaigns().then(setCampaigns);
    api.getContacts().then(setContacts);
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

  const generateAI = async () => {
    if (!aiTopic) return;
    setIsGenerating(true);
    const suggestions = await geminiService.generateSubjectLines(aiTopic);
    setAiSuggestions(suggestions);
    setIsGenerating(false);
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
                        <label className="metric-label">Preview Text</label>
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

                    <div className="space-y-2">
                      <label className="metric-label">Editorial Content</label>
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
                        <label className="metric-label flex items-center gap-2">
                          <Clock size={12} /> Date & Time
                        </label>
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
              {['ALL', 'DRAFT', 'SCHEDULED', 'SENT'].map(s => (
                <button 
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={cn(
                    "px-3 py-1 text-[9px] font-black uppercase tracking-widest border transition-all",
                    statusFilter === s ? "bg-burgundy text-white border-burgundy" : "border-border-hairline text-ink/40 hover:border-burgundy hover:text-burgundy"
                  )}
                >
                  {s}
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
                "border-status-draft text-status-draft"
              )}>
                {camp.status}
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
                  onClick={() => handleSend(camp.id)}
                  className="text-burgundy hover:scale-110 transition-transform"
                  title="Send Now"
                >
                  <Send size={18} />
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

const Reports = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getCampaigns().then(res => {
      setCampaigns(res.filter(c => c.status === 'SENT'));
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="p-20 text-center font-editorial italic text-3xl">Loading Intelligence Hub...</div>;

  return (
    <div className="space-y-12">
      <SectionHeader 
        title="Intelligence Hub" 
        subtitle="Aggregate insights and performance data across your editorial network."
      />

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
  const [isAdding, setIsAdding] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

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
  }, []);

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
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

      <div className="newspaper-grid">
        <div className="col-span-12 lg:col-span-3 space-y-8 border-r border-border-hairline pr-8">
          <div className="space-y-4">
            <h3 className="font-sans font-black uppercase tracking-widest text-xs border-b border-ink pb-2">Segments</h3>
            <div className="space-y-2">
              {['All Contacts', 'Highly Engaged', 'Recent Signups', 'Inactive (90d)'].map((s, i) => (
                <button key={s} className={cn(
                  "w-full text-left px-4 py-2 text-sm font-medium transition-colors",
                  i === 0 ? "bg-burgundy text-white" : "hover:bg-surface"
                )}>
                  {s}
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
                    {format(new Date(contact.createdAt), 'MMM d, yyyy')}
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

// --- Main App Layout ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const location = useLocation();

  useEffect(() => {
    api.getMe().then(setUser);
  }, []);

  return (
    <div className="min-h-screen bg-bg selection:bg-burgundy selection:text-white">
      <Masthead user={user} />
      
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
              <Route path="/campaigns" element={<Campaigns />} />
              <Route path="/campaigns/:id" element={<CampaignDetail />} />
              <Route path="/audiences" element={<Audiences />} />
              <Route path="/data-layer" element={<DataLayer />} />
              <Route path="/templates" element={<Templates />} />
              <Route path="/automations" element={<div className="p-20 text-center font-editorial italic text-4xl text-ink/20">Automation Studio coming soon.</div>} />
              <Route path="/reports" element={<Reports />} />
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
