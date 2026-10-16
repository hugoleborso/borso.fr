import { Stack, type StackProps } from 'aws-cdk-lib';
import type { Construct } from 'constructs';
import { DsqlCluster, type IDsqlCluster } from './dsql-cluster.js';
import { DsqlClusterBackup } from './dsql-cluster-backup.js';

const PRODUCTION_GRADE_LIFECYCLE_STAGE = 'prod';

export interface DsqlClusterStackProps extends StackProps {
  readonly app: string;
  readonly deletionProtection?: boolean;
  readonly backup?: { readonly retentionDays?: number };
}

export class DsqlClusterStack extends Stack {
  public readonly cluster: IDsqlCluster;
  public readonly backup: DsqlClusterBackup | undefined;

  constructor(scope: Construct, id: string, props: DsqlClusterStackProps) {
    super(scope, id, props);
    this.cluster = new DsqlCluster(this, 'Cluster', {
      app: props.app,
      stage: PRODUCTION_GRADE_LIFECYCLE_STAGE,
      ...(props.deletionProtection === undefined
        ? {}
        : { deletionProtection: props.deletionProtection }),
    });
    this.backup =
      props.backup === undefined
        ? undefined
        : new DsqlClusterBackup(this, 'Backup', {
            app: props.app,
            stage: PRODUCTION_GRADE_LIFECYCLE_STAGE,
            clusterArn: this.cluster.clusterArn,
            ...props.backup,
          });
  }
}
