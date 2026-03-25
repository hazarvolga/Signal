import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BrainCircuit, Sparkles, Activity, Users2, Loader2, CheckCircle2 } from 'lucide-react';
import { Contact } from '../types'; // I will just use any or define it here if needed. Let's assume it's passed as prop.

interface AiSegmentationModalProps {
  isOpen: boolean;
  onClose: () => void;
  contacts: any[];
  onApply: (segmentedContacts: any[]) => void;
}

export const AiSegmentationModal: React.FC<AiSegmentationModalProps> = ({ isOpen, onClose, contacts, onApply }) => {
  const [step, setStep] = useState<'idle' | 'analyzing' | 'results'>('idle');
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [segments, setSegments] = useState<{name: string, count: number, color: string, description: string}[]>([]);
  const [processedContacts, setProcessedContacts] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      setStep('idle');
      setProgress(0);
      setLogs([]);
      setSegments([]);
    }
  }, [isOpen]);

  const startAnalysis = () => {
    setStep('analyzing');
    setLogs(['Initializing predictive models...']);
    
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += Math.random() * 15;
      if (currentProgress >= 100) {
        currentProgress = 100;
        clearInterval(interval);
        finishAnalysis();
      }
      setProgress(currentProgress);
      
      if (currentProgress > 20 && logs.length === 1) {
        setLogs(prev => [...prev, 'Analyzing historical open rates...']);
      } else if (currentProgress > 40 && logs.length === 2) {
        setLogs(prev => [...prev, 'Clustering user behavior patterns...']);
      } else if (currentProgress > 60 && logs.length === 3) {
        setLogs(prev => [...prev, 'Identifying churn probabilities...']);
      } else if (currentProgress > 80 && logs.length === 4) {
        setLogs(prev => [...prev, 'Generating predictive segments...']);
      }
    }, 400);
  };

  const finishAnalysis = () => {
    // Simulate AI segmentation logic based on score
    let loyal = 0;
    let churnRisk = 0;
    let discountSeeker = 0;
    
    const newContacts = contacts.map(c => {
      let segmentTag = '';
      if (c.score >= 80) {
        segmentTag = '✨ Loyal Customer';
        loyal++;
      } else if (c.score <= 30) {
        segmentTag = '⚠️ Churn Risk';
        churnRisk++;
      } else {
        segmentTag = '🏷️ Discount Seeker';
        discountSeeker++;
      }
      
      // Add the tag if it doesn't exist
      const updatedTags = c.tags ? [...c.tags.filter((t: string) => !['✨ Loyal Customer', '⚠️ Churn Risk', '🏷️ Discount Seeker'].includes(t)), segmentTag] : [segmentTag];
      
      return { ...c, tags: updatedTags };
    });

    setSegments([
      { name: 'Loyal Customers', count: loyal, color: 'text-emerald-600 bg-emerald-50 border-emerald-200', description: 'High engagement, frequent opens. Ready for premium offers.' },
      { name: 'Churn Risk', count: churnRisk, color: 'text-red-600 bg-red-50 border-red-200', description: 'Engagement dropping. Needs immediate win-back campaign.' },
      { name: 'Discount Seekers', count: discountSeeker, color: 'text-amber-600 bg-amber-50 border-amber-200', description: 'Moderate engagement. Highly responsive to sales and promotions.' }
    ]);
    
    setProcessedContacts(newContacts);
    setStep('results');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-ink/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-bg border border-ink w-full max-w-2xl shadow-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-border-hairline flex justify-between items-center bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-burgundy/10 flex items-center justify-center">
              <BrainCircuit className="text-burgundy" size={20} />
            </div>
            <div>
              <h2 className="font-serif text-2xl font-bold text-ink">Predictive Segmentation</h2>
              <p className="text-[10px] font-black uppercase tracking-widest text-ink/40">AI-Powered Audience Clustering</p>
            </div>
          </div>
          <button onClick={onClose} className="text-ink/40 hover:text-burgundy transition-colors">✕</button>
        </div>

        <div className="p-8">
          {step === 'idle' && (
            <div className="text-center space-y-8 py-8">
              <div className="w-24 h-24 mx-auto bg-surface border border-border-hairline rounded-full flex items-center justify-center relative">
                <Sparkles className="text-burgundy absolute top-4 right-4" size={16} />
                <Users2 className="text-ink/40" size={32} />
              </div>
              <div className="max-w-md mx-auto space-y-4">
                <h3 className="text-xl font-serif font-bold">Analyze {contacts.length} Contacts</h3>
                <p className="text-sm text-ink/60 leading-relaxed">
                  Our AI model will analyze historical engagement data, open rates, and interaction patterns to automatically categorize your audience into actionable segments.
                </p>
              </div>
              <button 
                onClick={startAnalysis}
                className="btn-primary inline-flex items-center gap-2"
              >
                <BrainCircuit size={16} />
                Start AI Analysis
              </button>
            </div>
          )}

          {step === 'analyzing' && (
            <div className="space-y-8 py-8">
              <div className="flex justify-center">
                <div className="relative">
                  <div className="w-24 h-24 border-4 border-surface rounded-full"></div>
                  <div 
                    className="absolute top-0 left-0 w-24 h-24 border-4 border-burgundy rounded-full border-t-transparent animate-spin"
                  ></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="font-sans font-black text-xl">{Math.round(progress)}%</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-ink text-white p-6 font-mono text-xs space-y-2 h-40 overflow-y-auto">
                {logs.map((log, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2"
                  >
                    <span className="text-burgundy">{'>'}</span> {log}
                  </motion.div>
                ))}
                <div className="flex items-center gap-2 animate-pulse text-white/50">
                  <span className="text-burgundy">{'>'}</span> _
                </div>
              </div>
            </div>
          )}

          {step === 'results' && (
            <div className="space-y-8">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 mx-auto bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle2 size={24} />
                </div>
                <h3 className="text-2xl font-serif font-bold">Analysis Complete</h3>
                <p className="text-sm text-ink/60">We've identified 3 key segments in your audience.</p>
              </div>

              <div className="grid gap-4">
                {segments.map((seg, i) => (
                  <motion.div 
                    key={seg.name}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className={`p-4 border flex items-start gap-4 ${seg.color}`}
                  >
                    <div className="w-12 h-12 bg-white/50 shrink-0 flex items-center justify-center font-serif text-xl font-bold">
                      {seg.count}
                    </div>
                    <div>
                      <h4 className="font-sans font-black uppercase tracking-widest text-xs mb-1">{seg.name}</h4>
                      <p className="text-sm opacity-80">{seg.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="flex justify-end gap-4 pt-4 border-t border-border-hairline">
                <button onClick={onClose} className="px-6 py-3 font-sans font-black uppercase tracking-widest text-xs hover:bg-surface transition-colors">
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    onApply(processedContacts);
                    onClose();
                  }} 
                  className="btn-primary flex items-center gap-2"
                >
                  <Sparkles size={16} />
                  Apply Segments to Audience
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
