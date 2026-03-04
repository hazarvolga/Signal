import { z } from 'zod';

export const validateSyntax = (email: string): boolean => {
  if (!email || typeof email !== 'string') return false;
  
  const trimmedEmail = email.trim();
  if (trimmedEmail.length > 254) return false;

  // RFC 5322 compliant-ish regex
  const emailRegex = /^(?!\.)(?!.*\.\.)([a-zA-Z0-9_+!#$%&'*+/=?^`{|}~.-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})$/;
  
  if (!emailRegex.test(trimmedEmail)) return false;

  // Check for malformed unicode or control characters
  // eslint-disable-next-line no-control-regex
  const controlChars = /[\x00-\x1F\x7F]/;
  if (controlChars.test(trimmedEmail)) return false;

  return true;
};

export const normalizeEmail = (email: string): string => {
  const [local, domain] = email.trim().split('@');
  return `${local}@${domain.toLowerCase()}`;
};
