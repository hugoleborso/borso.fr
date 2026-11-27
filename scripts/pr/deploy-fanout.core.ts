const APPLICATION_PREFIX = 'apps/';
const CONSTRUCTS_PREFIX = 'infra/cdk/';
const WORKSPACE_MANIFEST_PATHS = new Set(['pnpm-workspace.yaml', 'pnpm-lock.yaml', 'package.json']);
const PACKAGE_MANIFEST_PATTERN = /^(apps|infra)\/[^/]+\/package\.json$/;

const SHARED_INPUT_REASON =
  'infra/cdk or a dependency manifest changed, so every application is a candidate.';
const NO_APPLICATION_PATH_REASON = 'no application path changed.';
const NAMED_REASON = 'only these applications have changed paths.';
const CANDIDATES_SUFFIX =
  ' deploy.yml synthesizes each candidate at both commits and keeps those whose templates or assets differ.';
const OUTPUT_CHANGED_REASON = 'their synthesized templates or assets differ from the base.';
const OUTPUT_UNCHANGED_REASON = 'every candidate synthesizes exactly what the base synthesizes.';

export interface DeployFanout {
  readonly applications: readonly string[];
  readonly reason: string;
}

function isUnderApplication(changedPath: string, slug: string): boolean {
  return changedPath.startsWith(`${APPLICATION_PREFIX}${slug}/`);
}

function isASharedInput(changedPath: string): boolean {
  return (
    changedPath.startsWith(CONSTRUCTS_PREFIX) ||
    WORKSPACE_MANIFEST_PATHS.has(changedPath) ||
    PACKAGE_MANIFEST_PATTERN.test(changedPath)
  );
}

export function decideDeployCandidates(
  changedPaths: readonly string[],
  applicationSlugs: readonly string[],
): DeployFanout {
  const sortedSlugs = [...applicationSlugs].sort();
  if (changedPaths.some(isASharedInput)) {
    return {
      applications: sortedSlugs,
      reason: SHARED_INPUT_REASON + CANDIDATES_SUFFIX,
    };
  }
  const named = sortedSlugs.filter((slug) =>
    changedPaths.some((changedPath) => isUnderApplication(changedPath, slug)),
  );
  return {
    applications: named,
    reason: named.length === 0 ? NO_APPLICATION_PATH_REASON : NAMED_REASON + CANDIDATES_SUFFIX,
  };
}

export function keepChangedOutput(
  candidates: DeployFanout,
  applicationsWithChangedOutput: readonly string[],
): DeployFanout {
  const applications = candidates.applications.filter((slug) =>
    applicationsWithChangedOutput.includes(slug),
  );
  return {
    applications,
    reason: applications.length === 0 ? OUTPUT_UNCHANGED_REASON : OUTPUT_CHANGED_REASON,
  };
}

export function describeDeployFanout(fanout: DeployFanout): string {
  const list = fanout.applications.length === 0 ? 'none' : fanout.applications.join(', ');
  return `${list} — ${fanout.reason}`;
}
