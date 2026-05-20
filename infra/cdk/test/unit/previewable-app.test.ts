import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { describe, expect, it } from 'vitest';
import { DsqlClusterStack } from '../../src/constructs/dsql-cluster-stack.js';
import { PreviewableApp } from '../../src/constructs/previewable-app.js';
import { resourcesOfType } from './helpers/template.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ENTRY = path.join(HERE, 'fixtures', 'handler.ts');
const MIGRATIONS = path.join(HERE, 'fixtures', 'migrations');

const ENV = { account: '123456789012', region: 'eu-west-3' };

interface Stacks {
  readonly app: App;
  readonly clusterStack: DsqlClusterStack;
  readonly stageStack: Stack;
}

function bootstrap(stageId: string): Stacks {
  const app = new App();
  const clusterStack = new DsqlClusterStack(app, 'test-app-cluster', {
    env: ENV,
    app: 'test-app',
  });
  const stageStack = new Stack(app, stageId, { env: ENV });
  return { app, clusterStack, stageStack };
}

describe('PreviewableApp (prod, full)', () => {
  const { clusterStack, stageStack } = bootstrap('S');
  new PreviewableApp(stageStack, 'App', {
    app: 'test-app',
    stage: 'prod',
    domainName: 'borsouvertures.borso.fr',
    frontend: { distPath: '.' },
    api: { entry: ENTRY, environment: { FOO: 'bar' } },
    database: { migrationsPath: MIGRATIONS, cluster: clusterStack.cluster },
  });
  const stageTpl = Template.fromStack(stageStack);
  const clusterTpl = Template.fromStack(clusterStack);

  it('puts the DSQL cluster in the dedicated cluster stack, not the stage stack', () => {
    clusterTpl.resourceCountIs('AWS::DSQL::Cluster', 1);
    stageTpl.resourceCountIs('AWS::DSQL::Cluster', 0);
  });

  it('publishes the cluster ARN/endpoint SSM params from the cluster stack', () => {
    clusterTpl.hasResourceProperties('AWS::SSM::Parameter', {
      Name: '/borso/test-app/dsql-cluster-arn',
    });
  });

  it('creates the static distribution + Lambda + schema custom resource in the stage stack', () => {
    stageTpl.resourceCountIs('AWS::CloudFront::Distribution', 1);
    expect(resourcesOfType(stageTpl, 'AWS::Lambda::Function').length).toBeGreaterThanOrEqual(2);
    stageTpl.resourceCountIs('AWS::CloudFormation::CustomResource', 1);
  });

  it('wires SPA fallback on the static distribution (direct nav to /r/<slug> loads index.html)', () => {
    stageTpl.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: {
        CustomErrorResponses: [
          {
            ErrorCode: 404,
            ResponsePagePath: '/index.html',
            ResponseCode: 200,
            ErrorCachingMinTTL: 300,
          },
        ],
      },
    });
  });

  it('emits Frontend, Api and Db outputs', () => {
    const outputs = stageTpl.toJSON().Outputs ?? {};
    const ids = Object.keys(outputs).join('|');
    expect(ids).toMatch(/FrontendUrl/);
    expect(ids).toMatch(/ApiUrl/);
    expect(ids).toMatch(/DbSchema/);
  });
});

describe('PreviewableApp (preview with db)', () => {
  it('shares the cluster across stages via cross-stack reference, no SSM ceremony in stage stack', () => {
    const { clusterStack, stageStack } = bootstrap('S');
    new PreviewableApp(stageStack, 'App', {
      app: 'test-app',
      stage: 'preview',
      prNumber: 5,
      frontend: { distPath: '.' },
      database: { migrationsPath: MIGRATIONS, cluster: clusterStack.cluster },
    });
    const stageTpl = Template.fromStack(stageStack);

    // Stage stack still has the schema custom resource…
    stageTpl.resourceCountIs('AWS::CloudFormation::CustomResource', 1);
    // …but no cluster (it lives in the cluster stack).
    stageTpl.resourceCountIs('AWS::DSQL::Cluster', 0);
  });
});

describe('PreviewableApp (prod, missing domainName + api)', () => {
  it('throws — CORS allow-list needs the prod hostname', () => {
    const { clusterStack, stageStack } = bootstrap('S');
    expect(() => {
      new PreviewableApp(stageStack, 'App', {
        app: 'test-app',
        stage: 'prod',
        frontend: { distPath: '.' },
        api: { entry: ENTRY },
        database: { migrationsPath: MIGRATIONS, cluster: clusterStack.cluster },
      });
    }).toThrow(/domainName is required for stage="prod"/);
  });
});

describe('PreviewableApp (preview with api → custom domain)', () => {
  const { clusterStack, stageStack } = bootstrap('S');
  new PreviewableApp(stageStack, 'App', {
    app: 'test-app',
    stage: 'preview',
    prNumber: 12,
    frontend: { distPath: '.' },
    api: { entry: ENTRY },
    database: { migrationsPath: MIGRATIONS, cluster: clusterStack.cluster },
  });
  const stageTpl = Template.fromStack(stageStack);

  it('provisions an APIGW v2 DomainName at <app>-pr-<n>-api.preview.borso.fr', () => {
    stageTpl.hasResourceProperties('AWS::ApiGatewayV2::DomainName', {
      DomainName: 'test-app-pr-12-api.preview.borso.fr',
    });
    stageTpl.resourceCountIs('AWS::ApiGatewayV2::ApiMapping', 1);
  });

  it('provisions A + AAAA Route 53 alias records for the API hostname', () => {
    stageTpl.resourceCountIs('AWS::Route53::RecordSet', 2);
  });

  it('uses specific origin + credentials for CORS (not wildcard)', () => {
    stageTpl.hasResourceProperties('AWS::ApiGatewayV2::Api', {
      CorsConfiguration: {
        AllowCredentials: true,
        AllowOrigins: ['https://test-app-pr-12.preview.borso.fr'],
      },
    });
  });
});

describe('PreviewableApp (preview, no api/db)', () => {
  it('omits the api + db when not requested', () => {
    const app = new App();
    const stack = new Stack(app, 'S', { env: ENV });
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
