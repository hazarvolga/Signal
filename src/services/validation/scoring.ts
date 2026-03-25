export interface ValidationDetails {
  syntax: boolean;
  dns: boolean;
  smtp: boolean;
  disposable: boolean;
  roleBased: boolean;
  catchAll: boolean;
  temporary: boolean;
  isParked?: boolean;
  isRecentlyRegistered?: boolean;
  historicalBounceRate?: number;
  engagementScore?: number;
}

export interface ScoringResult {
  status: 'valid' | 'invalid' | 'risky' | 'unknown';
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
    if (!details.catchAll) score += 10;
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

    let status: ScoringResult['status'] = 'unknown';
    if (score >= 80) status = 'valid';
    else if (score >= 50) status = 'risky';
    else status = 'invalid';

    // Confidence is a simplified metric here
    const confidence = details.smtp ? 0.9 : 0.6;

    return {
      status,
      score,
      confidence,
      details
    };
  }
}
