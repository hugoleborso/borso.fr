import { CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { type Stage, assertDeployStage, validateAppSlug } from '../internal/naming.js';
import { applyStandardTags } from '../internal/tags.js';
import { DsqlSchema } from './dsql-schema.js';
import { LambdaApi } from './lambda-api.js';
import { StaticSite } from './static-site.js';

/** @beta */
export interface PreviewableAppProps {
  readonly app: string;
  readonly stage: Stage;
  readonly prNumber?: number;
  /** Apex/subdomain (e.g. "pragma.borso.fr"). Required for prod. */
  readonly domainName?: string;
  /** Static frontend assets. */
  readonly frontend: { readonly distPath: string };
  /** Optional Hono-style API. */
  readonly api?: {
    readonly entry: string;
    readonly customDomain?: string;
    readonly memoryMb?: number;
    readonly timeoutSeconds?: number;
    readonly environment?: Readonly<Record<string, string>>;
  };
  /** Optional DSQL schema. If `api` is set, the API is granted connect. */
  readonly database?: { readonly migrationsPath: string };
}

/**
 * High-level construct composing `StaticSite` + optional `LambdaApi` +
 * optional `DsqlSchema`.
 *
 * The /api/* routing on the shared previews distribution is **not** wired
 * in v0.1.x — preview frontends hit the API at its own HTTP API URL. This
 * will change before 1.0.
 *
 * @beta
 */
export class PreviewableApp extends Construct {
  public readonly site: StaticSite;
  public readonly api: LambdaApi | undefined;
  public readonly database: DsqlSchema | undefined;

  constructor(scope: Construct, id: string, props: PreviewableAppProps) {
    super(scope, id);
    validateAppSlug(props.app);
    assertDeployStage(props.stage);
    applyStandardTags(this, props);

    if (props.database) {
      this.database = new DsqlSchema(this, 'Db', {
        app: props.app,
        stage: props.stage,
        prNumber: props.prNumber,
        migrationsPath: props.database.migrationsPath,
      });
    }

    if (props.api) {
      this.api = new LambdaApi(this, 'Api', {
        app: props.app,
        stage: props.stage,
        prNumber: props.prNumber,
        entry: props.api.entry,
        customDomain: props.api.customDomain,
        memoryMb: props.api.memoryMb,
        timeoutSeconds: props.api.timeoutSeconds,
        environment: props.api.environment,
        dsqlSchema: this.database,
      });
    }

    this.site = new StaticSite(this, 'Site', {
      app: props.app,
      stage: props.stage,
      prNumber: props.prNumber,
      domainName: props.domainName,
      assetsPath: props.frontend.distPath,
    });

    new CfnOutput(this, 'FrontendUrl', { value: this.site.url });
    if (this.api) {
      new CfnOutput(this, 'ApiUrl', { value: this.api.url });
    }
    if (this.database) {
      new CfnOutput(this, 'DbSchema', { value: this.database.schemaName });
    }
  }
}
