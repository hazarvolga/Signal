import React from 'react';
import { Gift, Copy } from 'lucide-react';

export const ReferralWidgetPreview = ({ contact }: { contact?: any }) => {
  const referrals = contact?.referrals || 0;
  const nextMilestone = 3;
  const progress = Math.min((referrals / nextMilestone) * 100, 100);

  return (
    <div className="bg-surface border border-border-hairline p-8 my-8 text-center relative overflow-hidden">
      <div className="absolute top-0 right-0 bg-burgundy text-white text-[8px] font-black uppercase tracking-widest px-2 py-1">
        Referral Program
      </div>
      <Gift className="mx-auto text-burgundy mb-4" size={32} />
      <h4 className="font-serif text-2xl font-bold text-ink mb-2">Share & Earn Rewards</h4>
      <p className="text-sm text-ink/60 mb-6 max-w-md mx-auto">
        You have {referrals} referrals. Get {Math.max(nextMilestone - referrals, 0)} more to unlock the <span className="font-bold text-ink">Premium eBook</span>!
      </p>

      <div className="w-full max-w-sm mx-auto bg-border-hairline h-2 mb-6 rounded-full overflow-hidden">
        <div className="bg-burgundy h-full transition-all duration-1000" style={{ width: `${progress}%` }}></div>
      </div>

      <div className="flex items-center justify-center gap-2 max-w-sm mx-auto">
        <code className="flex-1 bg-white border border-border-hairline px-4 py-3 text-xs font-mono text-left overflow-hidden text-ellipsis whitespace-nowrap">
          https://signal.com/ref/{contact?.id || 'preview123'}
        </code>
        <button className="bg-ink text-white p-3 hover:bg-ink/80 transition-colors flex items-center justify-center">
          <Copy size={16} />
        </button>
      </div>
    </div>
  );
};
