/**
 * Finds the places where this repository has two spellings for one idea.
 *
 * Every rule in `docs/standards/` answers a question somebody already decided.
 * Drift is the opposite shape: a question nobody decided, where the codebase
 * has quietly answered it two ways. `clock-store.ts` beside `clock.store.ts`.
 * `useNavBadges.ts` in one application and `online-status.hook.ts` in another.
 * A page called `Login.tsx` and sixteen called `*Page.tsx`. None of those breaks
 * a rule, because no rule exists; each one is a rule waiting to be written, and
 * the moment to write it is while there are two spellings rather than twenty.
 *
 * A lint rule cannot find these, because a lint rule needs the answer first.
 * This module derives the questions from the tree instead: it groups files by
 * the role their path gives them, and reports a group whose members disagree
 * about how to be named.
 *
 * Nothing here fails a build on its own. `convention-drift.ts` compares the
 * result against a committed baseline and fails only on an increase, because
 * twenty existing divergences are a backlog and the twenty-first is a decision
 * being taken by accident.
 */

export type CaseStyle = 'kebab' | 'camel' | 'pascal' | 'other';

const KEBAB_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const CAMEL_PATTERN = /^[a-z][a-z0-9]*([A-Z][a-z0-9]*)+$/;
const PASCAL_PATTERN = /^[A-Z][a-z0-9]*([A-Z][a-z0-9]*)*$/;

/** The stem is the name with every `.suffix` removed, e.g. `songs` in `songs.queries.ts`. */
export function readNameStem(basename: string): string {
  const firstDot = basename.indexOf('.');
  return firstDot === -1 ? basename : basename.slice(0, firstDot);
}

const NAME_SUFFIX_PATTERN = /\.([a-z0-9-]+)\.[a-z]+$/;

/** The dotted suffix a file carries, e.g. `queries` in `songs.queries.ts`. */
export function readNameSuffix(basename: string): string | null {
  return NAME_SUFFIX_PATTERN.exec(basename)?.[1] ?? null;
}

/**
 * A one-word lowercase name is kebab-case with one word, not a third style.
 * Reading `books` and `self-punch` as two conventions reported nineteen of
 * twenty-one controllers as divergent when every one of them agrees.
 */
export function readCaseStyle(stem: string): CaseStyle {
  if (KEBAB_PATTERN.test(stem)) return 'kebab';
  if (CAMEL_PATTERN.test(stem)) return 'camel';
  if (PASCAL_PATTERN.test(stem)) return 'pascal';
  return 'other';
}

export interface FileFact {
  readonly path: string;
  /** The layer the path gives the file, e.g. `controller`, `atom`, `query`. */
  readonly layer: string;
  readonly basename: string;
  /** True when the module exports a function whose name starts with `use`. */
  readonly exportsHook: boolean;
}

/**
 * A layer with no name is a grab bag rather than a question, so the files in
 * it have nothing to agree about.
 */
const UNGROUPABLE_LAYER = 'unknown';

/**
 * A React component is `PascalCase.tsx` and a module is `kebab-case.ts`, and
 * both are correct, so the question is asked per extension. Without that,
 * `App.tsx` and `main.ts` read as a disagreement about entry points.
 */
function readGroupKey(fact: FileFact): string | null {
  if (fact.layer === UNGROUPABLE_LAYER) return null;
  const extension = fact.basename.endsWith('.tsx') ? 'tsx' : 'ts';
  return `${fact.layer}.${extension}`;
}

export interface Variant {
  readonly name: string;
  readonly count: number;
  readonly examples: readonly string[];
}

export interface Divergence {
  /** Stable key, so a baseline can be compared across runs. */
  readonly key: string;
  readonly question: string;
  readonly variants: readonly Variant[];
}

const EXAMPLES_PER_VARIANT = 3;

function buildVariants(pathsByVariant: ReadonlyMap<string, readonly string[]>): readonly Variant[] {
  return [...pathsByVariant.entries()]
    .map(([name, paths]) => ({
      name,
      count: paths.length,
      examples: [...paths].sort().slice(0, EXAMPLES_PER_VARIANT),
    }))
    .sort((first, second) => {
      const byCount = second.count - first.count;
      return byCount === 0 ? first.name.localeCompare(second.name) : byCount;
    });
}

function groupBy<Key>(
  facts: readonly FileFact[],
  readKey: (fact: FileFact) => Key | null,
): Map<Key, FileFact[]> {
  const grouped = new Map<Key, FileFact[]>();
  for (const fact of facts) {
    const key = readKey(fact);
    if (key === null) continue;
    const held = grouped.get(key) ?? [];
    held.push(fact);
    grouped.set(key, held);
  }
  return grouped;
}

/**
 * A layer whose files disagree about how a name is written.
 *
 * Grouped by layer rather than by directory, because the question a reader asks
 * is "how are query modules named here", not "how are the files in this one
 * folder named".
 */
export function findCaseStyleDivergences(facts: readonly FileFact[]): readonly Divergence[] {
  const divergences: Divergence[] = [];
  for (const [group, layerFacts] of groupBy(facts, readGroupKey)) {
    const pathsByStyle = new Map<string, string[]>();
    for (const fact of layerFacts) {
      const style = readCaseStyle(readNameStem(fact.basename));
      const held = pathsByStyle.get(style) ?? [];
      held.push(fact.path);
      pathsByStyle.set(style, held);
    }
    if (pathsByStyle.size < 2) continue;
    divergences.push({
      key: `case-style:${group}`,
      question: `How is the name of a ${group} file written?`,
      variants: buildVariants(pathsByStyle),
    });
  }
  return divergences.sort((first, second) => first.key.localeCompare(second.key));
}

/**
 * A file that exports a hook and does not say so in its name, beside one that
 * does. Two spellings for the same role is the drift; either alone is a choice.
 */
export function findHookNamingDivergence(facts: readonly FileFact[]): readonly Divergence[] {
  const pathsByShape = new Map<string, string[]>();
  for (const fact of facts) {
    if (!fact.exportsHook) continue;
    const stem = readNameStem(fact.basename);
    const suffix = readNameSuffix(fact.basename);
    const shape =
      suffix === 'hook'
        ? '<name>.hook.ts'
        : stem.startsWith('use')
          ? 'use<Name>.ts'
          : 'no marker in the name';
    const held = pathsByShape.get(shape) ?? [];
    held.push(fact.path);
    pathsByShape.set(shape, held);
  }
  if (pathsByShape.size < 2) return [];
  return [
    {
      key: 'role-marker:hook',
      question: 'How does a module that exports a hook say so in its name?',
      variants: buildVariants(pathsByShape),
    },
  ];
}

/**
 * Every dotted suffix in use, so a suffix invented once is visible beside the
 * ones the standard documents. Not a divergence on its own; the report lists it
 * and the baseline stops the count growing.
 */
export function countSuffixes(facts: readonly FileFact[]): readonly Variant[] {
  const pathsBySuffix = new Map<string, string[]>();
  for (const fact of facts) {
    const suffix = readNameSuffix(fact.basename);
    if (suffix === null) continue;
    const held = pathsBySuffix.get(suffix) ?? [];
    held.push(fact.path);
    pathsBySuffix.set(suffix, held);
  }
  return buildVariants(pathsBySuffix);
}

export function findDivergences(facts: readonly FileFact[]): readonly Divergence[] {
  return [...findCaseStyleDivergences(facts), ...findHookNamingDivergence(facts)].sort(
    (first, second) => first.key.localeCompare(second.key),
  );
}

/**
 * The number a baseline records for a divergence: how many files sit outside
 * the majority spelling. Zero means the group agrees.
 */
export function countMinorityFiles(divergence: Divergence): number {
  const [majority, ...rest] = divergence.variants;
  if (majority === undefined) return 0;
  return rest.reduce((total, variant) => total + variant.count, 0);
}

export type BaselineCounts = Readonly<Record<string, number>>;

export function buildBaseline(divergences: readonly Divergence[]): BaselineCounts {
  const counts: Record<string, number> = {};
  for (const divergence of divergences) counts[divergence.key] = countMinorityFiles(divergence);
  return counts;
}

export interface RatchetFailure {
  readonly key: string;
  readonly was: number;
  readonly now: number;
}

/**
 * A ratchet rather than a threshold.
 *
 * The repository has divergences today and fixing them all at once is not worth
 * anyone's afternoon. What is worth stopping is the next one: a group that
 * agreed and now does not, or one that disagreed in two places and now
 * disagrees in three. A count that falls is always allowed, and lowering the
 * baseline is the whole point.
 */
export function findRatchetFailures(
  baseline: BaselineCounts,
  current: BaselineCounts,
): readonly RatchetFailure[] {
  const failures: RatchetFailure[] = [];
  for (const [key, now] of Object.entries(current)) {
    const was = baseline[key] ?? 0;
    if (now > was) failures.push({ key, was, now });
  }
  return failures.sort((first, second) => first.key.localeCompare(second.key));
}

/** Keys the baseline holds that the tree no longer produces, so it can be trimmed. */
export function findStaleBaselineKeys(
  baseline: BaselineCounts,
  current: BaselineCounts,
): readonly string[] {
  return Object.keys(baseline)
    .filter((key) => !(key in current))
    .sort();
}
