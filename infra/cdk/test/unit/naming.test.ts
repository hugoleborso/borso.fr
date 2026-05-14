import { describe, expect, it } from 'vitest';
import {
  assertDeployStage,
  bucketName,
  dsqlSchemaName,
  lambdaFunctionName,
  previewApiHostname,
  previewHostname,
  previewS3Prefix,
  stackName,
  validateAppSlug,
} from '../../src/internal/naming.js';

describe('validateAppSlug', () => {
  it.each(['borso-fr', 'test-app', 'app1', 'a-b-c'])('accepts %s', (slug) => {
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
    expect(stackName({ app: 'test-app', stage: 'preview', prNumber: 7 })).toBe('test-app-pr-7');
  });

  it('builds integ stack names', () => {
    expect(stackName({ app: 'test-app', stage: 'integ', prNumber: 42 })).toBe(
      'bp-integ-pr-42-test-app',
    );
  });

  it('requires prNumber for non-prod stages', () => {
    expect(() => stackName({ app: 'test-app', stage: 'preview' })).toThrow();
    expect(() => stackName({ app: 'test-app', stage: 'integ' })).toThrow();
  });
});

describe('bucketName', () => {
  it('builds prod bucket names', () => {
    expect(bucketName({ app: 'borso-fr', stage: 'prod' })).toBe('borso-fr-prod');
  });

  it('uses pr suffix for preview', () => {
    expect(bucketName({ app: 'test-app', stage: 'preview', prNumber: 3 })).toBe('test-app-pr-3');
  });

  it('prepends bp-integ- for integ stage', () => {
    expect(bucketName({ app: 'test-app', stage: 'integ', prNumber: 3 })).toBe(
      'bp-integ-test-app-pr-3',
    );
  });
});

describe('lambdaFunctionName', () => {
  it('builds names per convention', () => {
    expect(lambdaFunctionName({ app: 'test-app', stage: 'prod' }, 'health')).toBe(
      'test-app-prod-health',
    );
  });

  it('uses pr suffix for preview', () => {
    expect(lambdaFunctionName({ app: 'test-app', stage: 'preview', prNumber: 4 }, 'health')).toBe(
      'test-app-pr-4-health',
    );
  });
});

describe('dsqlSchemaName', () => {
  it('returns "prod" for the prod stage (cluster is per-app, no app prefix)', () => {
    expect(dsqlSchemaName({ app: 'borso-fr', stage: 'prod' })).toBe('prod');
  });

  it('returns pr_<n> for preview', () => {
    expect(dsqlSchemaName({ app: 'test-app', stage: 'preview', prNumber: 9 })).toBe('pr_9');
  });

  it('returns integ_<n> for integ', () => {
    expect(dsqlSchemaName({ app: 'test-app', stage: 'integ', prNumber: 9 })).toBe('integ_9');
  });

  it('throws when preview/integ omits prNumber', () => {
    expect(() => dsqlSchemaName({ app: 'test-app', stage: 'preview' })).toThrow();
    expect(() => dsqlSchemaName({ app: 'test-app', stage: 'integ' })).toThrow();
  });
});

describe('previewHostname / previewS3Prefix', () => {
  it('hostname for preview', () => {
    expect(previewHostname({ app: 'test-app', stage: 'preview', prNumber: 5 })).toBe(
      'test-app-pr-5.preview.borso.fr',
    );
  });

  it('hostname for integ', () => {
    expect(previewHostname({ app: 'test-app', stage: 'integ', prNumber: 5 })).toBe(
      'bp-integ-test-app-pr-5.preview.borso.fr',
    );
  });

  it('throws for prod stage', () => {
    expect(() => previewHostname({ app: 'test-app', stage: 'prod' })).toThrow();
  });

  it('s3 prefix mirrors hostname', () => {
    expect(previewS3Prefix({ app: 'test-app', stage: 'preview', prNumber: 5 })).toBe('test-app/pr-5');
    expect(previewS3Prefix({ app: 'test-app', stage: 'integ', prNumber: 5 })).toBe(
      'bp-integ/test-app/pr-5',
    );
  });

  it('previewS3Prefix throws for prod stage', () => {
    expect(() => previewS3Prefix({ app: 'test-app', stage: 'prod' })).toThrow();
  });

  it('api hostname mirrors frontend hostname with -api suffix', () => {
    expect(previewApiHostname({ app: 'test-app', stage: 'preview', prNumber: 5 })).toBe(
      'test-app-pr-5-api.preview.borso.fr',
    );
    expect(previewApiHostname({ app: 'test-app', stage: 'integ', prNumber: 5 })).toBe(
      'bp-integ-test-app-pr-5-api.preview.borso.fr',
    );
  });

  it('previewApiHostname throws for prod stage', () => {
    expect(() => previewApiHostname({ app: 'test-app', stage: 'prod' })).toThrow();
  });

  it('rejects non-integer or non-positive prNumber', () => {
    expect(() => stackName({ app: 'test-app', stage: 'preview', prNumber: 0 })).toThrow();
    expect(() => stackName({ app: 'test-app', stage: 'preview', prNumber: 1.5 })).toThrow();
  });

  it('rejects bad handler names in lambdaFunctionName', () => {
    expect(() => lambdaFunctionName({ app: 'test-app', stage: 'prod' }, 'Bad_Handler')).toThrow();
  });
});
