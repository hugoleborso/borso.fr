import { App, Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { Certificate } from 'aws-cdk-lib/aws-certificatemanager';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { HOSTED_ZONE_NAME } from '../../lib/certs-stack.js';
import { SharedStack } from '../../lib/shared-stack.js';
import { isObject, resourcesOfType } from './helpers/template.js';

function synth(opts?: { budgetEmail?: string }): Template {
  const app = new App();
  app.node.setContext(`hosted-zone:account=123456789012:domainName=${HOSTED_ZONE_NAME}:region=eu-west-3`, {
    Id: '/hostedzone/Z1FAKE',
    Name: `${HOSTED_ZONE_NAME}.`,
  });
  // Stub certificates — real ones live in the us-east-1 CertsStack.
  const certStack = new Stack(app, 'CertsStub', {
    env: { account: '123456789012', region: 'us-east-1' },
  });
  const borsoFrCert = Certificate.fromCertificateArn(
    certStack,
    'BorsoFrCert',
    'arn:aws:acm:us-east-1:123456789012:certificate/aaaa',
  );
  const previewCert = Certificate.fromCertificateArn(
    certStack,
    'PreviewCert',
    'arn:aws:acm:us-east-1:123456789012:certificate/bbbb',
  );

  const stack = new SharedStack(app, 'borso-shared', {
    env: { account: '123456789012', region: 'eu-west-3' },
    crossRegionReferences: true,
    borsoFrCert,
    previewCert,
    ...(opts?.budgetEmail !== undefined ? { budgetEmail: opts.budgetEmail } : {}),
  });
  return Template.fromStack(stack);
}

describe('SharedStack', () => {
  describe('OIDC + roles', () => {
    const tpl = synth({ budgetEmail: 'hugo@example.com' });

    it('creates exactly one GitHub OIDC provider (CDK custom resource)', () => {
      tpl.resourceCountIs('Custom::AWSCDKOpenIdConnectProvider', 1);
      const json = JSON.stringify(tpl.toJSON());
      expect(json).toContain('https://token.actions.githubusercontent.com');
      expect(json).toContain('sts.amazonaws.com');
    });

    it('creates ProdDeployRole pinned to repo:hugoleborso/borso.fr:environment:prod', () => {
      tpl.hasResourceProperties('AWS::IAM::Role', {
        RoleName: 'ProdDeployRole',
      });
      const json = JSON.stringify(tpl.toJSON());
      expect(json).toContain('repo:hugoleborso/borso.fr:environment:prod');
    });

    it('creates PreviewDeployRole pinned to repo:hugoleborso/borso.fr:pull_request', () => {
      tpl.hasResourceProperties('AWS::IAM::Role', {
        RoleName: 'PreviewDeployRole',
      });
      const json = JSON.stringify(tpl.toJSON());
      expect(json).toContain('repo:hugoleborso/borso.fr:pull_request');
    });

    it('creates SharedInfraDeployRole pinned to repo:hugoleborso/borso.fr:environment:prod-shared', () => {
      tpl.hasResourceProperties('AWS::IAM::Role', {
        RoleName: 'SharedInfraDeployRole',
      });
      const json = JSON.stringify(tpl.toJSON());
      expect(json).toContain('repo:hugoleborso/borso.fr:environment:prod-shared');
    });

    it('does NOT create an IntegTestRole (dropped vs upstream)', () => {
      const ids = Object.keys(tpl.toJSON().Resources ?? {}).filter((id) =>
        id.includes('IntegTestRole'),
      );
      expect(ids).toEqual([]);
      tpl.resourcePropertiesCountIs('AWS::IAM::Role', { RoleName: 'IntegTestRole' }, 0);
    });

    it('PreviewDeployRole has dsql connect permissions', () => {
      const policies = resourcesOfType(tpl, 'AWS::IAM::Policy');
      const hasDsql = policies.some((policy) => {
        const policyDoc = policy.Properties?.PolicyDocument;
        if (!isObject(policyDoc) || !Array.isArray(policyDoc.Statement)) return false;
        return policyDoc.Statement.some((statement) => {
          if (!isObject(statement)) return false;
          const action = Array.isArray(statement.Action) ? statement.Action : [statement.Action];
          return action.includes('dsql:DbConnect') || action.includes('dsql:DbConnectAdmin');
        });
      });
      expect(hasDsql).toBe(true);
    });
  });

  describe('previews CDN', () => {
    const tpl = synth({ budgetEmail: 'hugo@example.com' });

    it('creates the previews bucket with public access blocked + 60-day expiry', () => {
      tpl.hasResourceProperties('AWS::S3::Bucket', {
        BucketName: Match.stringLikeRegexp('borso-previews-'),
        PublicAccessBlockConfiguration: Match.objectLike({
          BlockPublicAcls: true,
        }),
        LifecycleConfiguration: Match.objectLike({
          Rules: Match.arrayWith([
            Match.objectLike({ ExpirationInDays: 60, Status: 'Enabled' }),
          ]),
        }),
      });
    });

    it('creates exactly one CloudFront Function bound to viewer-request', () => {
      tpl.resourceCountIs('AWS::CloudFront::Function', 1);
      const [dist] = resourcesOfType(tpl, 'AWS::CloudFront::Distribution');
      const config = dist?.Properties?.DistributionConfig;
      const defaultBehavior = isObject(config) ? config.DefaultCacheBehavior : undefined;
      const associations = isObject(defaultBehavior) ? defaultBehavior.FunctionAssociations : undefined;
      expect(associations).toBeDefined();
    });

    it('aliases the distribution to *.preview.borso.fr', () => {
      tpl.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: Match.objectLike({
          Aliases: ['*.preview.borso.fr'],
        }),
      });
    });

    it('creates wildcard A + AAAA Route 53 records for *.preview.borso.fr', () => {
      tpl.hasResourceProperties('AWS::Route53::RecordSet', {
        Name: '*.preview.borso.fr.',
        Type: 'A',
      });
      tpl.hasResourceProperties('AWS::Route53::RecordSet', {
        Name: '*.preview.borso.fr.',
        Type: 'AAAA',
      });
    });
  });

  describe('DSQL', () => {
    const tpl = synth({ budgetEmail: 'hugo@example.com' });

    it('does NOT own a DSQL cluster (clusters are now per-app, owned by prod app stacks)', () => {
      tpl.resourceCountIs('AWS::DSQL::Cluster', 0);
    });

    it('does NOT publish /borso/shared/dsql-cluster-* (clusters are now per-app)', () => {
      const names = resourcesOfType(tpl, 'AWS::SSM::Parameter').map((param) => param.Properties?.Name);
      expect(names).not.toContain('/borso/shared/dsql-cluster-arn');
      expect(names).not.toContain('/borso/shared/dsql-cluster-endpoint');
    });
  });

  describe('SSM parameters', () => {
    const tpl = synth({ budgetEmail: 'hugo@example.com' });
    const expectedParams = [
      '/borso/shared/oidc-provider-arn',
      '/borso/shared/hosted-zone-id',
      '/borso/shared/hosted-zone-name',
      '/borso/shared/cert-borso-fr-arn',
      '/borso/shared/cert-preview-borso-fr-arn',
      '/borso/shared/previews-bucket-name',
      '/borso/shared/previews-distribution-id',
      '/borso/shared/prod-deploy-role-arn',
      '/borso/shared/preview-deploy-role-arn',
      '/borso/shared/shared-deploy-role-arn',
    ];

    it.each(expectedParams)('publishes %s', (name) => {
      tpl.hasResourceProperties('AWS::SSM::Parameter', { Name: name });
    });

    it('does NOT publish /borso/shared/integ-role-arn (dropped)', () => {
      const names = resourcesOfType(tpl, 'AWS::SSM::Parameter').map((param) => param.Properties?.Name);
      expect(names).not.toContain('/borso/shared/integ-role-arn');
    });
  });

  describe('budgets', () => {
    it('creates 5/20/50 USD budgets when budgetEmail is provided via prop', () => {
      const tpl = synth({ budgetEmail: 'hugo@example.com' });
      tpl.resourceCountIs('AWS::Budgets::Budget', 3);
      for (const amount of [5, 20, 50]) {
        tpl.hasResourceProperties('AWS::Budgets::Budget', {
          Budget: Match.objectLike({
            BudgetName: `borso-monthly-${amount}usd`,
            BudgetLimit: { Amount: amount, Unit: 'USD' },
          }),
        });
      }
    });

    it('falls back to BORSO_BUDGET_EMAIL when prop is absent', () => {
      const original = process.env.BORSO_BUDGET_EMAIL;
      process.env.BORSO_BUDGET_EMAIL = 'env@example.com';
      try {
        const tpl = synth();
        tpl.resourceCountIs('AWS::Budgets::Budget', 3);
      } finally {
        if (original === undefined) {
          delete process.env.BORSO_BUDGET_EMAIL;
        } else {
          process.env.BORSO_BUDGET_EMAIL = original;
        }
      }
    });

    it('throws when neither prop nor env var is set (budget email is mandatory)', () => {
      const original = process.env.BORSO_BUDGET_EMAIL;
      delete process.env.BORSO_BUDGET_EMAIL;
      try {
        expect(() => synth()).toThrow(/budget email is mandatory/);
      } finally {
        if (original !== undefined) {
          process.env.BORSO_BUDGET_EMAIL = original;
        }
      }
    });
  });

  describe('no role gets AdministratorAccess', () => {
    const tpl = synth({ budgetEmail: 'hugo@example.com' });

    it('synthesized template never references the AdministratorAccess managed policy ARN', () => {
      const json = JSON.stringify(tpl.toJSON());
      expect(json).not.toContain(':policy/AdministratorAccess');
    });
  });
});

describe('SharedStack — ensure prior env vars do not leak', () => {
  let original: string | undefined;
  beforeEach(() => {
    original = process.env.BORSO_BUDGET_EMAIL;
    delete process.env.BORSO_BUDGET_EMAIL;
  });
  afterEach(() => {
    if (original !== undefined) {
      process.env.BORSO_BUDGET_EMAIL = original;
    }
  });

  it('synth in a clean env throws (budget email mandatory)', () => {
    expect(() => synth()).toThrow(/budget email is mandatory/);
  });
});
