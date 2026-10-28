import { readTalosSecret } from '../helpers/secrets/secrets.setup';

const REPOSITORY_VARIABLE = 'GITHUB_REPO';
const DEFAULT_REPOSITORY = 'hugoleborso/talos';

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
    repository: process.env[REPOSITORY_VARIABLE] ?? DEFAULT_REPOSITORY,
    environments: { talos: talos ?? null, build: build ?? null },
  };
}
