import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { describe, expect, it } from 'vitest';
import { DsqlClusterStack } from '../../src/constructs/dsql-cluster-stack.js';

const ENV = { account: '123456789012', region: 'eu-west-3' };

describe('DsqlClusterStack', () => {
  it('creates a deletion-protected DSQL cluster + SSM params for the app', () => {
    const app = new App();
    const stack = new DsqlClusterStack(app, 'test-app-cluster', {
      env: ENV,
      app: 'test-app',
    });
    const tpl = Template.fromStack(stack);
    tpl.hasResourceProperties('AWS::DSQL::Cluster', { DeletionProtectionEnabled: true });
    tpl.hasResourceProperties('AWS::SSM::Parameter', {
      Name: '/borso/test-app/dsql-cluster-arn',
    });
    tpl.hasResourceProperties('AWS::SSM::Parameter', {
      Name: '/borso/test-app/dsql-cluster-endpoint',
    });
  });

  it('honours an explicit deletionProtection: false', () => {
    const app = new App();
    const stack = new DsqlClusterStack(app, 'test-app-cluster', {
      env: ENV,
      app: 'test-app',
      deletionProtection: false,
    });
    const tpl = Template.fromStack(stack);
    tpl.hasResourceProperties('AWS::DSQL::Cluster', { DeletionProtectionEnabled: false });
  });

  it('exposes the cluster as IDsqlCluster for cross-stack consumers', () => {
    const app = new App();
    const stack = new DsqlClusterStack(app, 'test-app-cluster', {
      env: ENV,
      app: 'test-app',
    });
    expect(typeof stack.cluster.clusterArn).toBe('string');
    expect(typeof stack.cluster.clusterEndpoint).toBe('string');
    expect(typeof stack.cluster.grantConnect).toBe('function');
  });
});
