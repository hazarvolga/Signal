import React, { useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';

export const AmpSurveyPreview = ({ campaignId, contactId, question, options }: { campaignId: string, contactId: string, question: string, options: string[] }) => {
  const [selected, setSelected] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (option: string) => {
    setSelected(option);
    setIsSubmitting(true);
    try {
      await fetch('/api/amp/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId,
          contactId,
          type: 'SURVEY_SUBMIT',
          question,
          answer: option
        })
      });
      setSubmitted(true);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 p-6 text-center my-8">
        <CheckCircle2 className="mx-auto text-emerald-500 mb-2" size={24} />
        <h4 className="font-sans font-bold text-emerald-900">Thank you for your feedback!</h4>
        <p className="text-sm text-emerald-700 mt-1">Your response has been recorded directly from this email.</p>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border-hairline p-6 my-8 relative overflow-hidden">
      <div className="absolute top-0 right-0 bg-burgundy text-white text-[8px] font-black uppercase tracking-widest px-2 py-1">
        AMP Interactive
      </div>
      <h4 className="font-serif text-lg font-bold text-ink mb-4">{question}</h4>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => (
          <button
            key={opt}
            onClick={() => handleSubmit(opt)}
            disabled={isSubmitting}
            className={`px-4 py-2 border text-sm font-sans transition-colors ${
              selected === opt 
                ? 'bg-burgundy text-white border-burgundy' 
                : 'bg-white text-ink border-border-hairline hover:border-burgundy'
            }`}
          >
            {isSubmitting && selected === opt ? <Loader2 size={14} className="animate-spin mx-auto" /> : opt}
          </button>
        ))}
      </div>
      <p className="text-[10px] text-ink/40 mt-4 font-mono uppercase tracking-widest">
        Powered by AMP for Email
      </p>
    </div>
  );
};
