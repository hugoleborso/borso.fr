import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { Code, Function as LambdaFunction, Runtime } from 'aws-cdk-lib/aws-lambda';
import { describe, expect, it } from 'vitest';
import { DsqlCluster, lookupDsqlCluster } from '../../src/constructs/dsql-cluster.js';
import { isObject, resourcesOfType } from './helpers/template.js';

function synth(setup: (stack: Stack) => void): Template {
  const app = new App();
  const stack = new Stack(app, 'TestStack', {
    env: { account: '123456789012', region: 'eu-west-3' },
  });
  setup(stack);
  return Template.fromStack(stack);
}

function makeLambda(stack: Stack, id: string): LambdaFunction {
  return new LambdaFunction(stack, id, {
    runtime: Runtime.NODEJS_22_X,
    handler: 'index.handler',
    code: Code.fromInline('exports.handler = async () => ({ ok: true });'),
  });
}

describe('DsqlCluster', () => {
  it('creates a deletion-protected DSQL cluster by default', () => {
    const tpl = synth((stack) => {
      new DsqlCluster(stack, 'Cluster', { app: 'test-app', stage: 'prod' });
    });
    tpl.hasResourceProperties('AWS::DSQL::Cluster', {
      DeletionProtectionEnabled: true,
    });
  });

  it('honours an explicit deletionProtection: false', () => {
    const tpl = synth((stack) => {
      new DsqlCluster(stack, 'Cluster', {
        app: 'test-app',
        stage: 'prod',
        deletionProtection: false,
      });
    });
    tpl.hasResourceProperties('AWS::DSQL::Cluster', {
      DeletionProtectionEnabled: false,
    });
  });

  it('tags the cluster with App / Stage / Project / ManagedBy', () => {
    const tpl = synth((stack) => {
      new DsqlCluster(stack, 'Cluster', { app: 'test-app', stage: 'prod' });
    });
    const [cluster] = resourcesOfType(tpl, 'AWS::DSQL::Cluster');
    expect(cluster?.Properties?.Tags).toEqual(
      expect.arrayContaining([
        { Key: 'App', Value: 'test-app' },
        { Key: 'Stage', Value: 'prod' },
        { Key: 'Project', Value: 'borso' },
        { Key: 'ManagedBy', Value: 'cdk' },
      ]),
    );
  });

  it('publishes ARN + endpoint to /borso/<app>/dsql-cluster-{arn,endpoint}', () => {
    const tpl = synth((stack) => {
      new DsqlCluster(stack, 'Cluster', { app: 'test-app', stage: 'prod' });
    });
    tpl.hasResourceProperties('AWS::SSM::Parameter', {
      Name: '/borso/test-app/dsql-cluster-arn',
    });
    tpl.hasResourceProperties('AWS::SSM::Parameter', {
      Name: '/borso/test-app/dsql-cluster-endpoint',
    });
  });

  it('rejects bad app slugs', () => {
    expect(() =>
      synth((stack) => {
        new DsqlCluster(stack, 'Cluster', { app: 'Bad_Slug', stage: 'prod' });
      }),
    ).toThrow();
  });

  it('grantConnect adds dsql:DbConnect to the principal policy', () => {
    const tpl = synth((stack) => {
      const cluster = new DsqlCluster(stack, 'Cluster', { app: 'test-app', stage: 'prod' });
      cluster.grantConnect(makeLambda(stack, 'Fn'));
    });
    const policies = resourcesOfType(tpl, 'AWS::IAM::Policy');
    const hasDbConnect = policies.some((policy) => {
      const policyDoc = policy.Properties?.PolicyDocument;
      if (!isObject(policyDoc) || !Array.isArray(policyDoc.Statement)) return false;
      return policyDoc.Statement.some((statement) => {
        if (!isObject(statement)) return false;
        const action = Array.isArray(statement.Action) ? statement.Action : [statement.Action];
        return action.includes('dsql:DbConnect');
      });
    });
    expect(hasDbConnect).toBe(true);
  });
});

describe('lookupDsqlCluster', () => {
  it('reads the per-app SSM params and grantConnect references the resolved ARN', () => {
    const tpl = synth((stack) => {
      const cluster = lookupDsqlCluster(stack, 'test-app');
      cluster.grantConnect(makeLambda(stack, 'Fn'));
    });
    const json = JSON.stringify(tpl.toJSON());
    expect(json).toContain('/borso/test-app/dsql-cluster-arn');
    expect(json).toContain('dsql:DbConnect');
  });

  it('rejects bad app slugs', () => {
    expect(() =>
      synth((stack) => {
        lookupDsqlCluster(stack, 'Bad_Slug');
      }),
    ).toThrow();
  });
});
