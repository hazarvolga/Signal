import { validateSyntax, normalizeEmail } from './syntax';
import { DNSResolverService } from './dns';
import { SMTPVerificationService } from './smtp';
import { DomainIntelligenceService } from './intelligence';
import { ScoringEngine, ScoringResult, ValidationDetails } from './scoring';

export class ValidationEngine {
  static async validate(email: string): Promise<ScoringResult> {
    const details: ValidationDetails = {
      syntax: false,
      dns: false,
      smtp: false,
      disposable: false,
      roleBased: false,
      catchAll: false,
      temporary: false
    };

    // 1. Syntax
    if (!validateSyntax(email)) {
      return ScoringEngine.calculate(details);
    }
    details.syntax = true;
    const normalized = normalizeEmail(email);
    const domain = normalized.split('@')[1];

    // 2. Domain Intelligence (Static checks)
    details.roleBased = DomainIntelligenceService.isRoleBased(normalized);
    details.disposable = await DomainIntelligenceService.isDisposable(domain);
    details.temporary = details.disposable; // Simplified for now

    // 3. DNS
    const dnsResult = await DNSResolverService.resolve(domain);
    if (dnsResult.mx.length === 0 && dnsResult.a.length === 0) {
      return ScoringEngine.calculate(details);
    }
    details.dns = true;

    // 4. SMTP & Catch-All
    // We use the primary MX host for verification
    const mxHost = dnsResult.mx[0] || dnsResult.a[0];
    if (mxHost) {
      try {
        const smtpResult = await SMTPVerificationService.verify(normalized, mxHost);
        details.smtp = smtpResult.success;
        
        // Only check catch-all if SMTP is successful or risky
        details.catchAll = await SMTPVerificationService.checkCatchAll(domain, mxHost);
      } catch (e) {
        // SMTP failed or timed out
      }
    }

    return ScoringEngine.calculate(details);
  }
}
