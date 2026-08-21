import type { Stack } from 'aws-cdk-lib';
import { Match } from 'aws-cdk-lib/assertions';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { describe, expect, it } from 'vitest';
import { PhotosCdn } from '../../src/constructs/photos-cdn.js';
import { synthTemplate as synth } from './helpers/template.js';

function buildBucket(stack: Stack): Bucket {
  return new Bucket(stack, 'PhotosBucket', { bucketName: 'test-app-prod-photos' });
}

/**
 * @Blueprint test-cdk-synth
 * @BlueprintName Construct Synthesis Test
 * @BlueprintUsage Use for every CDK construct. Synthesise once per stage, then assert on the CloudFormation template.
 * @BlueprintDescription Synthesises the construct into a throwaway stack through the shared `synthTemplate` helper and asserts on the template rather than on the construct object, so the test checks what CloudFormation will actually receive. One describe per stage keeps a single synth shared by its cases, and the suite covers three things a template assertion is uniquely good at: the resources that must exist, the shapes that must be absent (`Match.absent()`, a `not.toContain` on the serialised template), and the props the construct must refuse, including the development stage every construct rejects.
 */
describe('PhotosCdn (prod)', () => {
  const tpl = synth((stack) => {
    new PhotosCdn(stack, 'PhotosCdn', {
      app: 'test-app',
      stage: 'prod',
      bucket: buildBucket(stack),
      hostname: 'photos-cdn.borso.fr',
    });
  });

  it('creates exactly one CloudFront distribution bound to the photos hostname', () => {
    tpl.resourceCountIs('AWS::CloudFront::Distribution', 1);
    tpl.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: Match.objectLike({
        Aliases: ['photos-cdn.borso.fr'],
      }),
    });
  });

  it('attaches an OriginAccessControl for private-bucket reads', () => {
    tpl.resourceCountIs('AWS::CloudFront::OriginAccessControl', 1);
  });

  it('creates a cache policy with the 24h TTL the spec mandates', () => {
    tpl.hasResourceProperties('AWS::CloudFront::CachePolicy', {
      CachePolicyConfig: Match.objectLike({
        DefaultTTL: 86_400,
        MaxTTL: 86_400,
        MinTTL: 0,
      }),
    });
  });

  it('creates A and AAAA Route 53 alias records with the exact FQDN (no zone double-suffix)', () => {
    tpl.resourceCountIs('AWS::Route53::RecordSet', 2);
    tpl.hasResourceProperties('AWS::Route53::RecordSet', {
      Type: 'A',
      Name: 'photos-cdn.borso.fr.',
    });
    tpl.hasResourceProperties('AWS::Route53::RecordSet', {
      Type: 'AAAA',
      Name: 'photos-cdn.borso.fr.',
    });
  });

  it('reads the prod cert ARN from the *.borso.fr SSM parameter', () => {
    const json = JSON.stringify(tpl.toJSON());
    expect(json).toContain('/borso/shared/cert-borso-fr-arn');
  });

  it('does NOT create its own S3 bucket (bucket lifecycle stays with the caller)', () => {
    tpl.resourceCountIs('AWS::S3::Bucket', 1);
  });
});

describe('PhotosCdn (preview)', () => {
  const tpl = synth((stack) => {
    new PhotosCdn(stack, 'PhotosCdn', {
      app: 'test-app',
      stage: 'preview',
      prNumber: 42,
      bucket: buildBucket(stack),
      hostname: 'test-app-pr-42-photos.preview.borso.fr',
    });
  });

  it('binds to the per-PR hostname', () => {
    tpl.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: Match.objectLike({
        Aliases: ['test-app-pr-42-photos.preview.borso.fr'],
      }),
    });
  });

  it('reads the preview cert ARN from the *.preview.borso.fr SSM parameter', () => {
    const json = JSON.stringify(tpl.toJSON());
    expect(json).toContain('/borso/shared/cert-preview-borso-fr-arn');
    expect(json).not.toContain('/borso/shared/cert-borso-fr-arn');
  });

  it('creates A and AAAA records with the per-PR FQDN', () => {
    tpl.hasResourceProperties('AWS::Route53::RecordSet', {
      Type: 'A',
      Name: 'test-app-pr-42-photos.preview.borso.fr.',
    });
  });

  it('names the cache policy with the per-PR suffix to avoid collisions across previews', () => {
    tpl.hasResourceProperties('AWS::CloudFront::CachePolicy', {
      CachePolicyConfig: Match.objectLike({
        Name: 'test-app-preview-photos-pr-42',
      }),
    });
  });
});

describe('PhotosCdn (idempotent trailing-dot hostname)', () => {
  const tpl = synth((stack) => {
    new PhotosCdn(stack, 'PhotosCdn', {
      app: 'test-app',
      stage: 'prod',
      bucket: buildBucket(stack),
      hostname: 'photos-cdn.borso.fr.',
    });
  });

  it('keeps the record Name as a single-trailing-dot FQDN', () => {
    tpl.hasResourceProperties('AWS::Route53::RecordSet', {
      Type: 'A',
      Name: 'photos-cdn.borso.fr.',
    });
    expect(JSON.stringify(tpl.toJSON())).not.toContain('photos-cdn.borso.fr..');
  });
});

describe('PhotosCdn (validation)', () => {
  it('rejects bad app slugs', () => {
    expect(() =>
      synth((stack) => {
        new PhotosCdn(stack, 'PhotosCdn', {
          app: 'Bad_Slug',
          stage: 'prod',
          bucket: buildBucket(stack),
          hostname: 'photos-cdn.borso.fr',
        });
      }),
    ).toThrow();
  });

  it('rejects stage="dev"', () => {
    expect(() =>
      synth((stack) => {
        new PhotosCdn(stack, 'PhotosCdn', {
          app: 'test-app',
          stage: 'dev',
          bucket: buildBucket(stack),
          hostname: 'photos-cdn.borso.fr',
        });
      }),
    ).toThrow();
  });
});
