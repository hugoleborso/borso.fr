import { App, Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { describe, expect, it } from 'vitest';
import { StaticSite } from '../../src/constructs/static-site.js';

function synth(setup: (stack: Stack) => void): Template {
  const app = new App();
  const stack = new Stack(app, 'TestStack', {
    env: { account: '123456789012', region: 'eu-west-3' },
  });
  setup(stack);
  return Template.fromStack(stack);
}

describe('StaticSite (prod)', () => {
  const tpl = synth((stack) => {
    new StaticSite(stack, 'Site', {
      app: 'borso-fr',
      stage: 'prod',
      domainName: 'borso.fr',
      assetsPath: '.',
    });
  });

  it('creates a private S3 bucket with TLS-only access', () => {
    tpl.hasResourceProperties('AWS::S3::Bucket', {
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
      },
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
    const outputs = tpl.toJSON().Outputs ?? {};
    const values = Object.values(outputs).map((o) => (o as { Value: string }).Value);
    expect(values).toContain('https://test-app-pr-42.preview.borso.fr');
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
    const outputs = tpl.toJSON().Outputs ?? {};
    const values = Object.values(outputs).map((o) => (o as { Value: string }).Value);
    expect(values).toContain('https://bp-integ-integ-app-pr-7.preview.borso.fr');
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
