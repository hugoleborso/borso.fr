/**
 * @DependsOnExternal aws-backup
 */

import {
  BackupClient,
  paginateListRecoveryPointsByBackupVault,
  StartBackupJobCommand,
  StartRestoreJobCommand,
} from '@aws-sdk/client-backup';

const DEFAULT_REGION = 'eu-west-3';

export interface RecoveryPoint {
  readonly recoveryPointArn: string;
  readonly status: string;
  readonly createdAt: Date;
}

export interface BackupJobRequest {
  readonly vaultName: string;
  readonly resourceArn: string;
  readonly serviceRoleArn: string;
}

export interface RestoreJobRequest {
  readonly recoveryPointArn: string;
  readonly serviceRoleArn: string;
  readonly metadata: Record<string, string>;
}

let cachedClient: BackupClient | null = null;

function getClient(): BackupClient {
  if (cachedClient !== null) return cachedClient;
  cachedClient = new BackupClient({ region: process.env.AWS_REGION ?? DEFAULT_REGION });
  return cachedClient;
}

export async function listRecoveryPoints(
  vaultName: string,
  resourceArn: string,
): Promise<RecoveryPoint[]> {
  const recoveryPoints: RecoveryPoint[] = [];
  const pages = paginateListRecoveryPointsByBackupVault(
    { client: getClient() },
    { BackupVaultName: vaultName, ByResourceArn: resourceArn },
  );
  for await (const page of pages) {
    for (const point of page.RecoveryPoints ?? []) {
      if (point.RecoveryPointArn === undefined || point.CreationDate === undefined) continue;
      recoveryPoints.push({
        recoveryPointArn: point.RecoveryPointArn,
        status: point.Status ?? 'UNKNOWN',
        createdAt: point.CreationDate,
      });
    }
  }
  return recoveryPoints;
}

export async function startBackupJob(request: BackupJobRequest): Promise<string | undefined> {
  const answer = await getClient().send(
    new StartBackupJobCommand({
      BackupVaultName: request.vaultName,
      ResourceArn: request.resourceArn,
      IamRoleArn: request.serviceRoleArn,
    }),
  );
  return answer.BackupJobId;
}

export async function startRestoreJob(request: RestoreJobRequest): Promise<string | undefined> {
  const answer = await getClient().send(
    new StartRestoreJobCommand({
      RecoveryPointArn: request.recoveryPointArn,
      IamRoleArn: request.serviceRoleArn,
      Metadata: request.metadata,
      CopySourceTagsToRestoredResource: true,
    }),
  );
  return answer.RestoreJobId;
}
