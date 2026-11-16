import React, { useEffect, useState } from "react";
import { Gift, Loader2 } from "lucide-react";
import { useParams } from "react-router";
import { apiFetch } from "../services/api";

interface RewardTier {
  id: string;
  referrals: number;
  reward: string;
}

interface ReferralProgress {
  referralCount: number;
  claims: Array<{ id: string; rewardTierId: string; status: string; referralCount: number }>;
}

export default function PublicReferral() {
  const { token = "" } = useParams();
  const [rewards, setRewards] = useState<RewardTier[]>([]);
  const [progress, setProgress] = useState<ReferralProgress>({ referralCount: 0, claims: [] });
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "warning" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/public/referrals/${encodeURIComponent(token)}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("This referral link is unavailable.");
        return response.json();
      })
      .then((payload) => {
        setRewards(payload.rewards || []);
        setProgress(payload.progress || { referralCount: 0, claims: [] });
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "This referral link is unavailable.");
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [token]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setStatus("idle");
    try {
      const response = await apiFetch(`/api/public/referrals/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Unable to record referral.");
      if (payload?.verificationQueued === true) {
        setStatus("success");
        setMessage("Referral recorded. A verification email has been queued for delivery.");
      } else {
        setStatus("warning");
        setMessage("Referral recorded, but verification could not be queued. It will not count toward rewards until an administrator resends the verification email.");
      }
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Unable to record referral.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="fixed inset-0 z-[100] overflow-y-auto bg-[#f4f0e8] px-4 py-10 text-[#171713] sm:px-8">
      <div className="mx-auto max-w-2xl border border-[#171713]/20 bg-white p-8 shadow-2xl sm:p-12">
        <Gift size={36} className="text-[#6f1d2c]" aria-hidden="true" />
        <p className="mt-6 text-xs font-black uppercase tracking-[0.2em] text-[#6f1d2c]">Referral invitation</p>
        <h1 className="mt-2 font-serif text-4xl font-bold">Join through a trusted referral</h1>
        <p className="mt-4 text-sm leading-6 text-[#171713]/70">Enter your email to attribute this referral. Your address is never exposed in the referral link.</p>
        {!loading && status !== "error" && <div className="mt-6 border border-[#171713]/15 bg-[#faf8f3] p-4"><p className="text-xs font-black uppercase tracking-widest text-[#6f1d2c]">Referrer progress</p><p className="mt-2 text-2xl font-bold">{progress.referralCount} attributed referrals</p>{progress.claims.length > 0 && <p className="mt-1 text-sm text-[#171713]/70">{progress.claims.filter((claim) => claim.status === "ELIGIBLE").length} rewards ready to claim</p>}</div>}

        {loading ? <Loader2 className="mx-auto my-12 animate-spin" aria-label="Loading referral" /> : status !== "success" && status !== "warning" && (
          <form onSubmit={handleSubmit} className="mt-8">
            <label className="block text-sm font-bold">Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required maxLength={320} autoComplete="email" className="mt-2 w-full border border-[#171713]/30 bg-white p-3" /></label>
            <button type="submit" disabled={submitting || status === "error" && message.includes("unavailable")} className="mt-4 w-full bg-[#6f1d2c] px-5 py-3 text-sm font-bold text-white disabled:opacity-60">{submitting ? "Submitting..." : "Confirm referral"}</button>
          </form>
        )}

        {message && <p role={status === "error" || status === "warning" ? "alert" : "status"} className={`mt-6 border p-4 text-sm font-bold ${status === "error" ? "border-red-700/30 bg-red-50 text-red-900" : status === "warning" ? "border-amber-700/30 bg-amber-50 text-amber-950" : "border-emerald-700/30 bg-emerald-50 text-emerald-900"}`}>{message}</p>}

        {!loading && rewards.length > 0 && <section className="mt-10 border-t border-[#171713]/15 pt-6"><h2 className="text-sm font-black uppercase tracking-widest">Program milestones</h2><ul className="mt-4 space-y-3">{rewards.map((reward) => <li key={reward.id} className="flex justify-between gap-4 border border-[#171713]/15 p-3 text-sm"><span>{reward.reward}</span><strong>{reward.referrals} referrals</strong></li>)}</ul></section>}
      </div>
    </main>
  );
}
