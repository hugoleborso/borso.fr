import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  requireAwsAccount,
  requireDeployStage,
  requireEnv,
  requirePrNumber,
} from '../../src/internal/env.js';

const TRACKED_ENV = ['STAGE', 'PR_NUMBER', 'CDK_DEFAULT_ACCOUNT', 'AWS_ACCOUNT_ID', 'TEST_VAR'];

describe('env helpers', () => {
  let snapshot: Record<string, string | undefined>;

  beforeEach(() => {
    snapshot = Object.fromEntries(TRACKED_ENV.map((key) => [key, process.env[key]]));
    for (const key of TRACKED_ENV) {
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of TRACKED_ENV) {
      const value = snapshot[key];
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  describe('requireEnv', () => {
    it('returns the value when set', () => {
      process.env.TEST_VAR = 'hello';
      expect(requireEnv('TEST_VAR')).toBe('hello');
    });

    it('throws with the variable name when missing', () => {
      expect(() => requireEnv('TEST_VAR')).toThrow(/TEST_VAR is required/);
    });

    it('throws when set to empty string', () => {
      process.env.TEST_VAR = '';
      expect(() => requireEnv('TEST_VAR')).toThrow(/TEST_VAR is required/);
    });
  });

  describe('requireAwsAccount', () => {
    it('reads CDK_DEFAULT_ACCOUNT when set', () => {
      process.env.CDK_DEFAULT_ACCOUNT = '123456789012';
      expect(requireAwsAccount()).toBe('123456789012');
    });

    it('falls back to AWS_ACCOUNT_ID when CDK_DEFAULT_ACCOUNT is unset', () => {
      process.env.AWS_ACCOUNT_ID = '999999999999';
      expect(requireAwsAccount()).toBe('999999999999');
    });

    it('prefers CDK_DEFAULT_ACCOUNT when both are set', () => {
      process.env.CDK_DEFAULT_ACCOUNT = '111111111111';
      process.env.AWS_ACCOUNT_ID = '222222222222';
      expect(requireAwsAccount()).toBe('111111111111');
    });

    it('throws when neither is set', () => {
      expect(() => requireAwsAccount()).toThrow(/CDK_DEFAULT_ACCOUNT.*AWS_ACCOUNT_ID/);
    });
  });

  describe('requireDeployStage', () => {
    it.each(['prod', 'preview', 'integ'] as const)('accepts %s', (stage) => {
      process.env.STAGE = stage;
      expect(requireDeployStage()).toBe(stage);
    });

    it("defaults to 'prod' when STAGE is unset", () => {
      expect(requireDeployStage()).toBe('prod');
    });

    it("rejects 'dev' (not a deployable stage)", () => {
      process.env.STAGE = 'dev';
      expect(() => requireDeployStage()).toThrow(/dev.*not deployable/);
    });

    it('rejects unknown values with the bad value in the message', () => {
      process.env.STAGE = 'staging';
      expect(() => requireDeployStage()).toThrow(/STAGE must be one of.*got 'staging'/);
    });
  });

  describe('requirePrNumber', () => {
    it('returns a positive integer', () => {
      process.env.PR_NUMBER = '42';
      expect(requirePrNumber()).toBe(42);
    });

    it('throws when missing', () => {
      expect(() => requirePrNumber()).toThrow(/PR_NUMBER is required/);
    });

    it('throws on non-integer', () => {
      process.env.PR_NUMBER = '3.14';
      expect(() => requirePrNumber()).toThrow(/positive integer/);
    });

    it('throws on non-numeric', () => {
      process.env.PR_NUMBER = 'abc';
      expect(() => requirePrNumber()).toThrow(/positive integer/);
    });

    it('throws on zero', () => {
      process.env.PR_NUMBER = '0';
      expect(() => requirePrNumber()).toThrow(/positive integer/);
    });

    it('throws on negative', () => {
      process.env.PR_NUMBER = '-5';
      expect(() => requirePrNumber()).toThrow(/positive integer/);
    });
  });
});
