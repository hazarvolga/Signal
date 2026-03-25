import { validateSyntax, normalizeEmail } from './syntax';
import { DNSResolverService } from './dns';
import { SMTPVerificationService } from './smtp';
import { DomainIntelligenceService } from './intelligence';
import { ScoringEngine, ScoringResult, ValidationDetails } from './scoring';
import { TypoSuggestionEngine } from './typo';

export class ValidationEngine {
  static async validate(email: string, context?: { historicalBounceRate?: number, engagementScore?: number }): Promise<ScoringResult> {
    const details: ValidationDetails = {
      syntax: false,
      dns: false,
      smtp: false,
      disposable: false,
      roleBased: false,
      catchAll: false,
      temporary: false,
      isParked: false,
      isRecentlyRegistered: false,
      historicalBounceRate: context?.historicalBounceRate,
      engagementScore: context?.engagementScore,
    };

    // 1. Syntax & Format
    const syntaxResult = validateSyntax(email);
    if (!syntaxResult.valid) {
      return ScoringEngine.calculate(details);
    }
    details.syntax = true;
    
    // Normalize after syntax check
    const normalized = normalizeEmail(email);
    const [localPart, domain] = normalized.split('@');

    // 8. Typo Suggestion
    const typo = TypoSuggestionEngine.suggest(domain);

    // 2. Domain Intelligence (Static checks)
    details.roleBased = DomainIntelligenceService.isRoleBased(normalized);
    details.disposable = await DomainIntelligenceService.isDisposable(domain);
    details.temporary = details.disposable;

    // 3. DNS & Domain Health
    const dnsResult = await DNSResolverService.resolve(domain);
    if (dnsResult.mx.length === 0 && dnsResult.a.length === 0) {
      const result = ScoringEngine.calculate(details);
      if (typo) result.suggestedCorrection = `${localPart}@${typo}`;
      return result;
    }
    details.dns = true;
    details.isParked = dnsResult.isParked;
    details.isRecentlyRegistered = dnsResult.isRecentlyRegistered;

    // 4. SMTP & Catch-All
    // We use the primary MX host for verification
    const mxHost = dnsResult.mx[0] || dnsResult.a[0];
    if (mxHost) {
      try {
        const smtpResult = await SMTPVerificationService.verify(normalized, mxHost);
        details.smtp = smtpResult.success;
        
        // Only check catch-all if SMTP is successful or risky
        if (smtpResult.success || smtpResult.isTemporaryFailure) {
          details.catchAll = await SMTPVerificationService.checkCatchAll(domain, mxHost);
        }
      } catch (e) {
        // SMTP failed or timed out
      }
    }

    const finalResult = ScoringEngine.calculate(details);
    if (typo) {
      finalResult.suggestedCorrection = `${localPart}@${typo}`;
    }
    
    return finalResult;
  }
}
