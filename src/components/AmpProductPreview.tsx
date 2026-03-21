import React, { useState } from 'react';
import { CheckCircle2, Loader2, ShoppingBag } from 'lucide-react';

export const AmpProductPreview = ({ campaignId, contactId, productName, price, buttonText }: { campaignId: string, contactId: string, productName: string, price: string, buttonText: string }) => {
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchased, setPurchased] = useState(false);

  const handlePurchase = async () => {
    setIsPurchasing(true);
    try {
      await fetch('/api/amp/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId,
          contactId,
          type: 'PRODUCT_PURCHASE',
          productName,
          price
        })
      });
      setPurchased(true);
    } catch (e) {
      console.error(e);
    } finally {
      setIsPurchasing(false);
    }
  };

  if (purchased) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 p-6 text-center my-8">
        <CheckCircle2 className="mx-auto text-emerald-500 mb-2" size={24} />
        <h4 className="font-sans font-bold text-emerald-900">Purchase Successful!</h4>
        <p className="text-sm text-emerald-700 mt-1">You have successfully purchased {productName}.</p>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border-hairline p-6 my-8 relative overflow-hidden flex items-center justify-between">
      <div className="absolute top-0 right-0 bg-burgundy text-white text-[8px] font-black uppercase tracking-widest px-2 py-1">
        AMP Interactive
      </div>
      <div>
        <h4 className="font-serif text-lg font-bold text-ink">{productName}</h4>
        <p className="text-xl font-sans font-black text-burgundy mt-1">{price}</p>
        <p className="text-[10px] text-ink/40 mt-4 font-mono uppercase tracking-widest">
          1-Click Purchase via AMP
        </p>
      </div>
      <button
        onClick={handlePurchase}
        disabled={isPurchasing}
        className="bg-burgundy text-white px-6 py-3 text-xs font-black uppercase tracking-widest hover:bg-burgundy/90 transition-colors flex items-center gap-2"
      >
        {isPurchasing ? <Loader2 size={16} className="animate-spin" /> : <ShoppingBag size={16} />}
        {isPurchasing ? 'Processing...' : buttonText}
      </button>
    </div>
  );
};
