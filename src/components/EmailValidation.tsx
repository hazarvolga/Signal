import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Upload, 
  Search, 
  History, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  FileText,
  Download,
  Loader2,
  ArrowRight
} from 'lucide-react';
import { api } from '../services/api';
import { ValidationLog, BulkValidationJob } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';

export const EmailValidation: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [singleResult, setSingleResult] = useState<any>(null);
  const [logs, setLogs] = useState<ValidationLog[]>([]);
  const [bulkJobs, setBulkJobs] = useState<BulkValidationJob[]>([]);
  const [activeTab, setActiveTab] = useState<'single' | 'bulk' | 'history'>('single');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const data = await api.getValidationLogs();
      setLogs(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSingleValidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsValidating(true);
    try {
      const result = await api.validateEmail(email);
      setSingleResult(result);
      fetchLogs();
    } catch (e) {
      console.error(e);
    } finally {
      setIsValidating(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { jobId } = await api.validateBulk(file);
      // In a real app, we'd poll for status or use websockets
      alert(`Bulk job ${jobId} started! Check history for progress.`);
      setActiveTab('history');
    } catch (e) {
      console.error(e);
    } finally {
      setUploading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'valid': return <CheckCircle2 className="text-status-success" size={20} />;
      case 'invalid': return <XCircle className="text-burgundy" size={20} />;
      case 'risky': return <AlertCircle className="text-status-warning" size={20} />;
      default: return <AlertCircle className="text-ink/40" size={20} />;
    }
  };

  return (
    <div className="space-y-12 max-w-5xl mx-auto py-12 px-6">
      <header className="space-y-4">
        <div className="flex items-center gap-3 text-burgundy">
          <ShieldCheck size={32} />
          <h1 className="text-4xl font-serif font-bold tracking-tight">Email Intelligence</h1>
        </div>
        <p className="text-ink/60 font-serif italic text-lg max-w-2xl">
          "A production-grade verification engine designed for high-deliverability editorial dispatches. 
          Verify syntax, DNS, and SMTP handshakes in real-time."
        </p>
      </header>

      <div className="flex gap-8 border-b border-border-hairline">
        {[
          { id: 'single', label: 'Single Verify', icon: Search },
          { id: 'bulk', label: 'Bulk Processing', icon: Upload },
          { id: 'history', label: 'Audit Logs', icon: History },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 pb-4 text-xs font-black uppercase tracking-widest transition-all relative ${
              activeTab === tab.id ? 'text-burgundy' : 'text-ink/40 hover:text-ink'
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
            {activeTab === tab.id && (
              <motion.div 
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-burgundy"
              />
            )}
          </button>
        ))}
      </div>

      <main className="min-h-[400px]">
        <AnimatePresence mode="wait">
          {activeTab === 'single' && (
            <motion.div
              key="single"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <form onSubmit={handleSingleValidate} className="flex gap-4">
                <input
                  type="email"
                  placeholder="Enter email to verify..."
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="flex-1 bg-surface/30 border border-border-hairline px-6 py-4 font-serif text-xl outline-none focus:border-burgundy transition-colors"
                  required
                />
                <button
                  type="submit"
                  disabled={isValidating}
                  className="bg-ink text-white px-8 py-4 font-black uppercase tracking-widest text-xs flex items-center gap-2 hover:bg-burgundy transition-colors disabled:opacity-50"
                >
                  {isValidating ? <Loader2 className="animate-spin" size={16} /> : <ShieldCheck size={16} />}
                  Verify
                </button>
              </form>

              {singleResult && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="col-span-1 md:col-span-1 bg-white border border-border-hairline p-8 space-y-6">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-ink/40">Quality Score</p>
                      <p className="text-6xl font-serif font-bold">{singleResult.score}</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-black uppercase tracking-widest">Status</span>
                        <span className={`text-xs font-black uppercase tracking-widest ${
                          singleResult.status === 'valid' ? 'text-status-success' : 
                          singleResult.status === 'risky' ? 'text-status-warning' : 'text-burgundy'
                        }`}>
                          {singleResult.status}
                        </span>
                      </div>
                      <div className="w-full h-1 bg-surface">
                        <div 
                          className={`h-full transition-all duration-1000 ${
                            singleResult.status === 'valid' ? 'bg-status-success' : 
                            singleResult.status === 'risky' ? 'bg-status-warning' : 'bg-burgundy'
                          }`}
                          style={{ width: `${singleResult.score}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="col-span-1 md:col-span-2 bg-surface/30 border border-border-hairline p-8">
                    <h3 className="text-xs font-black uppercase tracking-widest mb-6 border-b border-border-hairline pb-2">Technical Breakdown</h3>
                    <div className="grid grid-cols-2 gap-y-4 gap-x-12">
                      {[
                        { label: 'Syntax Check', key: 'syntax' },
                        { label: 'DNS Records', key: 'dns' },
                        { label: 'SMTP Handshake', key: 'smtp' },
                        { label: 'Disposable Detection', key: 'disposable', invert: true },
                        { label: 'Role-Based Detection', key: 'roleBased', invert: true },
                        { label: 'Catch-All Detection', key: 'catchAll', invert: true },
                      ].map(item => {
                        const val = singleResult.details[item.key];
                        const success = item.invert ? !val : val;
                        return (
                          <div key={item.key} className="flex justify-between items-center">
                            <span className="text-xs font-mono text-ink/60">{item.label}</span>
                            {success ? <CheckCircle2 size={14} className="text-status-success" /> : <XCircle size={14} className="text-burgundy" />}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'bulk' && (
            <motion.div
              key="bulk"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <div className="border-2 border-dashed border-border-hairline bg-surface/10 p-12 text-center space-y-6">
                <div className="w-16 h-16 bg-white border border-border-hairline rounded-full flex items-center justify-center mx-auto">
                  <Upload className="text-burgundy" size={24} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-serif font-bold">Upload CSV for Batch Processing</h3>
                  <p className="text-xs text-ink/40 font-mono uppercase">Supports up to 50,000 records per job</p>
                </div>
                <label className="inline-block bg-ink text-white px-8 py-3 font-black uppercase tracking-widest text-[10px] cursor-pointer hover:bg-burgundy transition-colors">
                  {uploading ? 'Processing...' : 'Select CSV File'}
                  <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                </label>
                <p className="text-[10px] text-ink/40 italic">
                  CSV must contain an "email" column. Results will be available in Audit Logs.
                </p>
              </div>
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <div className="bg-white border border-border-hairline overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface/30 border-b border-border-hairline">
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-ink/40">Email Address</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-ink/40">Status</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-ink/40">Score</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-ink/40">Verified At</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-ink/40"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-hairline">
                    {logs.map(log => (
                      <tr key={log.id} className="hover:bg-surface/10 transition-colors">
                        <td className="px-6 py-4">
                          <span className="text-sm font-serif font-bold">{log.email}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(log.status)}
                            <span className="text-[10px] font-black uppercase tracking-widest">{log.status}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-mono">{log.score}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-[10px] font-mono text-ink/40 uppercase">
                            {format(new Date(log.createdAt), 'MMM d, HH:mm')}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button className="text-ink/20 hover:text-burgundy transition-colors">
                            <ArrowRight size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};
