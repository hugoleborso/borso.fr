import { readContentRepository } from '../content/content-store.setup';
import { readTalosSecret } from '../helpers/secrets/secrets.setup';

export interface ClaudeCodeTarget {
  readonly repository: string;
  readonly environments: {
    readonly talos: string | null;
    readonly build: string | null;
  };
}

// @FollowsBlueprint service-read-model
export async function readClaudeCodeTarget(): Promise<ClaudeCodeTarget> {
  const [talos, build] = await Promise.all([
    readTalosSecret('claude-environment-talos'),
    readTalosSecret('claude-environment-build'),
  ]);
  return {
    repository: readContentRepository(),
    environments: { talos: talos ?? null, build: build ?? null },
  };
}
