import { CfnResource, Fn, Stack } from 'aws-cdk-lib';
import { type IGrantable, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import { type Stage, dsqlClusterSsmPaths, validateAppSlug } from '../internal/naming.js';
import { applyStandardTags } from '../internal/tags.js';

/**
 * Per-app DSQL cluster reference. Implemented by the live {@link DsqlCluster}
 * construct (when this app's prod stack creates the cluster) and by
 * {@link lookupDsqlCluster} (when a preview / integ stack references the
 * existing prod-owned cluster via SSM).
 *
 * @beta
 */
export interface IDsqlCluster {
  readonly clusterArn: string;
  readonly clusterEndpoint: string;
  /** Grant `dsql:DbConnect` on this cluster to the given Lambda / role. */
  grantConnect(grantable: IGrantable): void;
}

/** @beta */
export interface DsqlClusterProps {
  readonly app: string;
  /**
   * Always 'prod' in practice — the cluster lives in the prod stack and is
   * looked up by preview/integ. Kept on the props for tag consistency and
   * future-proofing if per-stage clusters ever come back.
   */
  readonly stage: Stage;
  /**
   * Whether AWS deletion-protection is on. Defaults to true for prod.
   * Override only if you really know what you're doing.
   */
  readonly deletionProtection?: boolean;
}

/**
 * Creates the per-app Aurora DSQL cluster, publishes its ARN + endpoint to
 * `/borso/<app>/dsql-cluster-{arn,endpoint}` in SSM, and exposes
 * {@link grantConnect} for app Lambdas.
 *
 * Clusters are per-app, not per-stage. The same cluster hosts the prod
 * schema (`prod`) and preview schemas (`pr_<n>`); see {@link DsqlSchema}
 * and {@link lookupDsqlCluster}.
 *
 * @beta
 */
export class DsqlCluster extends Construct implements IDsqlCluster {
  public readonly clusterArn: string;
  public readonly clusterEndpoint: string;

  constructor(scope: Construct, id: string, props: DsqlClusterProps) {
    super(scope, id);
    validateAppSlug(props.app);
    applyStandardTags(this, props);

    const cluster = new CfnResource(this, 'Cluster', {
      type: 'AWS::DSQL::Cluster',
      properties: {
        DeletionProtectionEnabled: props.deletionProtection ?? true,
        Tags: [
          { Key: 'Project', Value: 'borso' },
          { Key: 'App', Value: props.app },
          { Key: 'Stage', Value: props.stage },
          { Key: 'ManagedBy', Value: 'cdk' },
        ],
      },
    });
    const stack = Stack.of(this);
    this.clusterArn = Fn.sub(
      // biome-ignore lint/suspicious/noTemplateCurlyInString: CFN intrinsic, not JS template
      'arn:aws:dsql:${AWS::Region}:${AWS::AccountId}:cluster/${ClusterId}',
      { ClusterId: cluster.ref },
    );
    this.clusterEndpoint = Fn.sub(
      // biome-ignore lint/suspicious/noTemplateCurlyInString: CFN intrinsic, not JS template
      '${ClusterId}.dsql.${AWS::Region}.on.aws',
      { ClusterId: cluster.ref },
    );

    const ssm = dsqlClusterSsmPaths(props.app);
    new StringParameter(this, 'ArnParam', {
      parameterName: ssm.arn,
      stringValue: this.clusterArn,
    });
    new StringParameter(this, 'EndpointParam', {
      parameterName: ssm.endpoint,
      stringValue: this.clusterEndpoint,
    });
    // Suppress unused-binding warning — kept around for `Stack.of` semantics
    // even when the cluster ref is what we use directly.
    void stack;
  }

  public grantConnect(grantable: IGrantable): void {
    grantable.grantPrincipal.addToPrincipalPolicy(
      new PolicyStatement({
        actions: ['dsql:DbConnect'],
        resources: [this.clusterArn],
      }),
    );
  }
}

/**
 * Look up the per-app cluster from SSM. Kept for advanced operators who
 * want SSM-decoupled access (e.g. cross-account workflows). The standard
 * path is to instantiate a {@link DsqlClusterStack} alongside your stage
 * stack and pass `clusterStack.cluster` directly into
 * `PreviewableApp.database.cluster` — that gives you a cross-stack
 * reference, deterministic deploy order via CDK, and no SSM ceremony.
 *
 * @beta
 */
export function lookupDsqlCluster(scope: Construct, app: string): IDsqlCluster {
  validateAppSlug(app);
  const paths = dsqlClusterSsmPaths(app);
  const clusterArn = StringParameter.valueForStringParameter(scope, paths.arn);
  const clusterEndpoint = StringParameter.valueForStringParameter(scope, paths.endpoint);
  return {
    clusterArn,
    clusterEndpoint,
    grantConnect(grantable: IGrantable) {
      grantable.grantPrincipal.addToPrincipalPolicy(
        new PolicyStatement({
          actions: ['dsql:DbConnect'],
          resources: [clusterArn],
        }),
      );
    },
  };
}
