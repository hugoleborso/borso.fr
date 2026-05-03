import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { describe, expect, it } from 'vitest';
import { PreviewableApp } from '../../src/constructs/previewable-app.js';
import { resourcesOfType } from './helpers/template.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ENTRY = path.join(HERE, 'fixtures', 'handler.ts');
const MIGRATIONS = path.join(HERE, 'fixtures', 'migrations');

function synth(): Template {
  const app = new App();
  const stack = new Stack(app, 'S', {
    env: { account: '123456789012', region: 'eu-west-3' },
  });
  new PreviewableApp(stack, 'App', {
    app: 'test-app',
    stage: 'prod',
    domainName: 'borsouvertures.borso.fr',
    frontend: { distPath: '.' },
    api: { entry: ENTRY, environment: { FOO: 'bar' } },
    database: { migrationsPath: MIGRATIONS },
  });
  return Template.fromStack(stack);
}

describe('PreviewableApp (prod, full)', () => {
  const tpl = synth();

  it('creates the static distribution + Lambda + DSQL cluster + schema custom resource', () => {
    tpl.resourceCountIs('AWS::CloudFront::Distribution', 1);
    // 1 API handler + 1 migration runner + provider + ?bucket-deployment
    expect(resourcesOfType(tpl, 'AWS::Lambda::Function').length).toBeGreaterThanOrEqual(2);
    tpl.resourceCountIs('AWS::CloudFormation::CustomResource', 1);
  });

  it('owns the per-app DSQL cluster (prod stack creates it)', () => {
    tpl.resourceCountIs('AWS::DSQL::Cluster', 1);
    tpl.hasResourceProperties('AWS::SSM::Parameter', {
      Name: '/borso/test-app/dsql-cluster-arn',
    });
  });

  it('emits Frontend, Api and Db outputs', () => {
    const outputs = tpl.toJSON().Outputs ?? {};
    const ids = Object.keys(outputs).join('|');
    expect(ids).toMatch(/FrontendUrl/);
    expect(ids).toMatch(/ApiUrl/);
    expect(ids).toMatch(/DbSchema/);
  });
});

describe('PreviewableApp (preview with db)', () => {
  it('looks up the cluster from SSM instead of creating one', () => {
    const app = new App();
    const stack = new Stack(app, 'S', {
      env: { account: '123456789012', region: 'eu-west-3' },
    });
    new PreviewableApp(stack, 'App', {
      app: 'test-app',
      stage: 'preview',
      prNumber: 5,
      frontend: { distPath: '.' },
      database: { migrationsPath: MIGRATIONS },
    });
    const tpl = Template.fromStack(stack);
    // No cluster created in this stack — preview shares the prod-owned one.
    tpl.resourceCountIs('AWS::DSQL::Cluster', 0);
    // Schema migration runner is still here, referencing the SSM-resolved
    // cluster ARN/endpoint via the lookup helper.
    tpl.resourceCountIs('AWS::CloudFormation::CustomResource', 1);
    const json = JSON.stringify(tpl.toJSON());
    expect(json).toContain('/borso/test-app/dsql-cluster-arn');
  });
});

describe('PreviewableApp (preview, no api/db)', () => {
  it('omits the api + db when not requested', () => {
    const app = new App();
    const stack = new Stack(app, 'S', {
      env: { account: '123456789012', region: 'eu-west-3' },
    });
    const previewable = new PreviewableApp(stack, 'App', {
      app: 'test-app',
      stage: 'preview',
      prNumber: 5,
      frontend: { distPath: '.' },
    });
    expect(previewable.api).toBeUndefined();
    expect(previewable.database).toBeUndefined();
    expect(previewable.cluster).toBeUndefined();
    const tpl = Template.fromStack(stack);
    expect(resourcesOfType(tpl, 'AWS::ApiGatewayV2::Api').length).toBe(0);
    tpl.resourceCountIs('AWS::DSQL::Cluster', 0);
  });
});
