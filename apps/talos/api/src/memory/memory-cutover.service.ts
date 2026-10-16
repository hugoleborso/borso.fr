import {
  isStorageModeReadingFresh,
  type StorageMode,
  type StorageModeReading,
} from './memory-cutover.core';
import { readCutover } from './memory-read.service';

export type { StorageMode } from './memory-cutover.core';

interface StorageModeHolder {
  latest: StorageModeReading | null;
}

const holder: StorageModeHolder = { latest: null };

// @FollowsBlueprint service-read-model
export async function readStorageMode(): Promise<StorageMode> {
  const nowMilliseconds = Date.now();
  if (isStorageModeReadingFresh(holder.latest, nowMilliseconds)) return holder.latest.mode;
  const mode = await readCutover();
  holder.latest = { mode, readAtMilliseconds: nowMilliseconds };
  return mode;
}

export async function isMemoryInDatabase(): Promise<boolean> {
  return (await readStorageMode()) === 'database';
}

export function forgetStorageMode(): void {
  holder.latest = null;
}
