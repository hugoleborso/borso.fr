import { describe, expect, it } from 'vitest';
import {
  decidePasskeyRemoval,
  decideRegistrationAccess,
  isSecureCookieStage,
  selectExpectedOrigins,
} from './auth.core';

describe('decideRegistrationAccess', () => {
  it('asks for the bootstrap code while no passkey exists, signed in or not', () => {
    expect(decideRegistrationAccess({ hasPasskey: false, isSignedIn: false })).toBe(
      'bootstrap-code',
    );
    expect(decideRegistrationAccess({ hasPasskey: false, isSignedIn: true })).toBe(
      'bootstrap-code',
    );
  });

  it('lets a signed-in session add a second passkey', () => {
    expect(decideRegistrationAccess({ hasPasskey: true, isSignedIn: true })).toBe('session');
  });

  it('closes registration to anyone else once a passkey exists', () => {
    expect(decideRegistrationAccess({ hasPasskey: true, isSignedIn: false })).toBe('closed');
  });
});

describe('selectExpectedOrigins', () => {
  it('accepts only the https origin of the relying party in production', () => {
    expect(selectExpectedOrigins('talos.borso.fr', 'prod')).toEqual(['https://talos.borso.fr']);
  });

  it('also accepts the local site during development', () => {
    expect(selectExpectedOrigins('localhost', 'dev')).toEqual([
      'https://localhost',
      'http://localhost:5180',
    ]);
  });
});

describe('isSecureCookieStage', () => {
  it('marks the cookie secure everywhere but on a laptop', () => {
    expect(isSecureCookieStage('prod')).toBe(true);
    expect(isSecureCookieStage(undefined)).toBe(true);
    expect(isSecureCookieStage('dev')).toBe(false);
  });
});

describe('decidePasskeyRemoval', () => {
  it('removes a known passkey while another one remains', () => {
    expect(decidePasskeyRemoval({ passkeyCount: 2, isKnown: true })).toBe('removable');
  });

  it('keeps the last passkey, so the owner can still sign in', () => {
    expect(decidePasskeyRemoval({ passkeyCount: 1, isKnown: true })).toBe('last');
  });

  it('reports a passkey nobody registered', () => {
    expect(decidePasskeyRemoval({ passkeyCount: 2, isKnown: false })).toBe('not-found');
  });
});
