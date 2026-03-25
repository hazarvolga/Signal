import { z } from 'zod';
import punycode from 'punycode/';

export const validateSyntax = (email: string): { valid: boolean; reason?: string } => {
  if (!email || typeof email !== 'string') return { valid: false, reason: 'Invalid input type' };
  
  const trimmedEmail = email.trim();
  if (trimmedEmail.length > 254) return { valid: false, reason: 'Total length exceeds 254 characters' };

  const parts = trimmedEmail.split('@');
  if (parts.length !== 2) return { valid: false, reason: 'Missing or multiple @ symbols' };

  const [localPart, domainPart] = parts;

  if (localPart.length > 64) return { valid: false, reason: 'Local part exceeds 64 characters' };
  if (localPart.length === 0) return { valid: false, reason: 'Local part is empty' };
  if (domainPart.length === 0) return { valid: false, reason: 'Domain part is empty' };

  // Check for consecutive dots, leading/trailing dots in local part
  if (localPart.startsWith('.') || localPart.endsWith('.')) return { valid: false, reason: 'Local part starts or ends with a dot' };
  if (localPart.includes('..')) return { valid: false, reason: 'Local part contains consecutive dots' };

  // Basic quote validation: if it starts with a quote, it must end with a quote
  if (localPart.startsWith('"')) {
    if (!localPart.endsWith('"')) return { valid: false, reason: 'Unbalanced quotes in local part' };
  } else {
    // Illegal characters outside quotes
    const illegalChars = /[(),:;<>\[\]\\]/;
    if (illegalChars.test(localPart)) return { valid: false, reason: 'Illegal special characters in local part' };
  }

  // Domain validation (allow internationalized domains)
  if (domainPart.startsWith('.') || domainPart.endsWith('.')) return { valid: false, reason: 'Domain starts or ends with a dot' };
  if (domainPart.includes('..')) return { valid: false, reason: 'Domain contains consecutive dots' };

  // Check for spaces
  if (/\s/.test(trimmedEmail)) return { valid: false, reason: 'Contains whitespace' };

  return { valid: true };
};

export const normalizeEmail = (email: string): string => {
  const parts = email.trim().split('@');
  if (parts.length !== 2) return email.trim();
  
  const local = parts[0];
  let domain = parts[1];
  
  // Convert internationalized domain to ASCII (Punycode)
  try {
    domain = punycode.toASCII(domain.toLowerCase());
  } catch (e) {
    domain = domain.toLowerCase();
  }
  
  return `${local}@${domain}`;
};
