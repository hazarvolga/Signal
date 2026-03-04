import dns from 'dns/promises';
import { redisService } from '../redisService';

export interface DNSResult {
  mx: string[];
  a: string[];
  fromCache: boolean;
}

export class DNSResolverService {
  private static CACHE_TTL = 3600; // 1 hour

  static async resolve(domain: string): Promise<DNSResult> {
    const cacheKey = `dns:${domain}`;
    const cached = await redisService.get<DNSResult>(cacheKey);
    
    if (cached) {
      return { ...cached, fromCache: true };
    }

    const result: DNSResult = {
      mx: [],
      a: [],
      fromCache: false
    };

    try {
      const mxRecords = await dns.resolveMx(domain);
      result.mx = mxRecords
        .sort((a, b) => a.priority - b.priority)
        .map(r => r.exchange);
    } catch (e) {
      // No MX records, fallback to A
      try {
        const aRecords = await dns.resolve4(domain);
        result.a = aRecords;
      } catch (ae) {
        // No A records either
      }
    }

    await redisService.set(cacheKey, result, this.CACHE_TTL);
    return result;
  }
}
