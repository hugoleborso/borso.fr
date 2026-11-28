// @FollowsBlueprint utils-pure-module
import { createHash } from 'node:crypto';

const DEPLOYED_FILE = /\.(template|assets)\.json$/u;

export interface SynthesizedFile {
  readonly name: string;
  readonly content: string;
}

export type OutputDigest = string | null;

export function isDeployedFile(name: string): boolean {
  return DEPLOYED_FILE.test(name);
}

export function digestSynthesizedOutput(files: readonly SynthesizedFile[]): OutputDigest {
  const deployed = files
    .filter((file) => isDeployedFile(file.name))
    .toSorted((left, right) => left.name.localeCompare(right.name));
  if (deployed.length === 0) return null;
  const hash = createHash('sha256');
  for (const file of deployed) hash.update(`${file.name}\0${file.content}\0`);
  return hash.digest('hex');
}

export function listAppsWhoseDigestDiffers(
  apps: readonly string[],
  baseDigests: ReadonlyMap<string, OutputDigest>,
  headDigests: ReadonlyMap<string, OutputDigest>,
): string[] {
  return apps.filter((app) => {
    const head = headDigests.get(app) ?? null;
    return head === null || head !== (baseDigests.get(app) ?? null);
  });
}
