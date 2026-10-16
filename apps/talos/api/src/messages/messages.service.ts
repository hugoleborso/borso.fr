import { readContentRepository } from '../content/content-store.setup';
import { readTalosSecret } from '../helpers/secrets/secrets.setup';
import { readStorageMode, type StorageMode } from '../memory/memory-cutover.service';

export interface ClaudeCodeTarget {
  readonly repository: string;
  readonly storage: StorageMode;
  readonly environments: {
    readonly talos: string | null;
    readonly build: string | null;
  };
}

// @FollowsBlueprint service-read-model
export async function readClaudeCodeTarget(): Promise<ClaudeCodeTarget> {
  const [talos, build, storage] = await Promise.all([
    readTalosSecret('claude-environment-talos'),
    readTalosSecret('claude-environment-build'),
    readStorageMode(),
  ]);
  return {
    repository: readContentRepository(),
    storage,
    environments: { talos: talos ?? null, build: build ?? null },
  };
}
