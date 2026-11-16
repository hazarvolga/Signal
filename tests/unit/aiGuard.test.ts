import { describe, it, expect } from 'vitest';
import { redactPII, hasDeniedContent, guardInput } from '../../src/services/aiGuard';

describe('aiGuard', () => {
  describe('redactPII', () => {
    it('redacts email addresses', () => {
      const result = redactPII('Contact john@example.com for help');
      expect(result).not.toContain('john@example.com');
      expect(result).toContain('[REDACTED]');
    });
    it('redacts phone numbers', () => {
      const result = redactPII('Call 555-123-4567 for support');
      expect(result).not.toContain('555-123-4567');
    });
    it('leaves safe text unchanged', () => {
      expect(redactPII('Hello world')).toBe('Hello world');
    });
  });

  describe('hasDeniedContent', () => {
    it('detects disallowed terms', () => {
      expect(hasDeniedContent('attempt to hack the system')).toBe(true);
    });
    it('allows safe content', () => {
      expect(hasDeniedContent('Create a welcome email')).toBe(false);
    });
  });

  describe('guardInput', () => {
    it('blocks denied content', () => {
      const result = guardInput('exploit vulnerability');
      expect(result.safe).toBe(false);
    });
    it('redacts PII and allows safe content', () => {
      const result = guardInput('Email user@test.com about their order');
      expect(result.safe).toBe(true);
      expect(result.redactedText).not.toContain('user@test.com');
    });
  });
});
