import { describe, expect, it } from 'vitest';
import {
  accountScopedBucketName,
  assertDeployStage,
  bucketName,
  dsqlClusterSsmPaths,
  dsqlSchemaName,
  lambdaFunctionName,
  frontendOrigin,
  isProductionStage,
  previewApiHostname,
  previewHostname,
  previewS3Prefix,
  stackName,
  validateAppSlug,
} from './naming.utils.js';

// @FollowsBlueprint test-pure-unit
describe('validateAppSlug', () => {
  it.each(['borso-fr', 'test-app', 'app1', 'a-b-c'])('accepts %s', (slug) => {
    expect(() => validateAppSlug(slug)).not.toThrow();
  });

  it.each(['Borso', 'borso_fr', '-borso', '1borso', 'a..b', ''])('rejects %s', (slug) => {
    expect(() => validateAppSlug(slug)).toThrow(
      /must be lowercase kebab-case, start with a letter/,
    );
  });

  it('names the slug it rejected, since the caller passes several', () => {
    expect(() => validateAppSlug('Borso')).toThrow(/"Borso"/);
  });

  it('rejects slugs over 32 chars', () => {
    expect(() => validateAppSlug('a'.repeat(33))).toThrow(/exceeds 32 characters/);
  });

  it('accepts a slug of exactly 32 chars', () => {
    expect(() => validateAppSlug('a'.repeat(32))).not.toThrow();
  });
});

describe('isProductionStage', () => {
  it('accepts the one long-lived environment', () => {
    expect(isProductionStage('prod')).toBe(true);
  });

  it('rejects every disposable environment, and the app-code marker', () => {
    expect(isProductionStage('preview')).toBe(false);
    expect(isProductionStage('integ')).toBe(false);
    expect(isProductionStage('dev')).toBe(false);
  });
});

describe('assertDeployStage', () => {
  it.each(['prod', 'preview', 'integ'] as const)('passes %s through', (stage) => {
    expect(() => assertDeployStage(stage)).not.toThrow();
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
    expect(() => stackName({ app: 'test-app', stage: 'preview' })).toThrow(
      /preview\/integ stage requires prNumber/,
    );
    expect(() => stackName({ app: 'test-app', stage: 'integ' })).toThrow(
      /preview\/integ stage requires prNumber/,
    );
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

describe('accountScopedBucketName', () => {
  const ACCOUNT_ID = '123456789012';

  it('appends the account id to the stage bucket name', () => {
    expect(accountScopedBucketName({ app: 'talos', stage: 'prod' }, ACCOUNT_ID)).toBe(
      'talos-prod-123456789012',
    );
  });

  it('keeps the preview and integ prefixes of bucketName', () => {
    expect(
      accountScopedBucketName({ app: 'test-app', stage: 'integ', prNumber: 3 }, ACCOUNT_ID),
    ).toBe('bp-integ-test-app-pr-3-123456789012');
  });

  it.each(['12345678901', '1234567890123', '12345678901a', 'x123456789012', '123456789012x', ''])(
    'rejects the account id %s',
    (accountId) => {
      expect(() => accountScopedBucketName({ app: 'talos', stage: 'prod' }, accountId)).toThrow(
        `Account id "${accountId}" is not a 12-digit AWS account id; set env.account on the stack.`,
      );
    },
  );

  it('accepts a name of exactly 63 characters, the S3 maximum', () => {
    const name = accountScopedBucketName(
      { app: 'a'.repeat(32), stage: 'integ', prNumber: 12345 },
      ACCOUNT_ID,
    );
    expect(name).toHaveLength(63);
  });

  it('rejects a name over 63 characters', () => {
    const name = `bp-integ-${'a'.repeat(32)}-pr-123456-${ACCOUNT_ID}`;
    expect(() =>
      accountScopedBucketName(
        { app: 'a'.repeat(32), stage: 'integ', prNumber: 123456 },
        ACCOUNT_ID,
      ),
    ).toThrow(`Bucket name "${name}" exceeds the 63 characters S3 allows.`);
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
    expect(() => dsqlSchemaName({ app: 'test-app', stage: 'preview' })).toThrow(
      /preview stage requires prNumber/,
    );
    expect(() => dsqlSchemaName({ app: 'test-app', stage: 'integ' })).toThrow(
      /integ stage requires prNumber/,
    );
  });
});

describe('dsqlClusterSsmPaths', () => {
  it('names one parameter per cluster attribute, under the app that owns it', () => {
    expect(dsqlClusterSsmPaths('test-app')).toStrictEqual({
      arn: '/borso/test-app/dsql-cluster-arn',
      endpoint: '/borso/test-app/dsql-cluster-endpoint',
    });
  });

  it('rejects an app slug that is not one', () => {
    expect(() => dsqlClusterSsmPaths('Test_App')).toThrow(/Invalid app slug/);
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
    expect(() => previewHostname({ app: 'test-app', stage: 'prod' })).toThrow(
      /previewHostname\(\) is not for prod stage/,
    );
  });

  it('s3 prefix mirrors hostname', () => {
    expect(previewS3Prefix({ app: 'test-app', stage: 'preview', prNumber: 5 })).toBe(
      'test-app/pr-5',
    );
    expect(previewS3Prefix({ app: 'test-app', stage: 'integ', prNumber: 5 })).toBe(
      'bp-integ/test-app/pr-5',
    );
  });

  it('previewS3Prefix throws for prod stage', () => {
    expect(() => previewS3Prefix({ app: 'test-app', stage: 'prod' })).toThrow(
      /previewS3Prefix\(\) is not for prod stage/,
    );
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
    expect(() => previewApiHostname({ app: 'test-app', stage: 'prod' })).toThrow(
      /previewApiHostname\(\) is not for prod stage/,
    );
  });

  it('rejects non-integer or non-positive prNumber', () => {
    expect(() => stackName({ app: 'test-app', stage: 'preview', prNumber: 0 })).toThrow(
      /prNumber must be a positive integer, got 0/,
    );
    expect(() => stackName({ app: 'test-app', stage: 'preview', prNumber: 1.5 })).toThrow(
      /prNumber must be a positive integer, got 1.5/,
    );
  });

  it('rejects bad handler names in lambdaFunctionName', () => {
    expect(() => lambdaFunctionName({ app: 'test-app', stage: 'prod' }, 'Bad_Handler')).toThrow(
      /Invalid app slug "Bad_Handler"/,
    );
  });
});

describe('frontendOrigin', () => {
  it('uses the application domain for prod', () => {
    expect(frontendOrigin({ app: 'test-app', stage: 'prod' }, 'test-app.borso.fr')).toBe(
      'https://test-app.borso.fr',
    );
  });

  it('throws for prod without a domain, since there is nothing to accept', () => {
    expect(() => frontendOrigin({ app: 'test-app', stage: 'prod' }, undefined)).toThrow(
      /frontendOrigin\(\) requires domainName for the prod stage/,
    );
  });

  it('uses the preview hostname for preview and integ', () => {
    expect(
      frontendOrigin({ app: 'test-app', stage: 'preview', prNumber: 5 }, 'test-app.borso.fr'),
    ).toBe('https://test-app-pr-5.preview.borso.fr');
    expect(frontendOrigin({ app: 'test-app', stage: 'integ', prNumber: 5 }, undefined)).toBe(
      'https://bp-integ-test-app-pr-5.preview.borso.fr',
    );
  });
});
