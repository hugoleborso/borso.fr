import { describe, expect, it } from 'vitest';
import {
  assertDeployStage,
  bucketName,
  dsqlSchemaName,
  lambdaFunctionName,
  previewHostname,
  previewS3Prefix,
  stackName,
  validateAppSlug,
} from '../../src/internal/naming.js';

describe('validateAppSlug', () => {
  it.each(['borso-fr', 'pragma', 'app1', 'a-b-c'])('accepts %s', (slug) => {
    expect(() => validateAppSlug(slug)).not.toThrow();
  });

  it.each(['Borso', 'borso_fr', '-borso', '1borso', 'a..b', ''])('rejects %s', (slug) => {
    expect(() => validateAppSlug(slug)).toThrow();
  });

  it('rejects slugs over 32 chars', () => {
    expect(() => validateAppSlug('a'.repeat(33))).toThrow();
  });
});

describe('assertDeployStage', () => {
  it.each(['prod', 'preview', 'integ'] as const)('passes %s through', (s) => {
    expect(() => assertDeployStage(s)).not.toThrow();
  });

  it('rejects "dev"', () => {
    expect(() => assertDeployStage('dev')).toThrow(/dev.*not deployable/);
  });
});

describe('stackName', () => {
  it('builds prod stack names', () => {
    expect(stackName({ app: 'borso-fr', stage: 'prod' })).toBe('borso-fr-prod');
  });

  it('builds preview stack names', () => {
    expect(stackName({ app: 'pragma', stage: 'preview', prNumber: 7 })).toBe('pragma-pr-7');
  });

  it('builds integ stack names', () => {
    expect(stackName({ app: 'pragma', stage: 'integ', prNumber: 42 })).toBe(
      'bp-integ-pr-42-pragma',
    );
  });

  it('requires prNumber for non-prod stages', () => {
    expect(() => stackName({ app: 'pragma', stage: 'preview' })).toThrow();
    expect(() => stackName({ app: 'pragma', stage: 'integ' })).toThrow();
  });
});

describe('bucketName', () => {
  it('includes account + region for global uniqueness', () => {
    expect(bucketName({ app: 'borso-fr', stage: 'prod' }, 'eu-west-3', '123')).toBe(
      'borso-fr-prod-eu-west-3-123',
    );
  });

  it('uses pr suffix for preview', () => {
    expect(bucketName({ app: 'pragma', stage: 'preview', prNumber: 3 }, 'eu-west-3', '123')).toBe(
      'pragma-pr-3-eu-west-3-123',
    );
  });

  it('prepends bp-integ- for integ stage', () => {
    expect(bucketName({ app: 'pragma', stage: 'integ', prNumber: 3 }, 'eu-west-3', '123')).toBe(
      'bp-integ-pragma-pr-3-eu-west-3-123',
    );
  });
});

describe('lambdaFunctionName', () => {
  it('builds names per convention', () => {
    expect(lambdaFunctionName({ app: 'pragma', stage: 'prod' }, 'health')).toBe(
      'pragma-prod-health',
    );
  });

  it('uses pr suffix for preview', () => {
    expect(lambdaFunctionName({ app: 'pragma', stage: 'preview', prNumber: 4 }, 'health')).toBe(
      'pragma-pr-4-health',
    );
  });
});

describe('dsqlSchemaName', () => {
  it('underscores app slugs', () => {
    expect(dsqlSchemaName({ app: 'borso-fr', stage: 'prod' })).toBe('borso_fr');
  });

  it('appends pr suffix for preview', () => {
    expect(dsqlSchemaName({ app: 'pragma', stage: 'preview', prNumber: 9 })).toBe('pragma_pr_9');
  });

  it('prefixes integ schemas', () => {
    expect(dsqlSchemaName({ app: 'pragma', stage: 'integ', prNumber: 9 })).toBe(
      'integ_pr_9_pragma',
    );
  });

  it('throws when preview/integ omits prNumber', () => {
    expect(() => dsqlSchemaName({ app: 'pragma', stage: 'preview' })).toThrow();
    expect(() => dsqlSchemaName({ app: 'pragma', stage: 'integ' })).toThrow();
  });
});

describe('previewHostname / previewS3Prefix', () => {
  it('hostname for preview', () => {
    expect(previewHostname({ app: 'pragma', stage: 'preview', prNumber: 5 })).toBe(
      'pragma-pr-5.preview.borso.fr',
    );
  });

  it('hostname for integ', () => {
    expect(previewHostname({ app: 'pragma', stage: 'integ', prNumber: 5 })).toBe(
      'bp-integ-pragma-pr-5.preview.borso.fr',
    );
  });

  it('throws for prod stage', () => {
    expect(() => previewHostname({ app: 'pragma', stage: 'prod' })).toThrow();
  });

  it('s3 prefix mirrors hostname', () => {
    expect(previewS3Prefix({ app: 'pragma', stage: 'preview', prNumber: 5 })).toBe('pragma/pr-5');
    expect(previewS3Prefix({ app: 'pragma', stage: 'integ', prNumber: 5 })).toBe(
      'bp-integ/pragma/pr-5',
    );
  });

  it('previewS3Prefix throws for prod stage', () => {
    expect(() => previewS3Prefix({ app: 'pragma', stage: 'prod' })).toThrow();
  });

  it('rejects non-integer or non-positive prNumber', () => {
    expect(() => stackName({ app: 'pragma', stage: 'preview', prNumber: 0 })).toThrow();
    expect(() => stackName({ app: 'pragma', stage: 'preview', prNumber: 1.5 })).toThrow();
  });

  it('rejects bad handler names in lambdaFunctionName', () => {
    expect(() => lambdaFunctionName({ app: 'pragma', stage: 'prod' }, 'Bad_Handler')).toThrow();
  });
});
