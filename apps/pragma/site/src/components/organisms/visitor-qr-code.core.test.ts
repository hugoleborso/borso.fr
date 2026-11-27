import { describe, expect, it } from 'vitest';
import { buildVisitorQrCodeAddress } from './visitor-qr-code.core';

// @FollowsBlueprint test-pure-unit
describe('buildVisitorQrCodeAddress', () => {
  it('encodes the concert sign-up page at the root and shows only the host', () => {
    expect(buildVisitorQrCodeAddress('https://pragma.borso.fr')).toEqual({
      encoded: 'https://pragma.borso.fr/',
      shown: 'pragma.borso.fr',
    });
  });

  it('keeps the port of a local or preview origin in both', () => {
    expect(buildVisitorQrCodeAddress('http://localhost:5173')).toEqual({
      encoded: 'http://localhost:5173/',
      shown: 'localhost:5173',
    });
  });
});
