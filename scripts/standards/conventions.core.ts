export type CaseStyle = 'kebab' | 'camel' | 'pascal' | 'other';

const KEBAB_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const CAMEL_PATTERN = /^[a-z][a-z0-9]*([A-Z][a-z0-9]*)+$/;
const PASCAL_PATTERN = /^[A-Z][a-z0-9]*([A-Z][a-z0-9]*)*$/;

export function readNameStem(basename: string): string {
  const firstDot = basename.indexOf('.');
  return firstDot === -1 ? basename : basename.slice(0, firstDot);
}

const NAME_SUFFIX_PATTERN = /\.([a-z0-9-]+)\.[a-z]+$/;

export function readNameSuffix(basename: string): string | null {
  return NAME_SUFFIX_PATTERN.exec(basename)?.[1] ?? null;
}

export function readCaseStyle(stem: string): CaseStyle {
  if (KEBAB_PATTERN.test(stem)) return 'kebab';
  if (CAMEL_PATTERN.test(stem)) return 'camel';
  if (PASCAL_PATTERN.test(stem)) return 'pascal';
  return 'other';
}

export interface FileFact {
  readonly path: string;
  readonly layer: string;
  readonly basename: string;
  readonly exportsHook: boolean;
}

const UNGROUPABLE_LAYER = 'unknown';

function readLayerAndExtensionKey(fact: FileFact): string | null {
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
  readonly key: string;
  readonly question: string;
  readonly variants: readonly Variant[];
  readonly documentedAnswer?: string;
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

export function listCaseStyleDivergences(facts: readonly FileFact[]): readonly Divergence[] {
  const divergences: Divergence[] = [];
  for (const [group, layerFacts] of groupBy(facts, readLayerAndExtensionKey)) {
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

const HOOK_SUFFIX_SHAPE = '<name>.hook.ts';

export function listHookNamingDivergences(facts: readonly FileFact[]): readonly Divergence[] {
  const pathsByShape = new Map<string, string[]>();
  for (const fact of facts) {
    if (!fact.exportsHook) continue;
    const stem = readNameStem(fact.basename);
    const suffix = readNameSuffix(fact.basename);
    if (suffix !== null && suffix !== 'hook') continue;
    const shape =
      suffix === 'hook'
        ? HOOK_SUFFIX_SHAPE
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
      documentedAnswer: HOOK_SUFFIX_SHAPE,
    },
  ];
}

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

const LAYER_IN_THE_NAME = 'the suffix names the layer';
const NO_LAYER_IN_THE_NAME = 'nothing in the name says';

const APPLICATIONS_CONTAINER = 'apps';

function readApplication(path: string): string | null {
  const [container, application] = path.split('/');
  return container === APPLICATIONS_CONTAINER ? (application ?? null) : null;
}

export function listLayerMarkerDivergences(facts: readonly FileFact[]): readonly Divergence[] {
  const divergences: Divergence[] = [];
  for (const [application, applicationFacts] of groupBy(facts, (fact) =>
    readApplication(fact.path),
  )) {
    const pathsByShape = new Map<string, string[]>();
    for (const fact of applicationFacts) {
      const shape = fact.layer === UNGROUPABLE_LAYER ? NO_LAYER_IN_THE_NAME : LAYER_IN_THE_NAME;
      const held = pathsByShape.get(shape) ?? [];
      held.push(fact.path);
      pathsByShape.set(shape, held);
    }
    if (!pathsByShape.has(NO_LAYER_IN_THE_NAME)) continue;
    divergences.push({
      key: `layer-marker:${application}`,
      question: `Does a file in ${application} say which layer it is in?`,
      variants: buildVariants(pathsByShape),
      documentedAnswer: LAYER_IN_THE_NAME,
    });
  }
  return divergences;
}

export function listDivergences(facts: readonly FileFact[]): readonly Divergence[] {
  return [
    ...listCaseStyleDivergences(facts),
    ...listHookNamingDivergences(facts),
    ...listLayerMarkerDivergences(facts),
  ].sort((first, second) => first.key.localeCompare(second.key));
}

function countFilesOutsideLeadingVariant(variants: readonly Variant[]): number {
  return variants.slice(1).reduce((total, variant) => total + variant.count, 0);
}

function countFilesOutside(variants: readonly Variant[], answer: string): number {
  return variants
    .filter((variant) => variant.name !== answer)
    .reduce((total, variant) => total + variant.count, 0);
}

export function countDivergentFiles(divergence: Divergence): number {
  return divergence.documentedAnswer === undefined
    ? countFilesOutsideLeadingVariant(divergence.variants)
    : countFilesOutside(divergence.variants, divergence.documentedAnswer);
}

export type BaselineCounts = Readonly<Record<string, number>>;

export function buildBaseline(divergences: readonly Divergence[]): BaselineCounts {
  const counts: Record<string, number> = {};
  for (const divergence of divergences) counts[divergence.key] = countDivergentFiles(divergence);
  return counts;
}

export interface RatchetFailure {
  readonly key: string;
  readonly was: number;
  readonly now: number;
}

export function listRatchetFailures(
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

export function listStaleBaselineKeys(
  baseline: BaselineCounts,
  current: BaselineCounts,
): readonly string[] {
  return Object.keys(baseline)
    .filter((key) => !(key in current))
    .sort();
}
