const APPLICATION_PREFIX = 'apps/';
const CONSTRUCTS_PREFIX = 'infra/cdk/';
const WORKSPACE_MANIFEST_PATHS = new Set(['pnpm-workspace.yaml', 'pnpm-lock.yaml', 'package.json']);
const PACKAGE_MANIFEST_PATTERN = /^(apps|infra)\/[^/]+\/package\.json$/;

const CONSTRUCTS_REASON =
  'infra/cdk changed, and deploy.yml fans that out to every application: the constructs are the contract.';
const NO_APPLICATION_PATH_REASON = 'no application path changed.';
const NAMED_REASON = 'only these applications have changed paths.';
const DEPENDENCY_SUFFIX =
  ' A dependency manifest also moved, so deploy.yml asks apps-with-changed-dependencies.ts which applications resolve something different and adds them; it falls back to every application when it cannot answer.';

export interface DeployFanout {
  readonly applications: readonly string[];
  readonly everyApplication: boolean;
  readonly dependencyManifestMoved: boolean;
  readonly reason: string;
}

function isUnderApplication(changedPath: string, slug: string): boolean {
  return changedPath.startsWith(`${APPLICATION_PREFIX}${slug}/`);
}

function isADependencyManifest(changedPath: string): boolean {
  return WORKSPACE_MANIFEST_PATHS.has(changedPath) || PACKAGE_MANIFEST_PATTERN.test(changedPath);
}

export function decideDeployFanout(
  changedPaths: readonly string[],
  applicationSlugs: readonly string[],
): DeployFanout {
  const sortedSlugs = [...applicationSlugs].sort();
  const dependencyManifestMoved = changedPaths.some(isADependencyManifest);

  if (changedPaths.some((changedPath) => changedPath.startsWith(CONSTRUCTS_PREFIX))) {
    return {
      applications: sortedSlugs,
      everyApplication: true,
      dependencyManifestMoved,
      reason: CONSTRUCTS_REASON,
    };
  }

  const named = sortedSlugs.filter((slug) =>
    changedPaths.some((changedPath) => isUnderApplication(changedPath, slug)),
  );
  const base = named.length === 0 ? NO_APPLICATION_PATH_REASON : NAMED_REASON;

  return {
    applications: named,
    everyApplication: false,
    dependencyManifestMoved,
    reason: dependencyManifestMoved ? base + DEPENDENCY_SUFFIX : base,
  };
}

export function describeDeployFanout(fanout: DeployFanout): string {
  const list = fanout.applications.length === 0 ? 'none' : fanout.applications.join(', ');
  return `${list} — ${fanout.reason}`;
}
