import React from "react";
import { Gift } from "lucide-react";

export const ReferralWidgetPreview = ({ contact }: { contact?: { id?: string } }) => {
  return (
    <div className="relative my-8 overflow-hidden border border-border-hairline bg-surface p-8 text-center">
      <div className="absolute right-0 top-0 bg-burgundy px-2 py-1 text-[8px] font-black uppercase tracking-widest text-white">
        Referral Program
      </div>
      <Gift className="mx-auto mb-4 text-burgundy" size={32} />
      <h4 className="mb-2 font-serif text-2xl font-bold text-ink">Share and earn rewards</h4>
      <p className="mx-auto mb-6 max-w-md text-sm text-ink/60">
        A signed, subscriber-specific referral page is generated when this broadcast is delivered.
      </p>
      <code className="mx-auto block max-w-md overflow-hidden text-ellipsis whitespace-nowrap border border-border-hairline bg-bg px-4 py-3 text-left text-xs font-mono text-ink/80">
        {contact?.id
          ? "https://your-domain.example/referral/[signed-contact-token]"
          : "Personalized referral link appears at delivery"}
      </code>
    </div>
  );
};
