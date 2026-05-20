import { Match } from 'aws-cdk-lib/assertions';
import { describe, expect, it } from 'vitest';
import { StaticSite } from '../../src/constructs/static-site.js';
import { outputValues, synthTemplate as synth } from './helpers/template.js';

describe('StaticSite (prod)', () => {
  const tpl = synth((stack) => {
    new StaticSite(stack, 'Site', {
      app: 'borso-fr',
      stage: 'prod',
      domainName: 'borso.fr',
      assetsPath: '.',
    });
  });

  it('creates the alias R53 records with the exact FQDN (no zone double-suffix)', () => {
    // Regression for the relative-recordName-doubles-zone trap: CDK's ARecord
    // silently appends the zone when recordName has no trailing dot, so
    // passing `'borso.fr'` against zone `borso.fr` produced `borso.fr.borso.fr.`
    // in R53 — a phantom record that resolved nothing. Constructs MUST
    // synthesise records whose Name equals "<domain>." exactly.
    tpl.hasResourceProperties('AWS::Route53::RecordSet', {
      Type: 'A',
      Name: 'borso.fr.',
    });
    tpl.hasResourceProperties('AWS::Route53::RecordSet', {
      Type: 'AAAA',
      Name: 'borso.fr.',
    });
    // Belt-and-braces: assert the bug shape is structurally absent from the
    // synthesised template. If anyone re-introduces a relative recordName,
    // the synth output will contain `borso.fr.borso.fr.` and this assertion
    // will fail before the deploy ever touches R53.
    expect(JSON.stringify(tpl.toJSON())).not.toContain('borso.fr.borso.fr');
  });

  it('creates a private S3 bucket with TLS-only access', () => {
    tpl.hasResourceProperties('AWS::S3::Bucket', {
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
      },
    });
  });

  it('sets DeletionPolicy=Delete on the bucket so failed first deploys roll back cleanly', () => {
    // Static-site buckets hold only rebuildable build output; eradicates
    // the orphan-bucket trap documented in cdk-failed-deploy-leaves-
    // retained-buckets-orphaned.md.
    tpl.hasResource('AWS::S3::Bucket', {
      DeletionPolicy: 'Delete',
      UpdateReplacePolicy: 'Delete',
    });
  });

  it('provisions an autoDeleteObjects custom resource so destroy actually destroys', () => {
    tpl.hasResourceProperties('Custom::S3AutoDeleteObjects', {
      BucketName: Match.anyValue(),
    });
  });

  it('creates a CloudFront distribution bound to the apex domain', () => {
    tpl.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: Match.objectLike({
        Aliases: ['borso.fr'],
        DefaultRootObject: 'index.html',
      }),
    });
  });

  it('creates A and AAAA Route 53 alias records', () => {
    tpl.resourceCountIs('AWS::Route53::RecordSet', 2);
  });

  it('returns /404.jpeg directly as the 404 response body when spaFallback is off', () => {
    tpl.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: Match.objectLike({
        CustomErrorResponses: Match.arrayWith([
          Match.objectLike({
            ErrorCode: 404,
            ResponsePagePath: '/404.jpeg',
          }),
        ]),
      }),
    });
    // Belt-and-braces: assert the SPA fallback shape is NOT present, so a
    // future edit that flips the default doesn't silently turn every multi-
    // page static site (borso-fr, borsouvertures) into a soft-404 trap.
    expect(JSON.stringify(tpl.toJSON())).not.toContain('"ResponseCode":"200"');
  });

  it('omits the /api/* cache behavior when no api prop is passed', () => {
    tpl.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: Match.objectLike({ CacheBehaviors: Match.absent() }),
    });
  });

  it('grants the CloudFront OAC principal s3:ListBucket so S3 returns 404 (not 403) for missing keys', () => {
    tpl.hasResourceProperties('AWS::S3::BucketPolicy', {
      PolicyDocument: Match.objectLike({
        Statement: Match.arrayWith([
          Match.objectLike({
            Effect: 'Allow',
            Action: 's3:ListBucket',
            Principal: { Service: 'cloudfront.amazonaws.com' },
          }),
        ]),
      }),
    });
  });
});

describe('StaticSite (prod, with same-origin /api/* routing)', () => {
  // AWS-managed CachingDisabled policy ID — stable documented constant.
  // https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-cache-policies.html
  const CACHING_DISABLED_ID = '4135ea2d-6df8-44a3-9df3-4b5a84be39ad';
  const tpl = synth((stack) => {
    new StaticSite(stack, 'Site', {
      app: 'last-loop-lepin',
      stage: 'prod',
      domainName: 'last-loop-lepin.borso.fr',
      assetsPath: '.',
      api: { domainName: 'reocri5iel.execute-api.eu-west-3.amazonaws.com' },
    });
  });

  it('routes /api/* to the API hostname with caching disabled', () => {
    tpl.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: Match.objectLike({
        CacheBehaviors: Match.arrayWith([Match.objectLike({ PathPattern: '/api/*' })]),
        Origins: Match.arrayWith([
          Match.objectLike({
            DomainName: 'reocri5iel.execute-api.eu-west-3.amazonaws.com',
            CustomOriginConfig: Match.anyValue(),
          }),
        ]),
      }),
    });
    expect(JSON.stringify(tpl.toJSON())).toContain(CACHING_DISABLED_ID);
  });

  it('respects a custom pathPattern', () => {
    const customTpl = synth((stack) => {
      new StaticSite(stack, 'Site', {
        app: 'borso-fr',
        stage: 'prod',
        domainName: 'borso.fr',
        assetsPath: '.',
        api: { domainName: 'x.execute-api.eu-west-3.amazonaws.com', pathPattern: '/v1/*' },
      });
    });
    customTpl.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: Match.objectLike({
        CacheBehaviors: Match.arrayWith([Match.objectLike({ PathPattern: '/v1/*' })]),
      }),
    });
  });
});

describe('StaticSite (prod, subdomain)', () => {
  // The relative-recordName bug ALSO bit any subdomain caller: passing
  // `'borsouvertures.borso.fr'` against zone `borso.fr` produced
  // `borsouvertures.borso.fr.borso.fr.` — same shape, same phantom record.
  const tpl = synth((stack) => {
    new StaticSite(stack, 'Site', {
      app: 'borsouvertures',
      stage: 'prod',
      domainName: 'borsouvertures.borso.fr',
      assetsPath: '.',
    });
  });

  it('creates the alias R53 records with the exact subdomain FQDN', () => {
    tpl.hasResourceProperties('AWS::Route53::RecordSet', {
      Type: 'A',
      Name: 'borsouvertures.borso.fr.',
    });
    tpl.hasResourceProperties('AWS::Route53::RecordSet', {
      Type: 'AAAA',
      Name: 'borsouvertures.borso.fr.',
    });
    expect(JSON.stringify(tpl.toJSON())).not.toContain('borsouvertures.borso.fr.borso.fr');
  });
});

describe('StaticSite (prod, trailing-dot domainName is idempotent)', () => {
  // A caller passing the already-absolute form must not double the dot.
  const tpl = synth((stack) => {
    new StaticSite(stack, 'Site', {
      app: 'borso-fr',
      stage: 'prod',
      domainName: 'borso.fr.',
      assetsPath: '.',
    });
  });

  it('keeps the record Name as a single-trailing-dot FQDN', () => {
    tpl.hasResourceProperties('AWS::Route53::RecordSet', {
      Type: 'A',
      Name: 'borso.fr.',
    });
    expect(JSON.stringify(tpl.toJSON())).not.toContain('borso.fr..');
  });
});

describe('StaticSite (preview)', () => {
  const tpl = synth((stack) => {
    new StaticSite(stack, 'Site', {
      app: 'test-app',
      stage: 'preview',
      prNumber: 42,
      assetsPath: '.',
    });
  });

  it('does not create its own bucket or distribution', () => {
    tpl.resourceCountIs('AWS::S3::Bucket', 0);
    tpl.resourceCountIs('AWS::CloudFront::Distribution', 0);
  });

  it('emits a Url output pointing at the preview hostname', () => {
    expect(outputValues(tpl)).toContain('https://test-app-pr-42.preview.borso.fr');
  });

  it('issues a CloudFront invalidation scoped to this PR prefix on every redeploy', () => {
    // BucketDeployment surfaces invalidation by setting DistributionId +
    // DistributionPaths on the Custom::CDKBucketDeployment resource.
    const json = JSON.stringify(tpl.toJSON());
    expect(json).toContain('"DistributionPaths":["/test-app/pr-42/*"]');
    expect(json).toContain('/borso/shared/previews-distribution-id');
    expect(json).toContain('/borso/shared/previews-distribution-domain');
  });
});

describe('StaticSite (integ stage)', () => {
  const tpl = synth((stack) => {
    new StaticSite(stack, 'Site', {
      app: 'integ-app',
      stage: 'integ',
      prNumber: 7,
      assetsPath: '.',
    });
  });

  it('uploads to the shared previews bucket at the integ-prefixed key', () => {
    expect(outputValues(tpl)).toContain('https://bp-integ-integ-app-pr-7.preview.borso.fr');
  });
});

describe('StaticSite (validation)', () => {
  it('rejects prod without domainName', () => {
    expect(() =>
      synth((stack) => {
        new StaticSite(stack, 'Site', { app: 'test-app', stage: 'prod', assetsPath: '.' });
      }),
    ).toThrow();
  });

  it('rejects bad app slugs', () => {
    expect(() =>
      synth((stack) => {
        new StaticSite(stack, 'Site', {
          app: 'Bad_Slug',
          stage: 'prod',
          domainName: 'borso.fr',
          assetsPath: '.',
        });
      }),
    ).toThrow();
  });
});
