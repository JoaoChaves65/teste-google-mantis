/**
 * Email normalization and validation helpers.
 *
 * Emails are normalized consistently: trimmed and lower-cased.
 */

import { InvalidDomainError } from './errors';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

export function normalizeAndValidateEmail(email: string, field = 'email'): string {
  const normalized = normalizeEmail(email);
  if (!normalized) {
    throw new InvalidDomainError(field, `${field} is required`);
  }
  if (!isValidEmail(normalized)) {
    throw new InvalidDomainError(field, `${field} must be a valid email address`);
  }
  return normalized;
}
