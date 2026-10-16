import { CfnOutput, Duration } from 'aws-cdk-lib';
import { BackupPlan, BackupPlanRule, BackupResource, BackupVault } from 'aws-cdk-lib/aws-backup';
import { Schedule } from 'aws-cdk-lib/aws-events';
import { ManagedPolicy, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { assertDeployStage, type Stage, validateAppSlug } from '../internal/naming.utils.js';
import { applyStandardTags } from '../internal/tags.js';

const DEFAULT_RETENTION_DAYS = 35;
const DAILY_BACKUP_HOUR_UTC = '3';
const DAILY_BACKUP_MINUTE = '0';
const BACKUP_SERVICE_PRINCIPAL = 'backup.amazonaws.com';
const BACKUP_SERVICE_POLICIES = [
  'service-role/AWSBackupServiceRolePolicyForBackup',
  'service-role/AWSBackupServiceRolePolicyForRestores',
];

export interface DsqlClusterBackupProps {
  readonly app: string;
  readonly stage: Stage;
  readonly clusterArn: string;
  readonly retentionDays?: number;
}

// @FollowsBlueprint reusable-cdk-construct
export class DsqlClusterBackup extends Construct {
  public readonly vault: BackupVault;
  public readonly plan: BackupPlan;
  public readonly serviceRoleArn: string;

  constructor(scope: Construct, id: string, props: DsqlClusterBackupProps) {
    super(scope, id);
    validateAppSlug(props.app);
    assertDeployStage(props.stage);
    applyStandardTags(this, props);

    const backupName = `${props.app}-dsql-backups`;
    this.vault = new BackupVault(this, 'Vault', { backupVaultName: backupName });
    this.plan = new BackupPlan(this, 'Plan', {
      backupPlanName: backupName,
      backupVault: this.vault,
      backupPlanRules: [
        new BackupPlanRule({
          ruleName: 'daily',
          scheduleExpression: Schedule.cron({
            hour: DAILY_BACKUP_HOUR_UTC,
            minute: DAILY_BACKUP_MINUTE,
          }),
          deleteAfter: Duration.days(props.retentionDays ?? DEFAULT_RETENTION_DAYS),
        }),
      ],
    });
    const serviceRole = new Role(this, 'ServiceRole', {
      assumedBy: new ServicePrincipal(BACKUP_SERVICE_PRINCIPAL),
      managedPolicies: BACKUP_SERVICE_POLICIES.map((policyName) =>
        ManagedPolicy.fromAwsManagedPolicyName(policyName),
      ),
    });
    this.plan.addSelection('Cluster', {
      resources: [BackupResource.fromArn(props.clusterArn)],
      role: serviceRole,
    });
    this.serviceRoleArn = serviceRole.roleArn;

    new CfnOutput(this, 'VaultName', { value: this.vault.backupVaultName });
    new CfnOutput(this, 'ServiceRoleArn', { value: this.serviceRoleArn });
  }
}
