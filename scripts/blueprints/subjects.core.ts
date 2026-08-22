export interface MarkerClaim {
  readonly filePath: string;
  readonly blueprintId: string;
  readonly subject: string;
}

export type SubjectBaseline = Readonly<Record<string, Readonly<Record<string, string>>>>;

export interface DetachedClaim {
  readonly filePath: string;
  readonly blueprintId: string;
  readonly subject: string;
}

function byKey([left]: readonly [string, unknown], [right]: readonly [string, unknown]): number {
  // Stryker disable next-line EqualityOperator: equivalent mutant, both sides come from the keys of one Map and are therefore never equal
  return left < right ? -1 : 1;
}

export function buildSubjectBaseline(claims: readonly MarkerClaim[]): SubjectBaseline {
  const byFilePath = new Map<string, Map<string, string>>();
  for (const claim of claims) {
    const alreadySeen = byFilePath.get(claim.filePath);
    const subjects = alreadySeen ?? new Map<string, string>();
    subjects.set(claim.subject, claim.blueprintId);
    byFilePath.set(claim.filePath, subjects);
  }

  const baseline: Record<string, Record<string, string>> = {};
  for (const [filePath, subjects] of [...byFilePath.entries()].toSorted(byKey)) {
    baseline[filePath] = Object.fromEntries([...subjects.entries()].toSorted(byKey));
  }
  return baseline;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseSubjectBaseline(raw: string): SubjectBaseline | undefined {
  const parsed: unknown = JSON.parse(raw);
  if (!isPlainObject(parsed)) return undefined;

  const baseline: Record<string, Record<string, string>> = {};
  for (const [filePath, claimed] of Object.entries(parsed)) {
    if (!isPlainObject(claimed)) return undefined;
    const subjects: Record<string, string> = {};
    for (const [subject, blueprintId] of Object.entries(claimed)) {
      if (typeof blueprintId !== 'string') return undefined;
      subjects[subject] = blueprintId;
    }
    baseline[filePath] = subjects;
  }
  return baseline;
}

export function listDetachedClaims(
  recorded: SubjectBaseline,
  current: readonly MarkerClaim[],
  hasDeclarationOf: (filePath: string, subject: string) => boolean,
): DetachedClaim[] {
  const claimedNow = buildSubjectBaseline(current);
  const detached: DetachedClaim[] = [];

  for (const [filePath, recordedSubjects] of Object.entries(recorded)) {
    const subjectsNow = claimedNow[filePath];
    if (subjectsNow === undefined) continue;

    for (const [subject, blueprintId] of Object.entries(recordedSubjects)) {
      if (subjectsNow[subject] === blueprintId) continue;
      if (!hasDeclarationOf(filePath, subject)) continue;
      detached.push({ filePath, blueprintId, subject });
    }
  }
  return detached;
}

export function describeDetachedClaim(claim: DetachedClaim): string {
  return (
    `${claim.filePath}: the \`@FollowsBlueprint ${claim.blueprintId}\` marker no longer names ` +
    `\`${claim.subject}\`, which the file still declares. A marker is bound to its subject by ` +
    'position, so a declaration inserted under one moves the claim without changing any count. ' +
    'Move the marker back, or accept the new subject in the same commit: ' +
    '`pnpm exec tsx .claude/skills/blueprint/blueprint-indexing.ts --accept`.'
  );
}
