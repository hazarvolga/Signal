import { redisService } from '../redisService';

const ROLE_PREFIXES = [
  'admin', 'support', 'info', 'sales', 'contact', 'help', 'webmaster', 
  'billing', 'hr', 'jobs', 'marketing', 'no-reply', 'noreply', 'postmaster', 'abuse'
];

// Mock list for now, in production this would be a large fetched list
const DISPOSABLE_DOMAINS = [
  'mailinator.com', 'guerrillamail.com', 'temp-mail.org', '10minutemail.com',
  'yopmail.com', 'throwawaymail.com', 'dispostable.com'
];

// Domains that are often typosquatted
const POPULAR_DOMAINS = [
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com'
];

export class DomainIntelligenceService {
  static isRoleBased(email: string): boolean {
    const localPart = email.split('@')[0].toLowerCase();
    return ROLE_PREFIXES.some(prefix => localPart === prefix || localPart.startsWith(`${prefix}.`));
  }

  static async isDisposable(domain: string): Promise<boolean> {
    const lowerDomain = domain.toLowerCase();
    
    // 1. Check operator overrides (allowlist)
    const isAllowed = await redisService.get(`override:allow:${lowerDomain}`);
    if (isAllowed) return false;

    // 2. Check operator overrides (blocklist)
    const isBlocked = await redisService.get(`override:block:${lowerDomain}`);
    if (isBlocked) return true;

    // 3. Exact match
    if (DISPOSABLE_DOMAINS.includes(lowerDomain)) return true;

    // 4. Subdomain tricks (e.g., anything.mailinator.com)
    const isSubdomainDisposable = DISPOSABLE_DOMAINS.some(d => lowerDomain.endsWith(`.${d}`));
    if (isSubdomainDisposable) return true;

    // 5. Typosquatted disposable domains (simplified check)
    // In production, use edit distance against DISPOSABLE_DOMAINS
    
    return false;
  }

  static async getDomainInfo(domain: string) {
    const cacheKey = `domain_info:${domain}`;
    const cached = await redisService.get(cacheKey);
    if (cached) return cached;

    // Logic to fetch/update domain intelligence
    const info = {
      isDisposable: await this.isDisposable(domain),
      // Other flags would be updated by the engine after validation
    };

    await redisService.set(cacheKey, info, 86400); // 24 hours
    return info;
  }
}
