import React, { useEffect, useState } from "react";
import { Copy, Gift, Loader2, Trophy, TrendingUp, Users, X } from "lucide-react";
import { HelpTooltip } from "./HelpTooltip";
import { useLanguage } from "../contexts/LanguageContext";
import { apiFetch } from "../services/api";

interface RewardTier {
  id: string;
  referrals: number;
  reward: string;
  active: boolean;
}

interface Referrer {
  email: string;
  referrals: number;
  joined: string;
}

interface GrowthData {
  metrics: { totalReferrals: number; activeReferrers: number; rewardsClaimed: number };
  rewards: RewardTier[];
  topReferrers: Referrer[];
  claims: RewardClaim[];
  pendingVerifications: PendingVerification[];
}

interface PendingVerification {
  id: string;
  referredEmail: string;
  referrerEmail: string;
  verificationEmailStatus: "PENDING" | "ACCEPTED" | "FAILED";
  verificationEmailAttempts: number;
  verificationEmailSentAt: string | null;
  verificationEmailLastError: string | null;
  createdAt: string;
}

interface RewardClaim {
  id: string;
  referrerEmail: string;
  referralCount: number;
  status: "ELIGIBLE" | "CLAIMED";
  reward: string;
  requiredReferrals: number;
}

const EMPTY_DATA: GrowthData = {
  metrics: { totalReferrals: 0, activeReferrers: 0, rewardsClaimed: 0 },
  rewards: [],
  topReferrers: [],
  claims: [],
  pendingVerifications: [],
};

export const GrowthEngine = () => {
  const { t } = useLanguage();
  const [data, setData] = useState<GrowthData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingTier, setEditingTier] = useState<RewardTier | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [copied, setCopied] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [referrals, setReferrals] = useState(3);
  const [rewardName, setRewardName] = useState("");
  const [active, setActive] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    apiFetch("/api/growth", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load referral data.");
        return response.json();
      })
      .then(setData)
      .catch((requestError) => {
        if (requestError instanceof DOMException && requestError.name === "AbortError") return;
        setError(
          requestError instanceof Error ? requestError.message : "Unable to load referral data."
        );
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const openEditor = (tier?: RewardTier) => {
    setEditingTier(tier || null);
    setReferrals(tier?.referrals || 3);
    setRewardName(tier?.reward || "");
    setActive(tier?.active ?? true);
    setError(null);
    setShowEditor(true);
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const endpoint = editingTier
        ? `/api/growth/rewards/${editingTier.id}`
        : "/api/growth/rewards";
      const response = await apiFetch(endpoint, {
        method: editingTier ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ referrals, reward: rewardName, active }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Unable to save reward tier.");
      const refreshedResponse = await apiFetch("/api/growth");
      const refreshedData = await refreshedResponse.json().catch(() => null);
      if (!refreshedResponse.ok || !refreshedData) {
        throw new Error("Reward tier saved, but growth data could not be refreshed.");
      }
      setData(refreshedData);
      setShowEditor(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save reward tier.");
    } finally {
      setSaving(false);
    }
  };

  const handleCopyWidget = async () => {
    try {
      await navigator.clipboard.writeText("[[REFERRAL_WIDGET]]");
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2_000);
    } catch {
      setError("Unable to copy widget code. Check browser clipboard permissions.");
    }
  };

  const handleClaim = async (claimId: string) => {
    setError(null);
    try {
      const response = await apiFetch(`/api/growth/claims/${claimId}/claim`, { method: "POST" });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Unable to mark reward as claimed.");
      setData((current) => ({
        ...current,
        metrics: { ...current.metrics, rewardsClaimed: current.metrics.rewardsClaimed + 1 },
        claims: current.claims.map((claim) =>
          claim.id === claimId ? { ...claim, status: "CLAIMED" } : claim
        ),
      }));
    } catch (claimError) {
      setError(
        claimError instanceof Error ? claimError.message : "Unable to mark reward as claimed."
      );
    }
  };

  const handleResendVerification = async (referralId: string) => {
    setError(null);
    setResendingId(referralId);
    try {
      const response = await apiFetch(`/api/growth/referrals/${referralId}/resend-verification`, {
        method: "POST",
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Unable to resend verification email.");
      const refreshedResponse = await apiFetch("/api/growth");
      const refreshedData = await refreshedResponse.json().catch(() => null);
      if (!refreshedResponse.ok || !refreshedData)
        throw new Error("Verification queued, but growth data could not be refreshed.");
      setData(refreshedData);
    } catch (resendError) {
      setError(
        resendError instanceof Error ? resendError.message : "Unable to resend verification email."
      );
    } finally {
      setResendingId(null);
    }
  };

  if (loading) {
    return (
      <div className="grid min-h-[420px] place-items-center">
        <Loader2 className="animate-spin" aria-label="Loading growth data" />
      </div>
    );
  }

  const visibleReferrers = showAll ? data.topReferrers : data.topReferrers.slice(0, 5);

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      {error && (
        <div
          role="alert"
          className="border border-red-700/30 bg-red-50 p-4 text-sm font-bold text-red-900"
        >
          {error}
        </div>
      )}
      <div className="flex flex-col justify-between gap-4 border-b border-ink pb-6 sm:flex-row sm:items-end">
        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-ink/40">
            Audience Expansion
          </p>
          <h2 className="flex items-center gap-3 text-4xl font-serif font-bold">
            {t("growth.title")}
            <HelpTooltip guideKey="growth-overview" />
          </h2>
        </div>
        <div className="flex items-center gap-2 border border-burgundy/20 bg-burgundy/5 px-4 py-2">
          <TrendingUp size={14} className="text-burgundy" />
          <span className="text-[10px] font-black uppercase tracking-widest text-burgundy">
            {data.rewards.length ? "Referral Program Configured" : "Setup Required"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        <MetricCard
          label="Total Referrals"
          value={data.metrics.totalReferrals}
          note="Attributed referral records"
        />
        <MetricCard
          label="Active Referrers"
          value={data.metrics.activeReferrers}
          note="Unique referring subscribers"
        />
        <MetricCard
          label="Rewards Claimed"
          value={data.metrics.rewardsClaimed}
          note="Rewarded referrals"
        />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-border-hairline pb-4">
            <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest">
              Reward Milestones
              <HelpTooltip guideKey="growth-rewards" />
            </h3>
            <button
              type="button"
              onClick={() => openEditor()}
              className="text-[10px] font-black uppercase tracking-widest text-burgundy hover:underline"
            >
              + Add Tier
            </button>
          </div>
          <div className="space-y-4">
            {data.rewards.map((tier) => (
              <article
                key={tier.id}
                className={`flex items-center justify-between border p-6 ${tier.active ? "border-ink bg-surface" : "border-border-hairline bg-surface opacity-60"}`}
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center bg-burgundy/10 font-serif text-xl font-bold text-burgundy">
                    {tier.referrals}
                  </div>
                  <div>
                    <h4 className="font-serif text-lg font-bold">{tier.reward}</h4>
                    <p className="mt-1 text-[10px] font-mono uppercase tracking-widest text-ink/40">
                      {tier.active ? "Active Milestone" : "Draft Milestone"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => openEditor(tier)}
                  className="text-sm text-ink/50 hover:text-burgundy"
                  aria-label={`Edit ${tier.reward}`}
                >
                  Edit
                </button>
              </article>
            ))}
            {data.rewards.length === 0 && (
              <div className="border border-dashed border-border-hairline p-10 text-center">
                <Gift className="mx-auto mb-3 text-ink/30" />
                <p className="font-bold text-ink">No reward tiers configured</p>
                <p className="mt-1 text-sm text-ink/60">
                  Add the first milestone to configure the program.
                </p>
              </div>
            )}
          </div>

          <div className="border border-border-hairline bg-surface p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h4 className="mb-2 text-[10px] font-black uppercase tracking-widest">
                  Broadcast Widget
                </h4>
                <p className="mb-4 text-sm text-ink/60">
                  Add the referral widget token to a broadcast.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCopyWidget}
                className="flex items-center gap-2 text-xs font-bold text-burgundy"
              >
                <Copy size={14} />
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <code className="block border border-border-hairline bg-bg p-3 text-xs font-mono text-ink/80">
              [[REFERRAL_WIDGET]]
            </code>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-border-hairline pb-4">
            <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest">
              Top Referrers
              <HelpTooltip guideKey="growth-leaderboard" />
            </h3>
            {data.topReferrers.length > 5 && (
              <button
                type="button"
                onClick={() => setShowAll((value) => !value)}
                className="text-[10px] font-black uppercase tracking-widest text-ink/50 hover:text-ink"
              >
                {showAll ? "Show Top 5" : "View All"}
              </button>
            )}
          </div>
          <div className="border border-border-hairline bg-surface">
            {visibleReferrers.length ? (
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border-hairline text-[10px] uppercase tracking-widest text-ink/50">
                  <tr>
                    <th className="p-4">Rank</th>
                    <th className="p-4">Subscriber</th>
                    <th className="p-4 text-right">Referrals</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-hairline">
                  {visibleReferrers.map((user, index) => (
                    <tr key={user.email}>
                      <td className="p-4">
                        {index < 3 ? (
                          <Trophy
                            size={16}
                            className={
                              index === 0
                                ? "text-yellow-500"
                                : index === 1
                                  ? "text-gray-400"
                                  : "text-amber-700"
                            }
                          />
                        ) : (
                          index + 1
                        )}
                      </td>
                      <td className="p-4 font-medium">{user.email}</td>
                      <td className="p-4 text-right font-serif text-lg font-bold">
                        {user.referrals}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-10 text-center">
                <Users className="mx-auto mb-3 text-ink/30" />
                <p className="font-bold text-ink">No verified referrals yet</p>
                <p className="mt-1 text-sm text-ink/60">
                  Leaderboard data will appear after referral attribution is connected.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>

      <section className="space-y-4">
        <div className="flex flex-col justify-between gap-2 border-b border-border-hairline pb-4 sm:flex-row sm:items-end">
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest">Pending Verifications</h3>
            <p className="mt-1 text-sm text-ink/60">
              Attributed referrals do not count toward rewards until the recipient verifies
              ownership.
            </p>
          </div>
          <span className="text-xs font-bold text-ink/50">
            {data.pendingVerifications.length} pending
          </span>
        </div>
        {data.pendingVerifications.length ? (
          <div className="overflow-x-auto border border-border-hairline bg-surface">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b border-border-hairline text-[10px] uppercase tracking-widest text-ink/50">
                <tr>
                  <th className="p-4">Referred email</th>
                  <th className="p-4">Referrer</th>
                  <th className="p-4">Delivery</th>
                  <th className="p-4">Attempts</th>
                  <th className="p-4">Last error</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-hairline">
                {data.pendingVerifications.map((verification) => (
                  <tr key={verification.id}>
                    <td className="p-4 font-medium">{verification.referredEmail}</td>
                    <td className="p-4">{verification.referrerEmail}</td>
                    <td className="p-4">
                      <span
                        className={
                          verification.verificationEmailStatus === "FAILED"
                            ? "text-red-700"
                            : verification.verificationEmailStatus === "ACCEPTED"
                              ? "text-status-success"
                              : "text-burgundy"
                        }
                      >
                        {verification.verificationEmailStatus}
                      </span>
                    </td>
                    <td className="p-4 font-mono">{verification.verificationEmailAttempts}</td>
                    <td
                      className="max-w-xs truncate p-4 text-ink/60"
                      title={verification.verificationEmailLastError || undefined}
                    >
                      {verification.verificationEmailLastError || "None"}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        type="button"
                        disabled={resendingId === verification.id}
                        onClick={() => handleResendVerification(verification.id)}
                        className="text-xs font-bold text-burgundy hover:underline disabled:cursor-wait disabled:opacity-50"
                      >
                        {resendingId === verification.id ? "Queueing..." : "Resend verification"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="border border-dashed border-border-hairline p-8 text-center text-sm text-ink/60">
            No referrals are waiting for verification.
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="border-b border-border-hairline pb-4">
          <h3 className="text-xs font-black uppercase tracking-widest">Reward Claims</h3>
        </div>
        {data.claims.length ? (
          <div className="overflow-x-auto border border-border-hairline bg-surface">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-border-hairline text-[10px] uppercase tracking-widest text-ink/50">
                <tr>
                  <th className="p-4">Referrer</th>
                  <th className="p-4">Reward</th>
                  <th className="p-4">Progress</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-hairline">
                {data.claims.map((claim) => (
                  <tr key={claim.id}>
                    <td className="p-4 font-medium">{claim.referrerEmail}</td>
                    <td className="p-4">{claim.reward}</td>
                    <td className="p-4 font-mono">
                      {claim.referralCount} / {claim.requiredReferrals}
                    </td>
                    <td className="p-4">
                      <span
                        className={
                          claim.status === "CLAIMED" ? "text-status-success" : "text-burgundy"
                        }
                      >
                        {claim.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {claim.status === "ELIGIBLE" ? (
                        <button
                          type="button"
                          onClick={() => handleClaim(claim.id)}
                          className="text-xs font-bold text-burgundy hover:underline"
                        >
                          Mark Claimed
                        </button>
                      ) : (
                        <span className="text-xs text-ink/50">Completed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="border border-dashed border-border-hairline p-8 text-center text-sm text-ink/60">
            No reward claims are eligible yet.
          </div>
        )}
      </section>

      {showEditor && (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-black/70 p-4">
          <form
            onSubmit={handleSave}
            role="dialog"
            aria-modal="true"
            aria-labelledby="reward-editor-title"
            className="w-full max-w-lg border border-border-hairline bg-bg p-6 shadow-2xl"
          >
            <div className="mb-6 flex items-center justify-between">
              <h3 id="reward-editor-title" className="text-xl font-bold text-ink">
                {editingTier ? "Edit reward tier" : "Add reward tier"}
              </h3>
              <button
                type="button"
                onClick={() => setShowEditor(false)}
                aria-label="Close reward editor"
                className="p-2 text-ink/60 hover:bg-surface"
              >
                <X size={18} />
              </button>
            </div>
            <label className="block text-sm font-bold text-ink">
              Required referrals
              <input
                type="number"
                min={1}
                max={1_000_000}
                value={referrals}
                onChange={(event) => setReferrals(Number(event.target.value))}
                className="mt-2 w-full border border-border-hairline bg-surface p-3"
                required
              />
            </label>
            <label className="mt-4 block text-sm font-bold text-ink">
              Reward
              <input
                type="text"
                maxLength={160}
                value={rewardName}
                onChange={(event) => setRewardName(event.target.value)}
                className="mt-2 w-full border border-border-hairline bg-surface p-3"
                required
              />
            </label>
            <label className="mt-4 flex items-center gap-3 text-sm font-bold text-ink">
              <input
                type="checkbox"
                checked={active}
                onChange={(event) => setActive(event.target.checked)}
              />
              Active milestone
            </label>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowEditor(false)}
                className="px-4 py-2 text-sm font-bold text-ink/70"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="bg-burgundy px-5 py-2 text-sm font-bold text-white disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Tier"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

function MetricCard({ label, value, note }: { label: string; value: number; note: string }) {
  return (
    <div className="space-y-2 border border-border-hairline bg-surface p-8">
      <p className="metric-label">{label}</p>
      <p className="text-4xl font-serif font-bold">{value.toLocaleString()}</p>
      <p className="mt-2 text-xs text-ink/60">{note}</p>
    </div>
  );
}
