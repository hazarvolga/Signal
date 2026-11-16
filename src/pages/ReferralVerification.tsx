import { useState } from "react";
import { CheckCircle2, Loader2, ShieldCheck, XCircle } from "lucide-react";
import { useParams } from "react-router";
import { apiFetch } from "../services/api";

type VerificationState = "idle" | "verifying" | "success" | "error";

export default function ReferralVerification() {
  const { token = "" } = useParams();
  const [state, setState] = useState<VerificationState>("idle");
  const [message, setMessage] = useState("Confirm that you accepted this referral before it counts toward a reward.");

  const verify = async () => {
    setState("verifying");
    try {
      const response = await apiFetch(`/api/public/referrals/verify/${encodeURIComponent(token)}`, { method: "POST" });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Referral verification failed.");
      setMessage(payload?.alreadyVerified ? "This referral was already verified." : "Referral verified successfully.");
      setState("success");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Referral verification failed.");
      setState("error");
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-[#f1ede3] px-5 py-12 text-[#171713]">
      <section className="w-full max-w-xl border border-[#171713]/20 bg-[#fffdf8] p-8 shadow-[12px_12px_0_#6f1d2c] sm:p-12">
        <div className="mb-8 flex h-12 w-12 items-center justify-center border border-[#6f1d2c]/30 bg-[#6f1d2c]/10 text-[#6f1d2c]">
          {state === "success" ? <CheckCircle2 /> : state === "error" ? <XCircle /> : <ShieldCheck />}
        </div>
        <p className="text-xs font-black uppercase tracking-[0.24em] text-[#6f1d2c]">Referral verification</p>
        <h1 className="mt-3 font-serif text-4xl font-bold">One deliberate click.</h1>
        <p className="mt-5 leading-7 text-[#171713]/70" role={state === "error" ? "alert" : undefined}>{message}</p>
        {state === "idle" && (
          <button type="button" onClick={verify} disabled={!token} className="mt-8 w-full bg-[#6f1d2c] px-5 py-4 text-sm font-black uppercase tracking-widest text-white disabled:opacity-50">
            Verify referral
          </button>
        )}
        {state === "verifying" && <div className="mt-8 flex items-center gap-3 text-sm font-bold"><Loader2 className="animate-spin" size={18} /> Verifying referral...</div>}
      </section>
    </main>
  );
}
