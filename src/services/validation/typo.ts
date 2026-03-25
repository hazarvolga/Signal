export class TypoSuggestionEngine {
  private static POPULAR_DOMAINS = [
    'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com',
    'icloud.com', 'me.com', 'mac.com', 'live.com', 'msn.com'
  ];

  static suggest(domain: string): string | null {
    const lowerDomain = domain.toLowerCase();
    
    // If it's already a popular domain, no suggestion
    if (this.POPULAR_DOMAINS.includes(lowerDomain)) {
      return null;
    }

    let bestMatch: string | null = null;
    let minDistance = Infinity;

    for (const popular of this.POPULAR_DOMAINS) {
      const distance = this.levenshteinDistance(lowerDomain, popular);
      // If distance is 1 or 2, it's likely a typo
      if (distance <= 2 && distance < minDistance) {
        minDistance = distance;
        bestMatch = popular;
      }
    }

    return bestMatch;
  }

  private static levenshteinDistance(a: string, b: string): number {
    const matrix = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            Math.min(
              matrix[i][j - 1] + 1, // insertion
              matrix[i - 1][j] + 1 // deletion
            )
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }
}
