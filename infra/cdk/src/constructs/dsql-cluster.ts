import { CfnResource, Fn } from 'aws-cdk-lib';
import { type IGrantable, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import {
  assertDeployStage,
  dsqlClusterSsmPaths,
  type Stage,
  validateAppSlug,
} from '../internal/naming.utils.js';
import { applyStandardTags, standardTagPairs } from '../internal/tags.js';

const DSQL_CONNECT_ACTION = 'dsql:DbConnect';

const CLUSTER_ARN_CLOUDFORMATION_TEMPLATE =
  'arn:aws:dsql:${AWS::Region}:${AWS::AccountId}:cluster/${ClusterId}';
const CLUSTER_ENDPOINT_CLOUDFORMATION_TEMPLATE = '${ClusterId}.dsql.${AWS::Region}.on.aws';

function grantDsqlConnect(grantable: IGrantable, clusterArn: string): void {
  grantable.grantPrincipal.addToPrincipalPolicy(
    new PolicyStatement({
      actions: [DSQL_CONNECT_ACTION],
      resources: [clusterArn],
    }),
  );
}

export interface IDsqlCluster {
  readonly clusterArn: string;
  readonly clusterEndpoint: string;
  grantConnect(grantable: IGrantable): void;
}

export interface DsqlClusterProps {
  readonly app: string;
  readonly stage: Stage;
  readonly deletionProtection?: boolean;
}

// @FollowsBlueprint reusable-cdk-construct
export class DsqlCluster extends Construct implements IDsqlCluster {
  public readonly clusterArn: string;
  public readonly clusterEndpoint: string;

  constructor(scope: Construct, id: string, props: DsqlClusterProps) {
    super(scope, id);
    validateAppSlug(props.app);
    assertDeployStage(props.stage);
    applyStandardTags(this, props);

    const cluster = new CfnResource(this, 'Cluster', {
      type: 'AWS::DSQL::Cluster',
      properties: {
        DeletionProtectionEnabled: props.deletionProtection ?? true,
        Tags: standardTagPairs(props),
      },
    });
    this.clusterArn = Fn.sub(CLUSTER_ARN_CLOUDFORMATION_TEMPLATE, { ClusterId: cluster.ref });
    this.clusterEndpoint = Fn.sub(CLUSTER_ENDPOINT_CLOUDFORMATION_TEMPLATE, {
      ClusterId: cluster.ref,
    });

    const ssm = dsqlClusterSsmPaths(props.app);
    new StringParameter(this, 'ArnParam', {
      parameterName: ssm.arn,
      stringValue: this.clusterArn,
    });
    new StringParameter(this, 'EndpointParam', {
      parameterName: ssm.endpoint,
      stringValue: this.clusterEndpoint,
    });
  }

  public grantConnect(grantable: IGrantable): void {
    grantDsqlConnect(grantable, this.clusterArn);
  }
}

export function lookupDsqlCluster(scope: Construct, app: string): IDsqlCluster {
  validateAppSlug(app);
  const paths = dsqlClusterSsmPaths(app);
  const clusterArn = StringParameter.valueForStringParameter(scope, paths.arn);
  const clusterEndpoint = StringParameter.valueForStringParameter(scope, paths.endpoint);
  return {
    clusterArn,
    clusterEndpoint,
    grantConnect(grantable: IGrantable) {
      grantDsqlConnect(grantable, clusterArn);
    },
  };
}
