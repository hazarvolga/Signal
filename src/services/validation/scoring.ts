export interface ValidationDetails {
  syntax: boolean;
  dns: boolean;
  smtp: boolean;
  smtpStatus: "not_checked" | "accepted" | "rejected" | "temporary" | "unavailable";
  disposable: boolean;
  roleBased: boolean;
  catchAll: boolean | null;
  temporary: boolean;
  isParked?: boolean;
  isRecentlyRegistered?: boolean | null;
  historicalBounceRate?: number;
  engagementScore?: number;
}

export interface ScoringResult {
  status: "valid" | "invalid" | "risky" | "unknown";
  score: number;
  confidence: number;
  details: ValidationDetails;
  suggestedCorrection?: string;
}

export class ScoringEngine {
  static calculate(details: ValidationDetails): ScoringResult {
    let score = 0;

    if (details.syntax) score += 20;
    if (details.dns) score += 20;
    if (details.smtp) score += 30;
    if (!details.disposable) score += 10;
    if (!details.roleBased) score += 5;
    if (details.catchAll === false) score += 10;
    if (!details.temporary) score += 5;

    // Penalize for parked or new domains
    if (details.isParked) score -= 30;
    if (details.isRecentlyRegistered) score -= 15;

    // Adjust based on historical data if available
    if (details.historicalBounceRate !== undefined) {
      if (details.historicalBounceRate > 0.1) score -= 20;
    }
    if (details.engagementScore !== undefined) {
      if (details.engagementScore > 50) score += 10;
    }

    // Cap score at 100 and floor at 0
    score = Math.max(0, Math.min(100, score));

    let status: ScoringResult["status"];
    if (!details.syntax || !details.dns || details.smtpStatus === "rejected") {
      status = "invalid";
      if (details.smtpStatus === "rejected") score = Math.min(score, 25);
    } else if (details.smtpStatus === "accepted") {
      status = score >= 80 ? "valid" : "risky";
    } else {
      // A timeout, blocked port or unavailable SMTP probe is not evidence that
      // the recipient does not exist.
      status = "unknown";
    }

    const confidence =
      details.smtpStatus === "accepted" || details.smtpStatus === "rejected"
        ? 0.9
        : details.dns
          ? 0.55
          : 0.25;

    return {
      status,
      score,
      confidence,
      details,
    };
  }
}
