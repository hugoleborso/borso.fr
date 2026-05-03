import { Stack, type StackProps } from 'aws-cdk-lib';
import type { Construct } from 'constructs';
import { DsqlCluster, type IDsqlCluster } from './dsql-cluster.js';

/** @beta */
export interface DsqlClusterStackProps extends StackProps {
  /** App slug (e.g. "borso-fr"). Drives cluster tags + SSM paths. */
  readonly app: string;
  /**
   * Override the default deletion-protection. Defaults to true.
   * Override only if you really know what you're doing.
   */
  readonly deletionProtection?: boolean;
}

/**
 * The dedicated, long-lived stack that owns an app's per-app DSQL cluster.
 *
 * The cluster stack is independent from any deploy-stage stack. A brand-new
 * app's `cdk deploy --all` walks `<app>-cluster` first (because every stage
 * stack receives the cluster via cross-stack reference and CFN therefore
 * orders deploys), then prod / preview / integ. This eliminates the
 * "first deploy must be prod" chicken-and-egg that arose when the cluster
 * lived inside the prod stage stack — see
 * `docs/dantotsus/dsql-first-deploy-must-be-prod.md`.
 *
 * Expose the cluster via `.cluster: IDsqlCluster` for callers (typically
 * `PreviewableApp.database.cluster`).
 *
 * @beta
 */
export class DsqlClusterStack extends Stack {
  public readonly cluster: IDsqlCluster;

  constructor(scope: Construct, id: string, props: DsqlClusterStackProps) {
    super(scope, id, props);
    this.cluster = new DsqlCluster(this, 'Cluster', {
      app: props.app,
      // The cluster is the app's long-lived owner of database state, not
      // tied to a per-stage stack. We tag it `Stage: prod` because that's
      // the production-grade lifecycle it gets (deletion protected, never
      // recreated for stage churn) — even though preview/integ schemas
      // live alongside.
      stage: 'prod',
      ...(props.deletionProtection !== undefined
        ? { deletionProtection: props.deletionProtection }
        : {}),
    });
  }
}
