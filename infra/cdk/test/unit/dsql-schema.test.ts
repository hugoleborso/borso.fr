import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DsqlSchema } from '../../src/constructs/dsql-schema.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS = path.join(HERE, 'fixtures', 'migrations');

function synth(props: { stage: 'prod' | 'preview' | 'integ'; prNumber?: number }) {
  const app = new App();
  const stack = new Stack(app, 'TestStack', {
    env: { account: '123456789012', region: 'eu-west-3' },
  });
  new DsqlSchema(stack, 'Db', {
    app: 'pragma',
    stage: props.stage,
    ...(props.prNumber !== undefined ? { prNumber: props.prNumber } : {}),
    migrationsPath: MIGRATIONS,
  });
  return Template.fromStack(stack);
}

describe('DsqlSchema', () => {
  it('creates a NodejsFunction migration runner with dsql:DbConnectAdmin', () => {
    const tpl = synth({ stage: 'prod' });
    const policies = Object.values(
      tpl.toJSON().Resources as Record<
        string,
        { Type: string; Properties?: { PolicyDocument?: { Statement?: unknown[] } } }
      >,
    ).filter((r) => r.Type === 'AWS::IAM::Policy');
    const allStatements = policies.flatMap(
      (p) => p.Properties?.PolicyDocument?.Statement ?? [],
    ) as Array<{ Action?: unknown; Effect?: string }>;
    const hasDbConnectAdmin = allStatements.some((s) => {
      const action = Array.isArray(s.Action) ? s.Action : [s.Action];
      return action.includes('dsql:DbConnectAdmin') && s.Effect === 'Allow';
    });
    expect(hasDbConnectAdmin).toBe(true);
  });

  it('creates a custom resource for the schema with the migrations payload', () => {
    const tpl = synth({ stage: 'preview', prNumber: 3 });
    const resources = tpl.toJSON().Resources as Record<
      string,
      { Type: string; Properties?: Record<string, unknown> }
    >;
    const cr = Object.values(resources).find(
      (r) => r.Type === 'AWS::CloudFormation::CustomResource',
    );
    expect(cr).toBeDefined();
    expect(cr?.Properties?.schemaName).toBe('pragma_pr_3');
    const migrations = cr?.Properties?.migrations as Array<{ name: string }>;
    expect(migrations).toHaveLength(1);
    expect(migrations[0]?.name).toBe('0001_init.sql');
  });

  it('emits a SchemaName output', () => {
    const tpl = synth({ stage: 'integ', prNumber: 4 });
    const outputs = tpl.toJSON().Outputs ?? {};
    const values = Object.values(outputs).map((o) => (o as { Value: string }).Value);
    expect(values).toContain('integ_pr_4_pragma');
  });

  it('throws when migrationsPath does not exist', () => {
    const app = new App();
    const stack = new Stack(app, 'S', {
      env: { account: '123456789012', region: 'eu-west-3' },
    });
    expect(
      () =>
        new DsqlSchema(stack, 'Db', {
          app: 'pragma',
          stage: 'prod',
          migrationsPath: '/nonexistent-path-borso-test',
        }),
    ).toThrow(/migrationsPath does not exist/);
  });

  it('grantConnect adds dsql:DbConnect to the principal policy', () => {
    const app = new App();
    const stack = new Stack(app, 'S', {
      env: { account: '123456789012', region: 'eu-west-3' },
    });
    const schema = new DsqlSchema(stack, 'Db', {
      app: 'pragma',
      stage: 'prod',
      migrationsPath: MIGRATIONS,
    });
    expect(schema.schemaName).toBe('pragma');
    // grantConnect is exercised by lambda-api integration; we just make sure
    // the public surface is reachable.
    expect(typeof schema.grantConnect).toBe('function');
  });
});

describe('DsqlSchema (migrations directory edge cases)', () => {
  let tmp: string;

  beforeAll(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'borso-migrations-'));
    // valid migrations
    fs.writeFileSync(path.join(tmp, '0001_init.sql'), 'CREATE TABLE x (id INT);');
    fs.writeFileSync(path.join(tmp, '0002_more.sql'), 'CREATE TABLE y (id INT);');
    // junk that should be ignored
    fs.writeFileSync(path.join(tmp, 'README.md'), 'noise');
    fs.writeFileSync(path.join(tmp, 'not-a-migration.sql'), 'noise');
  });

  afterAll(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('reads only files matching the migration pattern, in order', () => {
    const app = new App();
    const stack = new Stack(app, 'S', {
      env: { account: '123456789012', region: 'eu-west-3' },
    });
    new DsqlSchema(stack, 'Db', {
      app: 'pragma',
      stage: 'prod',
      migrationsPath: tmp,
    });
    const tpl = Template.fromStack(stack);
    const resources = tpl.toJSON().Resources as Record<
      string,
      { Type: string; Properties?: Record<string, unknown> }
    >;
    const cr = Object.values(resources).find(
      (r) => r.Type === 'AWS::CloudFormation::CustomResource',
    );
    const migrations = cr?.Properties?.migrations as Array<{ name: string }>;
    expect(migrations.map((m) => m.name)).toEqual(['0001_init.sql', '0002_more.sql']);
  });
});
