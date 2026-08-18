import { App, Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { Certificate } from 'aws-cdk-lib/aws-certificatemanager';
import { describe, expect, it } from 'vitest';
import { HOSTED_ZONE_NAME } from '../../lib/certs-stack.js';
import { SharedStack } from '../../lib/shared-stack.js';
import { isObject, resourcesOfType, serializeTemplateForSnapshot } from './helpers/template.js';

const BUDGET_EMAIL = 'hugo@example.com';

function synth(opts?: { budgetEmail?: string }): Template {
  const app = new App();
  app.node.setContext(
    `hosted-zone:account=123456789012:domainName=${HOSTED_ZONE_NAME}:region=eu-west-3`,
    {
      Id: '/hostedzone/Z1FAKE',
      Name: `${HOSTED_ZONE_NAME}.`,
    },
  );
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
    budgetEmail: opts?.budgetEmail ?? BUDGET_EMAIL,
  });
  return Template.fromStack(stack);
}

// @FollowsBlueprint test-cdk-synth
describe('SharedStack', () => {
  describe('OIDC + roles', () => {
    const tpl = synth();

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
    const tpl = synth();

    it('creates the previews bucket with public access blocked + 60-day expiry', () => {
      tpl.hasResourceProperties('AWS::S3::Bucket', {
        BucketName: 'borso-previews',
        PublicAccessBlockConfiguration: Match.objectLike({
          BlockPublicAcls: true,
        }),
        LifecycleConfiguration: Match.objectLike({
          Rules: Match.arrayWith([Match.objectLike({ ExpirationInDays: 60, Status: 'Enabled' })]),
        }),
      });
    });

    it('creates exactly one CloudFront Function bound to viewer-request', () => {
      tpl.resourceCountIs('AWS::CloudFront::Function', 1);
      const [dist] = resourcesOfType(tpl, 'AWS::CloudFront::Distribution');
      const config = dist?.Properties?.DistributionConfig;
      const defaultBehavior = isObject(config) ? config.DefaultCacheBehavior : undefined;
      const associations = isObject(defaultBehavior)
        ? defaultBehavior.FunctionAssociations
        : undefined;
      expect(associations).toBeDefined();
    });

    it('aliases the distribution to *.preview.borso.fr', () => {
      tpl.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: Match.objectLike({
          Aliases: ['*.preview.borso.fr'],
        }),
      });
    });

    it('configures /404.jpeg as the 404 response body on the previews CDN', () => {
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
    });

    it('grants the CloudFront OAC principal s3:ListBucket on the previews bucket', () => {
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
    const tpl = synth();

    it('does NOT own a DSQL cluster (clusters are now per-app, owned by prod app stacks)', () => {
      tpl.resourceCountIs('AWS::DSQL::Cluster', 0);
    });

    it('does NOT publish /borso/shared/dsql-cluster-* (clusters are now per-app)', () => {
      const names = resourcesOfType(tpl, 'AWS::SSM::Parameter').map(
        (param) => param.Properties?.Name,
      );
      expect(names).not.toContain('/borso/shared/dsql-cluster-arn');
      expect(names).not.toContain('/borso/shared/dsql-cluster-endpoint');
    });
  });

  describe('SSM parameters', () => {
    const tpl = synth();
    const expectedParams = [
      '/borso/shared/oidc-provider-arn',
      '/borso/shared/hosted-zone-id',
      '/borso/shared/hosted-zone-name',
      '/borso/shared/cert-borso-fr-arn',
      '/borso/shared/cert-preview-borso-fr-arn',
      '/borso/shared/cert-preview-borso-fr-regional-arn',
      '/borso/shared/previews-bucket-name',
      '/borso/shared/previews-distribution-id',
      '/borso/shared/previews-distribution-domain',
      '/borso/shared/prod-deploy-role-arn',
      '/borso/shared/preview-deploy-role-arn',
      '/borso/shared/shared-deploy-role-arn',
    ];

    it.each(expectedParams)('publishes %s', (name) => {
      tpl.hasResourceProperties('AWS::SSM::Parameter', { Name: name });
    });

    it('does NOT publish /borso/shared/integ-role-arn (dropped)', () => {
      const names = resourcesOfType(tpl, 'AWS::SSM::Parameter').map(
        (param) => param.Properties?.Name,
      );
      expect(names).not.toContain('/borso/shared/integ-role-arn');
    });
  });

  describe('budgets', () => {
    it('creates 2/5/20/50 USD budgets notifying the address the entrypoint passed in', () => {
      const tpl = synth();
      tpl.resourceCountIs('AWS::Budgets::Budget', 4);
      for (const amount of [2, 5, 20, 50]) {
        tpl.hasResourceProperties('AWS::Budgets::Budget', {
          Budget: Match.objectLike({
            BudgetName: `borso-monthly-${amount}usd`,
            BudgetLimit: { Amount: amount, Unit: 'USD' },
          }),
          NotificationsWithSubscribers: Match.arrayWith([
            Match.objectLike({
              Subscribers: [{ SubscriptionType: 'EMAIL', Address: BUDGET_EMAIL }],
            }),
          ]),
        });
      }
    });

    it('reads no environment variable of its own, so every stage gets the address it was given', () => {
      const tpl = synth({ budgetEmail: 'other@example.com' });
      tpl.hasResourceProperties('AWS::Budgets::Budget', {
        NotificationsWithSubscribers: Match.arrayWith([
          Match.objectLike({
            Subscribers: [{ SubscriptionType: 'EMAIL', Address: 'other@example.com' }],
          }),
        ]),
      });
    });
  });

  // Everything else in this file asserts a property somebody thought to name.
  // The drift that reached production was one nobody had: a `biome-ignore`
  // comment deleted from cf-host-routing-function.code.js, a file infra/cdk
  // reads as a *string* and ships to the CloudFront edge, which moved this
  // stack's template while nothing under infra/shared/ meaningfully changed.
  // shared-deploy.yml is dispatch-only, so no run ever diffed it.
  //
  // A committed snapshot makes any change to this template appear in the pull
  // request that causes it, whichever workspace the change came from. Update it
  // deliberately with `pnpm --filter @borso/shared-infra exec vitest -u` — the
  // diff in the snapshot file IS the review.
  describe('template snapshot', () => {
    it('matches the committed template, so drift shows up in the diff', async () => {
      const template = serializeTemplateForSnapshot(synth({ budgetEmail: 'hugo@example.com' }));
      await expect(template).toMatchFileSnapshot('./__snapshots__/borso-shared.template.json');
    });
  });

  describe('no role gets AdministratorAccess', () => {
    const tpl = synth();

    it('synthesized template never references the AdministratorAccess managed policy ARN', () => {
      const json = JSON.stringify(tpl.toJSON());
      expect(json).not.toContain(':policy/AdministratorAccess');
    });
  });
});
