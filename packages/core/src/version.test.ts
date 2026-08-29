import { describe, it, expect } from 'vitest';
import { version } from './version';

describe('core version', () => {
  it('should have a version', () => {
    expect(version).toBeDefined();
    expect(typeof version).toBe('string');
  });
});
