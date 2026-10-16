import { describe, expect, it } from 'vitest';
import { buildRestoreMetadata, latestCompletedRecoveryPoint } from './restore-drill.core';

const point = (recoveryPointArn: string, status: string, createdAt: string) => ({
  recoveryPointArn,
  status,
  createdAt: new Date(createdAt),
});

describe('latestCompletedRecoveryPoint', () => {
  it('picks the newest completed point', () => {
    expect(
      latestCompletedRecoveryPoint([
        point('older', 'COMPLETED', '2026-10-14T03:00:00Z'),
        point('newest', 'COMPLETED', '2026-10-16T03:00:00Z'),
        point('middle', 'COMPLETED', '2026-10-15T03:00:00Z'),
      ]),
    ).toBe('newest');
  });

  it('skips a point that is not completed yet', () => {
    expect(
      latestCompletedRecoveryPoint([
        point('done', 'COMPLETED', '2026-10-15T03:00:00Z'),
        point('running', 'CREATING', '2026-10-16T03:00:00Z'),
      ]),
    ).toBe('done');
  });

  it('answers null when nothing can be restored', () => {
    expect(
      latestCompletedRecoveryPoint([point('x', 'PARTIAL', '2026-10-16T03:00:00Z')]),
    ).toBeNull();
  });
});

describe('buildRestoreMetadata', () => {
  it('restores into one region with deletion protection off', () => {
    expect(buildRestoreMetadata('eu-west-3')).toEqual({
      regionalConfig: '[{"region":"eu-west-3","isDeletionProtectionEnabled":false}]',
    });
  });
});
