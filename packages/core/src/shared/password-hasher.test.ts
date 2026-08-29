import { describe, it, expect, beforeEach } from 'vitest';
import { createPasswordHasher } from './password-hasher';
import type { Argon2idPasswordHasher } from './password-hasher';

describe('PasswordHasher', () => {
  let hasher: Argon2idPasswordHasher;

  beforeEach(() => {
    hasher = createPasswordHasher();
  });

  it('hashes password with Argon2id', async () => {
    const hash = await hasher.hash('validpassword123');
    expect(hash).toBeDefined();
    expect(hash.startsWith('$argon2id$')).toBe(true);
  });

  it('verifies correct password', async () => {
    const password = 'validpassword123';
    const hash = await hasher.hash(password);
    const isValid = await hasher.verify(hash, password);
    expect(isValid).toBe(true);
  });

  it('rejects incorrect password', async () => {
    const hash = await hasher.hash('correctpassword');
    const isValid = await hasher.verify(hash, 'wrongpassword');
    expect(isValid).toBe(false);
  });

  it('uses Argon2id algorithm', async () => {
    const hash = await hasher.hash('password');
    expect(hash.startsWith('$argon2id$')).toBe(true);
  });

  it('produces different hashes for same password (salt)', async () => {
    const password = 'password123';
    const hash1 = await hasher.hash(password);
    const hash2 = await hasher.hash(password);
    expect(hash1).not.toBe(hash2);
    expect(await hasher.verify(hash1, password)).toBe(true);
    expect(await hasher.verify(hash2, password)).toBe(true);
  });

  it('uses secure parameters (memoryCost=65536, timeCost=3, parallelism=1)', async () => {
    const hash = await hasher.hash('password');
    // Argon2id format: $argon2id$v=19$m=65536,t=3,p=1$salt$hash
    expect(hash).toMatch(/\$argon2id\$v=\d+\$m=65536,t=3,p=1\$/);
  });

  it('handles empty password', async () => {
    const hash = await hasher.hash('');
    expect(hash).toBeDefined();
    expect(await hasher.verify(hash, '')).toBe(true);
  });

  it('handles unicode password', async () => {
    const password = 'senha🔐com🦄unicode';
    const hash = await hasher.hash(password);
    expect(await hasher.verify(hash, password)).toBe(true);
    expect(await hasher.verify(hash, 'wrong')).toBe(false);
  });

  it('handles very long password', async () => {
    const password = 'a'.repeat(1000);
    const hash = await hasher.hash(password);
    expect(await hasher.verify(hash, password)).toBe(true);
  });
});
