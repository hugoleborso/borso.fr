export type StorageMode = 'git' | 'database';

const DATABASE_STORAGE: StorageMode = 'database';

// @FollowsBlueprint core-decision
export function isDatabaseStorage(mode: StorageMode | undefined): boolean {
  return mode === DATABASE_STORAGE;
}
