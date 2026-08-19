/**
 * Reads which blueprint each dantotsu implicates, and aggregates the result.
 *
 * A blueprint is the canonical example of a pattern, and `blueprint-index.md`
 * already answers how widely each one has been copied. Adoption on its own is
 * the wrong signal: a pattern with forty-seven followers and three defects
 * traced to its shape has propagated a mistake forty-seven times, and the high
 * follower count makes that look like success.
 *
 * So a dantotsu may name the blueprints whose shape let the defect through, in
 * its front matter:
 *
 *     blueprints: [optimistic-mutation, query-module]
 *
 * The field is optional, because most defects implicate no pattern. It is not
 * blame: naming a blueprint says the pattern permitted the mistake, which is
 * worth knowing precisely when the pattern is otherwise working.
 */

export interface DantotsuReference {
  /** The dantotsu's file name without the extension. */
  readonly slug: string;
  readonly title: string;
  readonly blueprintIds: readonly string[];
}

export interface BlueprintDefectCount {
  readonly blueprintId: string;
  readonly dantotsuSlugs: readonly string[];
}

const FRONT_MATTER_PATTERN = /^---\n([\s\S]*?)\n---/;
const BLUEPRINTS_FIELD_PATTERN = /^blueprints:\s*\[([^\]]*)\]\s*$/m;
const TITLE_PATTERN = /^#\s+(.+)$/m;

/** The `blueprints: [a, b]` front-matter field, or an empty list. */
export function readBlueprintIds(markdown: string): readonly string[] {
  const frontMatter = FRONT_MATTER_PATTERN.exec(markdown)?.[1];
  // Stryker disable next-line ConditionalExpression: equivalent mutant. The
  // guard is what lets the next line take a `string`; without it `exec` reads
  // `undefined` as the literal text `"undefined"`, which the blueprints
  // pattern never matches, so the guard below returns the same empty list.
  if (frontMatter === undefined) return [];
  const namedIds = BLUEPRINTS_FIELD_PATTERN.exec(frontMatter)?.[1];
  if (namedIds === undefined) return [];
  return namedIds
    .split(',')
    .map((entry) => entry.trim().replace(/^['"]|['"]$/g, ''))
    .filter((entry) => entry.length > 0);
}

export function readDantotsuReference(slug: string, markdown: string): DantotsuReference {
  const title = TITLE_PATTERN.exec(markdown)?.[1];
  return {
    slug,
    title: title === undefined ? slug : title.trim(),
    blueprintIds: readBlueprintIds(markdown),
  };
}

/**
 * A dantotsu naming a blueprint that does not exist. Usually a renamed
 * blueprint, which is exactly when the link is worth keeping.
 */
export function selectUnknownBlueprintReferences(
  references: readonly DantotsuReference[],
  knownBlueprintIds: ReadonlySet<string>,
): readonly string[] {
  const problems: string[] = [];
  for (const reference of references) {
    for (const blueprintId of reference.blueprintIds) {
      if (!knownBlueprintIds.has(blueprintId)) {
        problems.push(`${reference.slug} names blueprint \`${blueprintId}\`, which does not exist`);
      }
    }
  }
  return problems;
}

export function countDefectsByBlueprint(
  references: readonly DantotsuReference[],
): readonly BlueprintDefectCount[] {
  const slugsByBlueprint = new Map<string, string[]>();
  for (const reference of references) {
    for (const blueprintId of reference.blueprintIds) {
      const slugs = slugsByBlueprint.get(blueprintId) ?? [];
      if (!slugs.includes(reference.slug)) slugs.push(reference.slug);
      slugsByBlueprint.set(blueprintId, slugs);
    }
  }
  return [...slugsByBlueprint.entries()]
    .map(([blueprintId, dantotsuSlugs]) => ({ blueprintId, dantotsuSlugs }))
    .sort((first, second) => {
      const byCount = second.dantotsuSlugs.length - first.dantotsuSlugs.length;
      return byCount === 0 ? first.blueprintId.localeCompare(second.blueprintId) : byCount;
    });
}

export interface BlueprintAdoption {
  readonly blueprintId: string;
  readonly name: string;
  readonly followers: number;
}

export interface BlueprintAnnotation {
  readonly id: string;
  readonly name: string;
  readonly usage: string;
}

const BLUEPRINT_NAME_PATTERN = /@BlueprintName\s+(.+)/;
const BLUEPRINT_USAGE_PATTERN = /@BlueprintUsage\s+(.+)/;
// The identifier is on the marker's own line. `\s+` would step over the
// newline and read the JSDoc's closing `*/` as an identifier. The two patterns
// accept the same separators, so every declaration the scan finds is one the
// identifier pattern can read.
const BLUEPRINT_MARKER_PATTERN = /@Blueprint[ \t]/g;
const BLUEPRINT_ID_PATTERN = /@Blueprint[ \t]+([A-Za-z0-9][\w-]*)/;

/**
 * Every blueprint a file declares.
 *
 * Reading only the first one loses the second, and files do carry two:
 * `songs.queries.ts` declares `query-module` and `query-optimistic-mutation`,
 * and a generator that stopped at the first reported the second as a blueprint
 * that does not exist. Each identifier's name and usage are read from the span
 * up to the next declaration, so two blocks in one file do not borrow each
 * other's text.
 */
export function readBlueprintAnnotations(contents: string): readonly BlueprintAnnotation[] {
  const annotations: BlueprintAnnotation[] = [];
  const starts = [...contents.matchAll(BLUEPRINT_MARKER_PATTERN)].map((match) => match.index);

  for (const [position, start] of starts.entries()) {
    const end = starts[position + 1] ?? contents.length;
    const span = contents.slice(start, end);
    const id = BLUEPRINT_ID_PATTERN.exec(span)?.[1];
    if (id === undefined) continue;
    annotations.push({
      id,
      // Stryker disable next-line OptionalChaining: equivalent mutant. The
      // capture group is not optional, so a match always carries it; the `?.`
      // is there because `noUncheckedIndexedAccess` types an index read as
      // possibly undefined, and nothing at runtime can take that branch.
      name: BLUEPRINT_NAME_PATTERN.exec(span)?.[1]?.trim() ?? id,
      // Stryker disable next-line OptionalChaining: equivalent mutant. Same
      // reason as the line above.
      usage: BLUEPRINT_USAGE_PATTERN.exec(span)?.[1]?.trim() ?? '',
    });
  }
  return annotations;
}

export interface BlueprintRisk {
  readonly blueprintId: string;
  readonly name: string;
  readonly followers: number;
  readonly defects: number;
  readonly dantotsuSlugs: readonly string[];
}

/**
 * Blueprints that have a defect against them, worst first.
 *
 * Ordered by how far the pattern has spread rather than by defect count, since
 * one defect in a pattern forty files copy is a bigger problem than three in a
 * pattern nobody uses.
 */
export function rankBlueprintRisk(
  adoptions: readonly BlueprintAdoption[],
  defects: readonly BlueprintDefectCount[],
): readonly BlueprintRisk[] {
  const risks: BlueprintRisk[] = [];
  for (const defect of defects) {
    const adoption = adoptions.find((entry) => entry.blueprintId === defect.blueprintId);
    risks.push({
      blueprintId: defect.blueprintId,
      name: adoption?.name ?? defect.blueprintId,
      followers: adoption?.followers ?? 0,
      defects: defect.dantotsuSlugs.length,
      dantotsuSlugs: defect.dantotsuSlugs,
    });
  }
  return risks.sort((first, second) => {
    const byExposure = second.followers * second.defects - first.followers * first.defects;
    return byExposure === 0 ? first.blueprintId.localeCompare(second.blueprintId) : byExposure;
  });
}

const GENERATED_BANNER =
  '<!-- Generated by scripts/blueprints/blueprint-defects.ts. Do not edit by hand. -->';

export function renderDefectReport(risks: readonly BlueprintRisk[], dantotsuCount: number): string {
  const lines: string[] = [
    GENERATED_BANNER,
    '',
    '# Blueprint defects',
    '',
    'Which canonical patterns have a defect traced to their shape, and how far',
    'each one has spread.',
    '',
    '`blueprint-index.md` answers how widely a pattern was copied. That number',
    'alone reads as success. This page is the other half: a pattern with many',
    'followers and a defect against it has propagated the mistake to every one',
    'of them, and is the first place to look when the same bug appears twice.',
    '',
    'A dantotsu opts in by naming the pattern in its front matter, as',
    '`blueprints: [some-id]`. Most defects implicate no pattern and name none.',
    '',
    `Read from ${String(dantotsuCount)} dantotsu(s).`,
    '',
  ];

  if (risks.length === 0) {
    lines.push('No dantotsu currently implicates a blueprint.', '');
    return lines.join('\n');
  }

  lines.push(
    'Ordered by exposure, which is followers times defects.',
    '',
    '| Blueprint | Followers | Defects | Recorded in |',
    '| --- | --- | --- | --- |',
  );
  for (const risk of risks) {
    const links = risk.dantotsuSlugs.map((slug) => `[${slug}](../dantotsus/${slug}.md)`).join(', ');
    lines.push(
      `| \`${risk.blueprintId}\` — ${risk.name} | ${String(risk.followers)} | ${String(risk.defects)} | ${links} |`,
    );
  }
  lines.push('');
  return lines.join('\n');
}
