/**
 * @vitest-environment node
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  listRecoveryPoints,
  startBackupJob,
  startRestoreJob,
} from '../helpers/backup/backup-vault.client';
import { RestoreDrillError, runRestoreDrill } from './restore-drill.adapter';

vi.mock('../helpers/backup/backup-vault.client', () => ({
  listRecoveryPoints: vi.fn(),
  startBackupJob: vi.fn(),
  startRestoreJob: vi.fn(),
}));

const ENVIRONMENT = {
  BACKUP_VAULT_NAME: 'talos-dsql-backups',
  BACKUP_ROLE_ARN: 'arn:aws:iam::123456789012:role/backup',
  CLUSTER_ARN: 'arn:aws:dsql:eu-west-3:123456789012:cluster/talos',
  AWS_REGION: 'eu-west-3',
};
const COMPLETED_POINT = {
  recoveryPointArn: 'arn:aws:backup:eu-west-3:123456789012:recovery-point:p1',
  status: 'COMPLETED',
  createdAt: new Date('2026-10-16T03:00:00Z'),
};

const listsNothing = async () => await Promise.resolve([]);
const listsCompletedPoint = async () => await Promise.resolve([COMPLETED_POINT]);
const answersJob = (jobId: string | undefined) => vi.fn(async () => await Promise.resolve(jobId));

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

// @FollowsBlueprint test-node-adapter
describe('runRestoreDrill', () => {
  it('starts a backup of the cluster when the vault holds no completed point', async () => {
    const startBackup = answersJob('backup-1');
    const startRestore = answersJob('restore-1');
    const step = await runRestoreDrill({
      listPoints: listsNothing,
      startBackup,
      startRestore,
      environment: ENVIRONMENT,
    });
    expect(step).toEqual({ step: 'backup-started', backupJobId: 'backup-1' });
    expect(startBackup).toHaveBeenCalledWith({
      vaultName: 'talos-dsql-backups',
      resourceArn: ENVIRONMENT.CLUSTER_ARN,
      serviceRoleArn: ENVIRONMENT.BACKUP_ROLE_ARN,
    });
    expect(startRestore).not.toHaveBeenCalled();
  });

  it('restores the latest point to a new cluster without deletion protection', async () => {
    const startRestore = answersJob('restore-1');
    const step = await runRestoreDrill({
      listPoints: listsCompletedPoint,
      startRestore,
      environment: ENVIRONMENT,
    });
    expect(step).toEqual({
      step: 'restore-started',
      recoveryPointArn: COMPLETED_POINT.recoveryPointArn,
      restoreJobId: 'restore-1',
    });
    expect(startRestore).toHaveBeenCalledWith({
      recoveryPointArn: COMPLETED_POINT.recoveryPointArn,
      serviceRoleArn: ENVIRONMENT.BACKUP_ROLE_ARN,
      metadata: {
        regionalConfig: '[{"region":"eu-west-3","isDeletionProtectionEnabled":false}]',
      },
    });
  });

  it('falls back to the process environment and the AWS Backup client', async () => {
    for (const [name, value] of Object.entries(ENVIRONMENT)) vi.stubEnv(name, value);
    vi.mocked(listRecoveryPoints).mockResolvedValue([]);
    vi.mocked(startBackupJob).mockResolvedValue('backup-2');
    await expect(runRestoreDrill()).resolves.toEqual({
      step: 'backup-started',
      backupJobId: 'backup-2',
    });
    expect(listRecoveryPoints).toHaveBeenCalledWith('talos-dsql-backups', ENVIRONMENT.CLUSTER_ARN);
    vi.mocked(listRecoveryPoints).mockResolvedValue([COMPLETED_POINT]);
    vi.mocked(startRestoreJob).mockResolvedValue('restore-2');
    await expect(runRestoreDrill()).resolves.toMatchObject({ restoreJobId: 'restore-2' });
  });

  it('names every missing setting', async () => {
    await expect(
      runRestoreDrill({ environment: { BACKUP_VAULT_NAME: 'v', AWS_REGION: 'eu-west-3' } }),
    ).rejects.toThrow(new RestoreDrillError('missing BACKUP_ROLE_ARN, CLUSTER_ARN'));
  });

  it('fails when AWS Backup returns no backup job id', async () => {
    await expect(
      runRestoreDrill({
        listPoints: listsNothing,
        startBackup: answersJob(undefined),
        environment: ENVIRONMENT,
      }),
    ).rejects.toThrow('AWS Backup returned no backup job id');
  });

  it('fails when AWS Backup returns no restore job id', async () => {
    await expect(
      runRestoreDrill({
        listPoints: listsCompletedPoint,
        startRestore: answersJob(undefined),
        environment: ENVIRONMENT,
      }),
    ).rejects.toMatchObject({ name: 'RestoreDrillError' });
  });
});
