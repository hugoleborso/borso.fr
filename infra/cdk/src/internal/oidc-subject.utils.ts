export type SubjectKind =
  | { readonly kind: 'environment'; readonly environment: string }
  | { readonly kind: 'pull_request' }
  | { readonly kind: 'branch'; readonly branch: string }
  | { readonly kind: 'any' };

export type SubjectFormat =
  | { readonly kind: 'name' }
  | { readonly kind: 'immutable'; readonly ownerId: number; readonly repositoryId: number };

export interface GithubSubject {
  readonly repo: string;
  readonly subjectFormat: SubjectFormat;
  readonly subjects: readonly SubjectKind[];
}

function requireGithubId(label: string, value: number): number {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`githubSubClaims: ${label} must be a positive integer, got ${value}.`);
  }
  return value;
}

function splitRepo(repo: string): { owner: string; name: string } {
  const [owner, name, ...rest] = repo.split('/');
  if (!owner || !name || rest.length > 0) {
    throw new Error(`githubSubClaims: repo must be "owner/name", got "${repo}".`);
  }
  return { owner, name };
}

function repositoryPrefix(repo: string, format: SubjectFormat): string {
  const { owner, name } = splitRepo(repo);
  if (format.kind === 'name') {
    return `repo:${owner}/${name}`;
  }
  const ownerId = requireGithubId('ownerId', format.ownerId);
  const repositoryId = requireGithubId('repositoryId', format.repositoryId);
  return `repo:${owner}@${ownerId}/${name}@${repositoryId}`;
}

function subClaimFor(prefix: string, subject: SubjectKind): string {
  switch (subject.kind) {
    case 'environment':
      return `${prefix}:environment:${subject.environment}`;
    case 'pull_request':
      return `${prefix}:pull_request`;
    case 'branch':
      return `${prefix}:ref:refs/heads/${subject.branch}`;
    case 'any':
      return `${prefix}:*`;
  }
}

export function githubSubClaims(subject: GithubSubject): string[] {
  const prefix = repositoryPrefix(subject.repo, subject.subjectFormat);
  return subject.subjects.map((kind) => subClaimFor(prefix, kind));
}
