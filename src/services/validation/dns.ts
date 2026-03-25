import dns from 'dns/promises';
import { redisService } from '../redisService';

export interface DNSResult {
  mx: string[];
  a: string[];
  fromCache: boolean;
  isParked: boolean;
  isRecentlyRegistered: boolean;
}

export class DNSResolverService {
  private static CACHE_TTL = 3600; // 1 hour
  
  // Common parked domain name servers or MX records
  private static PARKED_INDICATORS = [
    'parkingpage', 'domainpark', 'sedoparking', 'bodis', 'hugedomains'
  ];

  static async resolve(domain: string): Promise<DNSResult> {
    const cacheKey = `dns:${domain}`;
    const cached = await redisService.get<DNSResult>(cacheKey);
    
    if (cached) {
      return { ...cached, fromCache: true };
    }

    const result: DNSResult = {
      mx: [],
      a: [],
      fromCache: false,
      isParked: false,
      isRecentlyRegistered: false
    };

    try {
      const mxRecords = await dns.resolveMx(domain);
      result.mx = mxRecords
        .sort((a, b) => a.priority - b.priority)
        .map(r => r.exchange);
        
      // Check for parked domains via MX records
      result.isParked = result.mx.some(mx => 
        this.PARKED_INDICATORS.some(indicator => mx.toLowerCase().includes(indicator))
      );
    } catch (e) {
      // No MX records, fallback to A
      try {
        const aRecords = await dns.resolve4(domain);
        result.a = aRecords;
      } catch (ae) {
        // No A records either
      }
    }
    
    // In a production environment, we would do a WHOIS lookup here to check domain age
    // For now, we simulate this check
    result.isRecentlyRegistered = await this.checkDomainAge(domain);

    await redisService.set(cacheKey, result, this.CACHE_TTL);
    return result;
  }
  
  private static async checkDomainAge(domain: string): Promise<boolean> {
    // Mock WHOIS check. In production, use a WHOIS API or library.
    // Return true if domain is < 30 days old.
    return false;
  }
}
