import { describe, expect, it } from 'vitest';
import { canSubmitBootstrapCode, selectAuthErrorKey, selectAuthStep } from './auth-panel.core';

describe('selectAuthStep', () => {
  it('asks for the bootstrap code before the first passkey exists', () => {
    expect(selectAuthStep(false)).toBe('register');
  });

  it('asks for the passkey once one is registered', () => {
    expect(selectAuthStep(true)).toBe('sign-in');
  });
});

describe('selectAuthErrorKey', () => {
  it('reads a missing status as a cancelled ceremony', () => {
    expect(selectAuthErrorKey(null)).toBe('auth.error.cancelled');
  });

  it('reads a refused verification', () => {
    expect(selectAuthErrorKey(400)).toBe('auth.error.refused');
    expect(selectAuthErrorKey(401)).toBe('auth.error.refused');
  });

  it('reads a wrong bootstrap code', () => {
    expect(selectAuthErrorKey(403)).toBe('auth.error.code');
  });

  it('falls back for anything else', () => {
    expect(selectAuthErrorKey(500)).toBe('auth.error.generic');
  });
});

describe('canSubmitBootstrapCode', () => {
  it('needs a code that is not blank', () => {
    expect(canSubmitBootstrapCode(' 1234 ')).toBe(true);
    expect(canSubmitBootstrapCode('  ')).toBe(false);
  });
});
