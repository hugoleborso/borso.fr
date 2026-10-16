import {
  type BackupJobRequest,
  listRecoveryPoints,
  type RestoreJobRequest,
  startBackupJob,
  startRestoreJob,
} from '../helpers/backup/backup-vault.client';
import {
  buildRestoreMetadata,
  latestCompletedRecoveryPoint,
  type RecoveryPointSummary,
} from './restore-drill.core';

export interface RestoreDrillDependencies {
  readonly listPoints?: (vaultName: string, resourceArn: string) => Promise<RecoveryPointSummary[]>;
  readonly startBackup?: (request: BackupJobRequest) => Promise<string | undefined>;
  readonly startRestore?: (request: RestoreJobRequest) => Promise<string | undefined>;
  readonly environment?: Readonly<Record<string, string | undefined>>;
}

export type RestoreDrillStep =
  | { readonly step: 'backup-started'; readonly backupJobId: string }
  | {
      readonly step: 'restore-started';
      readonly recoveryPointArn: string;
      readonly restoreJobId: string;
    };

export class RestoreDrillError extends Error {
  override readonly name = 'RestoreDrillError';
}

const CONFIGURATION_VARIABLES = [
  'BACKUP_VAULT_NAME',
  'BACKUP_ROLE_ARN',
  'CLUSTER_ARN',
  'AWS_REGION',
] as const;
type ConfigurationVariable = (typeof CONFIGURATION_VARIABLES)[number];

function readConfiguration(
  environment: Readonly<Record<string, string | undefined>>,
): Record<ConfigurationVariable, string> {
  const configuration = Object.fromEntries(
    CONFIGURATION_VARIABLES.map((name) => [name, environment[name] ?? '']),
  );
  const missing = CONFIGURATION_VARIABLES.filter((name) => configuration[name] === '');
  if (missing.length > 0) throw new RestoreDrillError(`missing ${missing.join(', ')}`);
  return {
    BACKUP_VAULT_NAME: String(configuration.BACKUP_VAULT_NAME),
    BACKUP_ROLE_ARN: String(configuration.BACKUP_ROLE_ARN),
    CLUSTER_ARN: String(configuration.CLUSTER_ARN),
    AWS_REGION: String(configuration.AWS_REGION),
  };
}

function requireJobId(jobId: string | undefined, job: string): string {
  if (jobId === undefined) throw new RestoreDrillError(`AWS Backup returned no ${job} job id`);
  return jobId;
}

// @FollowsBlueprint adapter-external-service
export async function runRestoreDrill(
  dependencies: RestoreDrillDependencies = {},
): Promise<RestoreDrillStep> {
  const configuration = readConfiguration(dependencies.environment ?? process.env);
  const listPoints = dependencies.listPoints ?? listRecoveryPoints;
  const recoveryPointArn = latestCompletedRecoveryPoint(
    await listPoints(configuration.BACKUP_VAULT_NAME, configuration.CLUSTER_ARN),
  );
  if (recoveryPointArn === null) {
    const startBackup = dependencies.startBackup ?? startBackupJob;
    const backupJobId = await startBackup({
      vaultName: configuration.BACKUP_VAULT_NAME,
      resourceArn: configuration.CLUSTER_ARN,
      serviceRoleArn: configuration.BACKUP_ROLE_ARN,
    });
    return { step: 'backup-started', backupJobId: requireJobId(backupJobId, 'backup') };
  }
  const startRestore = dependencies.startRestore ?? startRestoreJob;
  const restoreJobId = await startRestore({
    recoveryPointArn,
    serviceRoleArn: configuration.BACKUP_ROLE_ARN,
    metadata: buildRestoreMetadata(configuration.AWS_REGION),
  });
  return {
    step: 'restore-started',
    recoveryPointArn,
    restoreJobId: requireJobId(restoreJobId, 'restore'),
  };
}
