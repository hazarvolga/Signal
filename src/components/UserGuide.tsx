import React, { useState } from 'react';
import { BookOpen, X, ChevronRight, Shield, Edit3 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ADMIN_GUIDE, EDITOR_GUIDE } from '../constants/guides';
import { useAuth } from '../hooks/useAuth';

export const UserGuideModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'admin' | 'editor'>(user?.role === 'OWNER' || user?.role === 'ADMIN' ? 'admin' : 'editor');

  const guide = activeTab === 'admin' ? ADMIN_GUIDE : EDITOR_GUIDE;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 md:p-12 bg-ink/60 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-bg border-2 border-ink w-full max-w-5xl h-full max-h-[800px] flex flex-col shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="p-8 border-b border-border-hairline flex justify-between items-center bg-surface">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-burgundy text-white flex items-center justify-center">
                  <BookOpen size={24} />
                </div>
                <div>
                  <h2 className="text-3xl font-serif font-bold text-ink">Signal Documentation</h2>
                  <p className="text-xs font-mono text-ink/40 uppercase tracking-widest">System Operational Manual v1.0</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="w-10 h-10 border border-border-hairline flex items-center justify-center hover:bg-burgundy hover:text-white transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex flex-1 overflow-hidden">
              {/* Sidebar Tabs */}
              <div className="w-64 border-r border-border-hairline bg-surface/50 p-6 space-y-2">
                <button
                  onClick={() => setActiveTab('admin')}
                  className={`w-full flex items-center gap-3 p-4 text-left transition-all ${
                    activeTab === 'admin' 
                      ? 'bg-ink text-white shadow-lg' 
                      : 'hover:bg-bg text-ink/60'
                  }`}
                >
                  <Shield size={18} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Admin Guide</span>
                </button>
                <button
                  onClick={() => setActiveTab('editor')}
                  className={`w-full flex items-center gap-3 p-4 text-left transition-all ${
                    activeTab === 'editor' 
                      ? 'bg-ink text-white shadow-lg' 
                      : 'hover:bg-bg text-ink/60'
                  }`}
                >
                  <Edit3 size={18} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Editor Guide</span>
                </button>
              </div>

              {/* Content Area */}
              <div className="flex-1 overflow-y-auto p-12 space-y-12 custom-scrollbar">
                <div className="space-y-4">
                  <h3 className="text-5xl font-serif font-bold text-ink">{guide.title}</h3>
                  <div className="h-1 w-24 bg-burgundy"></div>
                </div>

                <div className="grid gap-12">
                  {guide.sections.map((section, idx) => (
                    <div key={section.id} className="space-y-4">
                      <div className="flex items-center gap-4">
                        <span className="text-4xl font-serif italic text-burgundy/20">0{idx + 1}</span>
                        <h4 className="text-xl font-serif font-bold text-ink uppercase tracking-tight">{section.title}</h4>
                      </div>
                      <p className="text-lg font-editorial leading-relaxed text-ink/80 max-w-2xl">
                        {section.content}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="pt-12 border-t border-border-hairline">
                  <div className="bg-surface p-8 border border-border-hairline space-y-4">
                    <h5 className="text-sm font-black uppercase tracking-widest text-ink">Need further assistance?</h5>
                    <p className="text-xs font-editorial italic text-ink/60">Contact the system administrator or reach out to our support dispatch for technical inquiries.</p>
                    <button className="text-[10px] font-black uppercase text-burgundy hover:underline flex items-center gap-2">
                      Open Support Ticket <ChevronRight size={12} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
