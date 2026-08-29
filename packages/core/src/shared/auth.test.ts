import { describe, it, expect } from 'vitest';
import { sha256, generateJti } from './auth';

describe('Auth utilities', () => {
  describe('sha256', () => {
    it('produces consistent hash for same input', () => {
      const input = 'test-token';
      const hash1 = sha256(input);
      const hash2 = sha256(input);
      expect(hash1).toBe(hash2);
    });

    it('produces different hashes for different inputs', () => {
      expect(sha256('input1')).not.toBe(sha256('input2'));
    });

    it('produces 64-character hex string', () => {
      const hash = sha256('test');
      expect(hash.length).toBe(64);
      expect(/^[a-f0-9]+$/.test(hash)).toBe(true);
    });

    it('handles empty string', () => {
      const hash = sha256('');
      expect(hash.length).toBe(64);
    });

    it('handles unicode', () => {
      const hash = sha256('🔐🦄');
      expect(hash.length).toBe(64);
    });

    it('produces different hash for slightly different input', () => {
      expect(sha256('token')).not.toBe(sha256('token '));
    });
  });

  describe('generateJti', () => {
    it('generates unique IDs', () => {
      const ids = new Set();
      for (let i = 0; i < 100; i++) {
        ids.add(generateJti());
      }
      expect(ids.size).toBe(100);
    });

    it('generates 32-character hex string', () => {
      const jti = generateJti();
      expect(jti.length).toBe(32);
      expect(/^[a-f0-9]+$/.test(jti)).toBe(true);
    });
  });
});
