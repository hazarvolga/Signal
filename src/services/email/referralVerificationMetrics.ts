import client from "prom-client";
import { register } from "../metrics";

export const referralVerificationFinalFailuresTotal = new client.Counter({
  name: "signal_referral_verification_final_failures_total",
  help: "Referral verification email jobs that exhausted all delivery attempts",
  registers: [register],
});
