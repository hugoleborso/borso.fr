import { CfnOutput, Stack } from 'aws-cdk-lib';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import {
  type Stage,
  assertDeployStage,
  previewApiHostname,
  previewHostname,
  validateAppSlug,
} from '../internal/naming.js';
import { applyStandardTags } from '../internal/tags.js';
import type { IDsqlCluster } from './dsql-cluster.js';
import { DsqlSchema } from './dsql-schema.js';
import { LambdaApi } from './lambda-api.js';
import { StaticSite } from './static-site.js';

const SHARED_SSM = {
  hostedZoneId: '/borso/shared/hosted-zone-id',
  hostedZoneName: '/borso/shared/hosted-zone-name',
  certPreviewRegionalArn: '/borso/shared/cert-preview-borso-fr-regional-arn',
} as const;

/** @beta */
export interface PreviewableAppProps {
  readonly app: string;
  readonly stage: Stage;
  readonly prNumber?: number;
  /** Apex/subdomain (e.g. "borsouvertures.borso.fr"). Required for prod. */
  readonly domainName?: string;
  /** Static frontend assets. */
  readonly frontend: { readonly distPath: string };
  /** Optional Hono-style API. */
  readonly api?: {
    readonly entry: string;
    /**
     * Override the auto-derived API hostname. Defaults:
     *   - prod: no custom domain (HTTP API id URL).
     *   - preview / integ: `<app>-pr-<n>-api.preview.borso.fr` with cert +
     *     Route 53 alias provisioned automatically (see `previewApiHostname`).
     *
     * If set explicitly, the caller is responsible for matching cert region
     * (eu-west-3) and DNS.
     */
    readonly customDomainHostname?: string;
    readonly memoryMb?: number;
    readonly timeoutSeconds?: number;
    readonly environment?: Readonly<Record<string, string>>;
  };
  /**
   * Optional DSQL schema.
   *
   * The cluster is owned by a separate `DsqlClusterStack` declared
   * alongside this stack in `bin/app.ts` and passed in here. CDK's
   * cross-stack reference machinery makes `cdk deploy --all` order the
   * cluster stack before this stage stack automatically — no
   * "first deploy must be prod" footgun. See
   * `docs/dantotsus/dsql-first-deploy-must-be-prod.md`.
   */
  readonly database?: {
    readonly migrationsPath: string;
    readonly cluster: IDsqlCluster;
  };
}

/**
 * High-level construct composing `StaticSite` + optional `LambdaApi` +
 * optional `DsqlSchema`. The DSQL cluster lives in a dedicated
 * `DsqlClusterStack` (one per app) and is passed in via
 * `props.database.cluster`.
 *
 * API routing depends on stage:
 *
 * - **prod**: the dedicated CloudFront distribution (owned by `StaticSite`)
 *   gets an extra `/api/*` cache behavior pointing at the HTTP API
 *   `*.execute-api.<region>.amazonaws.com` hostname. The frontend calls
 *   `/api/*` same-origin — no CORS, no extra hostname to remember. The
 *   API Gateway keeps its raw id URL too; CloudFront just fronts it.
 * - **preview / integ**: the HTTP API gets a custom domain at
 *   `previewApiHostname(props)` (e.g. `last-loop-lepin-pr-12-api.preview.borso.fr`)
 *   backed by the shared regional cert `*.preview.borso.fr`. The frontend
 *   reads this URL via the build-time `VITE_API_BASE` env var — preview is
 *   cross-origin because the shared previews CloudFront distribution is
 *   host-routed per PR, with no surface to add per-PR cache behaviors.
 *
 * Cert ARN + hosted zone come from SSM, seeded by `SharedStack`.
 *
 * @beta
 */
export class PreviewableApp extends Construct {
  public readonly site: StaticSite;
  public readonly api: LambdaApi | undefined;
  public readonly database: DsqlSchema | undefined;
  public readonly cluster: IDsqlCluster | undefined;

  constructor(scope: Construct, id: string, props: PreviewableAppProps) {
    super(scope, id);
    validateAppSlug(props.app);
    assertDeployStage(props.stage);
    applyStandardTags(this, props);

    if (props.database) {
      this.cluster = props.database.cluster;
      this.database = new DsqlSchema(this, 'Db', {
        app: props.app,
        stage: props.stage,
        prNumber: props.prNumber,
        migrationsPath: props.database.migrationsPath,
        cluster: this.cluster,
      });
    }

    if (props.api) {
      // StaticSite (built below) is the authoritative gate on prod requiring
      // `domainName`, but the API's CORS allow-list is computed first — so
      // guard explicitly here. Same error shape as StaticSite's check, so
      // the failure mode looks the same to the operator.
      if (props.stage === 'prod' && !props.domainName) {
        throw new Error('domainName is required for stage="prod".');
      }
      const apiCustomDomain = resolveApiCustomDomain(
        this,
        { app: props.app, stage: props.stage, prNumber: props.prNumber },
        props.api,
      );
      this.api = new LambdaApi(this, 'Api', {
        app: props.app,
        stage: props.stage,
        prNumber: props.prNumber,
        entry: props.api.entry,
        ...(apiCustomDomain ? { customDomain: apiCustomDomain } : {}),
        allowedOrigins: resolveAllowedOrigins({
          app: props.app,
          stage: props.stage,
          prNumber: props.prNumber,
          domainName: props.domainName ?? '',
        }),
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
      // Prod: wire same-origin `/api/*` through the dedicated CloudFront
      // distribution so the frontend can call its own API without CORS.
      // Preview/integ keep cross-origin via a build-time `VITE_API_BASE`
      // — the shared previews distribution is host-routed per PR, no
      // surface to add per-PR cache behaviors.
      ...(this.api && props.stage === 'prod'
        ? {
            api: {
              domainName: apiHttpHostname(this.api),
            },
          }
        : {}),
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

/**
 * Hostname (no scheme, no path) of the HTTP API's default
 * `*.execute-api.<region>.amazonaws.com` endpoint. Used as the CloudFront
 * origin domain for same-origin `/api/*` routing in prod.
 */
function apiHttpHostname(api: LambdaApi): string {
  return `${api.httpApi.apiId}.execute-api.${Stack.of(api).region}.amazonaws.com`;
}

function resolveAllowedOrigins(props: {
  readonly app: string;
  readonly stage: Stage;
  readonly prNumber?: number;
  readonly domainName: string;
}): readonly string[] {
  const origin =
    props.stage === 'prod'
      ? props.domainName
      : previewHostname({ app: props.app, stage: props.stage, prNumber: props.prNumber });
  return [`https://${origin}`];
}

/**
 * Resolve the API custom domain for non-prod stages. Returns `undefined`
 * for prod — the prod /api story (dedicated CloudFront with same-origin
 * `/api/*` routing) is a separate decision, callers wanting a prod API
 * custom domain wire `LambdaApi` directly.
 */
function resolveApiCustomDomain(
  scope: Construct,
  ctx: { readonly app: string; readonly stage: Stage; readonly prNumber?: number },
  apiOptions: { readonly customDomainHostname?: string },
):
  | {
      readonly hostname: string;
      readonly certificateArn: string;
      readonly hostedZoneId: string;
      readonly hostedZoneName: string;
    }
  | undefined {
  if (ctx.stage === 'prod') return undefined;
  const hostname = apiOptions.customDomainHostname ?? previewApiHostname(ctx);
  return {
    hostname,
    certificateArn: StringParameter.valueForStringParameter(
      scope,
      SHARED_SSM.certPreviewRegionalArn,
    ),
    hostedZoneId: StringParameter.valueForStringParameter(scope, SHARED_SSM.hostedZoneId),
    hostedZoneName: StringParameter.valueForStringParameter(scope, SHARED_SSM.hostedZoneName),
  };
}
