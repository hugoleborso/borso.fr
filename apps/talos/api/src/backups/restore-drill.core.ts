const COMPLETED_STATUS = 'COMPLETED';

export interface RecoveryPointSummary {
  readonly recoveryPointArn: string;
  readonly status: string;
  readonly createdAt: Date;
}

export function latestCompletedRecoveryPoint(
  recoveryPoints: readonly RecoveryPointSummary[],
): string | null {
  const completed = recoveryPoints.filter((point) => point.status === COMPLETED_STATUS);
  const latest = completed.reduce<RecoveryPointSummary | null>(
    (newest, point) =>
      newest === null || point.createdAt.getTime() > newest.createdAt.getTime() ? point : newest,
    null,
  );
  return latest?.recoveryPointArn ?? null;
}

export function buildRestoreMetadata(region: string): Record<string, string> {
  return {
    regionalConfig: JSON.stringify([{ region, isDeletionProtectionEnabled: false }]),
  };
}
