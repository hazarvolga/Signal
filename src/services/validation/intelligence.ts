import { redisService } from '../redisService';

const ROLE_PREFIXES = [
  'admin', 'support', 'info', 'sales', 'contact', 'help', 'webmaster', 
  'billing', 'hr', 'jobs', 'marketing', 'no-reply', 'noreply'
];

// Mock list for now, in production this would be a large fetched list
const DISPOSABLE_DOMAINS = [
  'mailinator.com', 'guerrillamail.com', 'temp-mail.org', '10minutemail.com',
  'yopmail.com', 'throwawaymail.com', 'dispostable.com'
];

export class DomainIntelligenceService {
  static isRoleBased(email: string): boolean {
    const localPart = email.split('@')[0].toLowerCase();
    return ROLE_PREFIXES.some(prefix => localPart === prefix || localPart.startsWith(`${prefix}.`));
  }

  static async isDisposable(domain: string): Promise<boolean> {
    // In production, check against a database or cached list
    return DISPOSABLE_DOMAINS.includes(domain.toLowerCase());
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
