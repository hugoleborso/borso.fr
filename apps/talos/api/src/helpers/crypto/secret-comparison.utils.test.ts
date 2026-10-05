import { describe, expect, it } from 'vitest';
import { areSecretsEqual } from './secret-comparison.utils';

describe('areSecretsEqual', () => {
  it('accepts the same secret', () => {
    expect(areSecretsEqual('talos-code', 'talos-code')).toBe(true);
  });

  it('refuses a different secret of the same length', () => {
    expect(areSecretsEqual('talos-code', 'talos-cods')).toBe(false);
  });

  it('refuses a prefix of the secret without throwing on the length difference', () => {
    expect(areSecretsEqual('talos', 'talos-code')).toBe(false);
  });
});
