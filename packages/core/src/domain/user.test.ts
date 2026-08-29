import { describe, it, expect } from 'vitest';
import { createUser, updateUser, isUserActive, UserRole, UserStatus } from './user';
import { normalizeEmail, isValidEmail } from './email';
import { InvalidDomainError } from './errors';

const baseInput = {
  name: 'João Barbeiro',
  email: '  Joao.Barbeiro@BarberLab.Local ',
  passwordHash: 'argon2id-hash',
  role: UserRole.BARBER,
};

describe('User domain', () => {
  describe('email normalization', () => {
    it('normalizes email to trimmed lowercase', () => {
      const user = createUser(baseInput);
      expect(user.email).toBe('joao.barbeiro@barberlab.local');
    });

    it('detects valid emails', () => {
      expect(isValidEmail('a@b.co')).toBe(true);
      expect(isValidEmail('not-an-email')).toBe(false);
      expect(isValidEmail('')).toBe(false);
    });

    it('normalizeEmail trims and lowercases', () => {
      expect(normalizeEmail('  Foo@BAR.com  ')).toBe('foo@bar.com');
    });
  });

  describe('role validation', () => {
    it('creates a valid user with a valid role', () => {
      const user = createUser(baseInput);
      expect(user.role).toBe(UserRole.BARBER);
    });

    it('rejects an invalid role', () => {
      expect(() => createUser({ ...baseInput, role: 'SUPER_ADMIN' as UserRole })).toThrow(
        InvalidDomainError
      );
    });

    it('rejects missing name', () => {
      expect(() => createUser({ ...baseInput, name: '   ' })).toThrow(InvalidDomainError);
    });

    it('rejects missing passwordHash', () => {
      expect(() => createUser({ ...baseInput, passwordHash: '' })).toThrow(InvalidDomainError);
    });
  });

  describe('status validation', () => {
    it('defaults status to ACTIVE', () => {
      const user = createUser(baseInput);
      expect(user.status).toBe(UserStatus.ACTIVE);
    });

    it('rejects invalid status on update', () => {
      const user = createUser(baseInput);
      expect(() => updateUser(user, { status: 'BANNED' as UserStatus })).toThrow(
        InvalidDomainError
      );
    });

    it('allows setting status to INACTIVE', () => {
      const user = createUser(baseInput);
      const updated = updateUser(user, { status: UserStatus.INACTIVE });
      expect(updated.status).toBe(UserStatus.INACTIVE);
      expect(isUserActive(updated)).toBe(false);
    });

    it('considers ACTIVE user active', () => {
      expect(isUserActive(createUser(baseInput))).toBe(true);
    });
  });

  describe('invalid email', () => {
    it('rejects malformed email on create', () => {
      expect(() => createUser({ ...baseInput, email: 'nope' })).toThrow(InvalidDomainError);
    });

    it('rejects malformed email on update', () => {
      const user = createUser(baseInput);
      expect(() => updateUser(user, { email: 'nope' })).toThrow(InvalidDomainError);
    });
  });
});
