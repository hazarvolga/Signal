import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock3, Loader2 } from "lucide-react";
import { apiFetch } from "../services/api";

interface VerificationHealth {
  counts: { pending: number; accepted: number; failed: number };
  recentFailures: Array<{
    id: string;
    referredEmail: string;
    verificationEmailAttempts: number;
    verificationEmailLastError: string | null;
    updatedAt: string;
  }>;
}

export function ReferralVerificationHealth() {
  const [health, setHealth] = useState<VerificationHealth | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    apiFetch("/api/growth/verification-health", { signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload) throw new Error(payload?.error || "Verification telemetry unavailable.");
        setHealth(payload);
      })
      .catch((requestError) => {
        if (requestError instanceof DOMException && requestError.name === "AbortError") return;
        setError(requestError instanceof Error ? requestError.message : "Verification telemetry unavailable.");
      });
    return () => controller.abort();
  }, []);

  if (error) return <div role="alert" className="border border-red-700/30 bg-red-50 p-4 text-sm font-bold text-red-900">{error}</div>;
  if (!health) return <div className="flex items-center gap-3 border border-border-hairline bg-surface p-5 text-sm"><Loader2 className="animate-spin" size={18} /> Loading referral delivery health...</div>;

  const metrics = [
    { label: "Pending", value: health.counts.pending, icon: Clock3, tone: "text-burgundy" },
    { label: "Accepted", value: health.counts.accepted, icon: CheckCircle2, tone: "text-status-success" },
    { label: "Failed", value: health.counts.failed, icon: AlertTriangle, tone: "text-red-700" },
  ];

  return (
    <section aria-labelledby="referral-delivery-health" className="border border-border-hairline bg-surface p-6 sm:p-8">
      <div className="flex flex-col justify-between gap-2 border-b border-border-hairline pb-4 sm:flex-row sm:items-end">
        <div><p className="text-[10px] font-black uppercase tracking-widest text-ink/40">Transactional delivery</p><h2 id="referral-delivery-health" className="mt-1 font-serif text-2xl font-bold">Referral Verification Health</h2></div>
        <span className={health.counts.failed ? "text-xs font-black uppercase tracking-widest text-red-700" : "text-xs font-black uppercase tracking-widest text-status-success"}>{health.counts.failed ? "Action required" : "Operational"}</span>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">{metrics.map(({ label, value, icon: Icon, tone }) => <div key={label} className="border border-border-hairline bg-bg p-5"><Icon size={18} className={tone} /><p className="mt-4 font-serif text-3xl font-bold">{value}</p><p className="mt-1 text-[10px] font-black uppercase tracking-widest text-ink/50">{label}</p></div>)}</div>
      {health.recentFailures.length > 0 && <div className="mt-6"><h3 className="text-xs font-black uppercase tracking-widest">Recent final or retrying failures</h3><ul className="mt-3 divide-y divide-border-hairline border border-border-hairline">{health.recentFailures.map((failure) => <li key={failure.id} className="grid gap-2 p-4 text-sm sm:grid-cols-[1fr_auto]"><div><p className="font-bold">{failure.referredEmail}</p><p className="mt-1 truncate text-xs text-ink/60" title={failure.verificationEmailLastError || undefined}>{failure.verificationEmailLastError || "Provider failure recorded"}</p></div><span className="font-mono text-xs text-red-700">{failure.verificationEmailAttempts} attempts</span></li>)}</ul></div>}
    </section>
  );
}
