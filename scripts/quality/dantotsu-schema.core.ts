import {
  readField,
  readListValue,
  readNoneReason,
  stripQuotes,
  type DantotsuDocument,
} from './dantotsu-record.core';

export const INTRODUCED_AT_VALUES: readonly string[] = [
  'conception',
  'implementation',
  'self-validation',
  'code-review',
];
export const DETECTED_AT_VALUES: readonly string[] = [
  'typing',
  'linter',
  'local',
  'ci',
  'review',
  'qa',
  'staging',
  'production',
  'operator-deploy',
];
export const SEVERITY_VALUES: readonly string[] = ['low', 'medium', 'high'];
export const ERADICATION_LEVELS: readonly string[] = ['1', '2', '3', '4', '5'];
export const RECURS_REQUIRED_FROM = '2026-10-10';
export const SELF_COMMIT = 'self';

const SHARED_TAGS_FOR_A_RECURRENCE = 2;
const OVERLAPPING_ENTRIES_NAMED = 3;
const LEVELS_THAT_NEED_CODE: ReadonlySet<string> = new Set(['1', '2', '3', '4']);
const MARKDOWN_EXTENSION = '.md';
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const PULL_REQUEST_PATTERN = /^#\d+(, #\d+)*$/;
const COMMIT_PATTERN = /^[0-9a-f]{7,40}$/;
const FRONT_MATTER_PLACEHOLDER_PATTERN = /<[^>]*>|\bTBD\b|\bpending\b|to-be-filled/i;
const BODY_PLACEHOLDER_PATTERN =
  /<(this-commit|kaizen-commit|this-pr-sha|TBD|to-be-filled[^>]*|pending[^>]*)>/;
const REQUIRED_FIELDS: readonly string[] = [
  'date',
  'introduced-at',
  'detected-at',
  'severity',
  'related-pr',
  'fix-pr',
  'fix-commits',
  'eradication-level',
  'eradication-paths',
  'tags',
  'zone',
];
const ENUMERATED_FIELDS: readonly (readonly [string, readonly string[]])[] = [
  ['introduced-at', INTRODUCED_AT_VALUES],
  ['detected-at', DETECTED_AT_VALUES],
  ['severity', SEVERITY_VALUES],
  ['eradication-level', ERADICATION_LEVELS],
];

export interface SchemaFacts {
  readonly mainCommits: readonly string[];
  readonly trackedPaths: ReadonlySet<string>;
  readonly verifiedSlugs: ReadonlySet<string> | null;
}

export function resolveCommit(prefix: string, mainCommits: readonly string[]): string | null {
  const [only, ...others] = mainCommits.filter((commit) => commit.startsWith(prefix));
  return only !== undefined && others.length === 0 ? only : null;
}

function checkRequiredFields(document: DantotsuDocument): readonly string[] {
  return REQUIRED_FIELDS.filter((name) => readField(document, name) === undefined).map(
    (name) => `${document.slug}: \`${name}:\` is missing`,
  );
}

function checkEnumeratedFields(document: DantotsuDocument): readonly string[] {
  const problems: string[] = [];
  for (const [name, allowed] of ENUMERATED_FIELDS) {
    const value = readField(document, name);
    if (value !== undefined && !allowed.includes(stripQuotes(value))) {
      problems.push(`${document.slug}: \`${name}: ${value}\` is not one of ${allowed.join(' | ')}`);
    }
  }
  return problems;
}

function checkDate(document: DantotsuDocument): readonly string[] {
  const date = readField(document, 'date');
  if (date === undefined || DATE_PATTERN.test(date)) return [];
  return [`${document.slug}: \`date: ${date}\` is not a YYYY-MM-DD date`];
}

function checkPullRequestField(document: DantotsuDocument, name: string): readonly string[] {
  const value = readField(document, name);
  if (value === undefined || readNoneReason(value) !== null) return [];
  if (PULL_REQUEST_PATTERN.test(stripQuotes(value))) return [];
  return [`${document.slug}: \`${name}: ${value}\` is neither '#<number>' nor none (<reason>)`];
}

function checkPlaceholders(
  document: DantotsuDocument,
  fields: ReadonlyMap<string, string>,
): readonly string[] {
  const problems: string[] = [];
  for (const [name, value] of fields) {
    if (readNoneReason(value) === null && FRONT_MATTER_PLACEHOLDER_PATTERN.test(value)) {
      problems.push(`${document.slug}: \`${name}: ${value}\` is a placeholder`);
    }
  }
  const bodyPlaceholder = BODY_PLACEHOLDER_PATTERN.exec(document.body)?.[0];
  if (bodyPlaceholder !== undefined) {
    problems.push(`${document.slug}: the text still carries the placeholder ${bodyPlaceholder}`);
  }
  return problems;
}

function checkFixCommits(document: DantotsuDocument, facts: SchemaFacts): readonly string[] {
  const value = readField(document, 'fix-commits');
  if (value === undefined || readNoneReason(value) !== null) return [];
  const commits = readListValue(value);
  if (commits === null || commits.length === 0) {
    return [`${document.slug}: \`fix-commits:\` lists no commit; write none (<reason>)`];
  }
  const verified = facts.verifiedSlugs === null || facts.verifiedSlugs.has(document.slug);
  const problems: string[] = [];
  for (const commit of commits) {
    if (commit === SELF_COMMIT) continue;
    if (!COMMIT_PATTERN.test(commit)) {
      problems.push(`${document.slug}: \`${commit}\` in fix-commits is not a commit hash`);
    } else if (verified && resolveCommit(commit, facts.mainCommits) === null) {
      problems.push(`${document.slug}: commit ${commit} does not resolve to one commit on main`);
    }
  }
  return problems;
}

function checkEradicationPaths(document: DantotsuDocument, facts: SchemaFacts): readonly string[] {
  const paths = readListValue(readField(document, 'eradication-paths'));
  if (paths === null) return [];
  const problems = paths
    .filter((path) => !facts.trackedPaths.has(path))
    .map((path) => `${document.slug}: eradication path ${path} is not in the repository`);
  const level = readField(document, 'eradication-level');
  const namesCode = paths.some((path) => !path.endsWith(MARKDOWN_EXTENSION));
  if (level !== undefined && LEVELS_THAT_NEED_CODE.has(stripQuotes(level)) && !namesCode) {
    problems.push(
      `${document.slug}: level ${level} names no eradication file other than markdown; ` +
        'an instruction edit is level 5',
    );
  }
  return problems;
}

function checkTags(document: DantotsuDocument): readonly string[] {
  const tags = readListValue(readField(document, 'tags'));
  if (tags !== null && tags.length > 0) return [];
  return [`${document.slug}: \`tags:\` must be a non-empty [list]`];
}

function selectOverlappingEntries(
  document: DantotsuDocument,
  date: string,
  corpus: readonly DantotsuDocument[],
): readonly string[] {
  const tags = readListValue(readField(document, 'tags'));
  if (tags === null) return [];
  return corpus
    .filter((other) => other.slug !== document.slug && (readField(other, 'date') ?? '') <= date)
    .filter((other) => {
      const otherTags = readListValue(readField(other, 'tags'));
      return (
        otherTags !== null &&
        otherTags.filter((tag) => tags.includes(tag)).length >= SHARED_TAGS_FOR_A_RECURRENCE
      );
    })
    .map((other) => other.slug);
}

function checkRecurs(
  document: DantotsuDocument,
  corpus: readonly DantotsuDocument[],
): readonly string[] {
  const value = readField(document, 'recurs');
  if (value !== undefined) {
    if (readNoneReason(value) !== null) return [];
    const slugs = readListValue(value);
    if (slugs === null || slugs.length === 0) {
      return [`${document.slug}: \`recurs:\` is neither a [list] of entries nor none (<reason>)`];
    }
    const known = new Set(corpus.map((entry) => entry.slug));
    return slugs
      .filter((slug) => !known.has(slug))
      .map((slug) => `${document.slug}: recurs names ${slug}, which is not a dantotsu`);
  }
  const date = readField(document, 'date') ?? '';
  if (date < RECURS_REQUIRED_FROM) return [];
  const overlapping = selectOverlappingEntries(document, date, corpus);
  if (overlapping.length === 0) return [];
  return [
    `${document.slug}: shares ${String(SHARED_TAGS_FOR_A_RECURRENCE)} or more tags with ` +
      `${overlapping.slice(0, OVERLAPPING_ENTRIES_NAMED).join(', ')}; write recurs: [<entry>] ` +
      'naming the one this repeats, or recurs: none (<why it is a different class>)',
  ];
}

export function selectSchemaProblems(
  corpus: readonly DantotsuDocument[],
  facts: SchemaFacts,
): readonly string[] {
  const problems: string[] = [];
  for (const document of corpus) {
    const fields = document.fields;
    if (fields === null) {
      problems.push(`${document.slug}: has no front matter`);
      continue;
    }
    problems.push(
      ...checkRequiredFields(document),
      ...checkEnumeratedFields(document),
      ...checkDate(document),
      ...checkPullRequestField(document, 'related-pr'),
      ...checkPullRequestField(document, 'fix-pr'),
      ...checkPlaceholders(document, fields),
      ...checkFixCommits(document, facts),
      ...checkEradicationPaths(document, facts),
      ...checkTags(document),
      ...checkRecurs(document, corpus),
    );
  }
  return problems;
}
