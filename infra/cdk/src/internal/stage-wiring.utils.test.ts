import { describe, expect, it } from 'vitest';
import {
  ALLOW_TEST_SEED_ENV_VAR,
  selectSameOriginApiDomainName,
  selectTestSeedEnvironment,
} from './stage-wiring.utils.js';

// @FollowsBlueprint test-pure-unit
describe('selectTestSeedEnvironment', () => {
  it('gives prod nothing, so the seed route cannot mount there', () => {
    expect(selectTestSeedEnvironment('prod')).toStrictEqual({});
  });

  it('sets the flag on every disposable environment', () => {
    expect(selectTestSeedEnvironment('preview')).toStrictEqual({ [ALLOW_TEST_SEED_ENV_VAR]: '1' });
    expect(selectTestSeedEnvironment('integ')).toStrictEqual({ [ALLOW_TEST_SEED_ENV_VAR]: '1' });
  });
});

describe('selectSameOriginApiDomainName', () => {
  it('routes prod through the frontend distribution', () => {
    expect(selectSameOriginApiDomainName('prod', 'api.borso.fr')).toBe('api.borso.fr');
  });

  it('leaves preview and integ cross-origin', () => {
    expect(selectSameOriginApiDomainName('preview', 'api.borso.fr')).toBeUndefined();
    expect(selectSameOriginApiDomainName('integ', 'api.borso.fr')).toBeUndefined();
  });
});
