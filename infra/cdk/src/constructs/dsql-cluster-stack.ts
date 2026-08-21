import { Stack, type StackProps } from 'aws-cdk-lib';
import type { Construct } from 'constructs';
import { DsqlCluster, type IDsqlCluster } from './dsql-cluster.js';

const PRODUCTION_GRADE_LIFECYCLE_STAGE = 'prod';

export interface DsqlClusterStackProps extends StackProps {
  readonly app: string;
  readonly deletionProtection?: boolean;
}

export class DsqlClusterStack extends Stack {
  public readonly cluster: IDsqlCluster;

  constructor(scope: Construct, id: string, props: DsqlClusterStackProps) {
    super(scope, id, props);
    this.cluster = new DsqlCluster(this, 'Cluster', {
      app: props.app,
      stage: PRODUCTION_GRADE_LIFECYCLE_STAGE,
      ...(props.deletionProtection === undefined
        ? {}
        : { deletionProtection: props.deletionProtection }),
    });
  }
}
