import type { StorageMode } from '@domain/storage-mode.core';

export const CUTOVER_CACHE_MILLISECONDS = 30_000;
export const CUTOVER_STATE_KEY = 'cutover';

export interface StorageModeReading {
  readonly mode: StorageMode;
  readonly readAtMilliseconds: number;
}

export function isCutoverKey(key: string): boolean {
  return key === CUTOVER_STATE_KEY;
}

// @FollowsBlueprint core-decision
export function isStorageModeReadingFresh(
  reading: StorageModeReading | null,
  nowMilliseconds: number,
): reading is StorageModeReading {
  return (
    reading !== null && nowMilliseconds - reading.readAtMilliseconds < CUTOVER_CACHE_MILLISECONDS
  );
}
