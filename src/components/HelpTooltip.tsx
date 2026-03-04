import React, { useState } from 'react';
import { HelpCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TOOLTIP_CONTENT } from '../constants/guides';

interface HelpTooltipProps {
  guideKey: string;
  className?: string;
}

export const HelpTooltip: React.FC<HelpTooltipProps> = ({ guideKey, className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const content = TOOLTIP_CONTENT[guideKey] || "No help content available for this section.";

  return (
    <div className={`relative inline-block ${className}`}>
      <button 
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="text-burgundy/40 hover:text-burgundy transition-colors p-1"
        title="Click for help"
      >
        <HelpCircle size={14} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-[60]" 
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-ink text-white p-4 shadow-2xl z-[70] border border-burgundy/30"
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-burgundy">Quick Guide</span>
                <button onClick={() => setIsOpen(false)} className="text-white/40 hover:text-white">
                  <X size={12} />
                </button>
              </div>
              <p className="text-xs font-sans leading-relaxed">
                {content}
              </p>
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-ink" />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
