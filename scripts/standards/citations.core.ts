/**
 * Reads the `## Enforced by` section of a standard and turns each bullet into
 * a typed citation naming the mechanism that makes the rule real.
 *
 * `docs/standards/README.md` says a rule with no enforcement is a preference,
 * so every standard already ended by naming an ESLint rule, a script, a gate or
 * a reviewer. Nothing checked that the named mechanism existed, and several did
 * not: `no-magic-numbers` and `explicit-module-boundary-types` were cited and
 * configured nowhere, a CDK synth and a mutation run were claimed of CI and
 * absent from it, and `eslint-comments/require-description` was cited under an
 * identifier that is not the rule's.
 *
 * A bullet therefore opens with a marker in a closed vocabulary rather than
 * with prose, because a first pass that read the prose had to guess, and a
 * guess is what let those claims through in the first place:
 *
 *     - `eslint:borso/no-use-effect` — rejects every effect in a front end.
 *     - `gate:vitest-coverage` — full coverage on every pure file.
 *     - `reviewer` — whether the name is the one the domain uses.
 *
 * A citation carries no verdict. `enforcement-ledger.ts` resolves each one
 * against the live ESLint configuration and the checked-in hooks, because only
 * that side can tell an enabled rule from a registered one.
 */

const ENFORCED_BY_HEADING = '## Enforced by';
const HEADING_PREFIX = '## ';
const BULLET_PREFIX = '- ';

/** `` `kind:target` `` at the head of a bullet, or a bare `` `reviewer` ``. */
const MARKER_PATTERN = /^`([a-z]+)(?::([^`]+))?`/;

export const CITATION_KINDS = [
  'eslint',
  'script',
  'generator',
  'gate',
  'types',
  'test',
  'reviewer',
] as const;

export type CitationKind = (typeof CITATION_KINDS)[number];

export interface Citation {
  readonly kind: CitationKind;
  /** The mechanism's own name, e.g. `borso/no-use-effect`. Empty for a reviewer. */
  readonly target: string;
  /** The bullet the citation was read from, for the error message. */
  readonly claim: string;
}

export interface StandardCitations {
  /** The standard's file name, e.g. `01-naming.md`. */
  readonly standard: string;
  readonly title: string;
  readonly citations: readonly Citation[];
  /** A bullet that opens with no marker, which is a claim nothing can check. */
  readonly unmarkedBullets: readonly string[];
}

/**
 * The `## Enforced by` section's bullets, one string per bullet, with
 * continuation lines folded in so a bullet wrapped across two lines is still
 * one claim.
 */
export function readEnforcedByBullets(markdown: string): readonly string[] {
  const headingIndex = markdown.indexOf(ENFORCED_BY_HEADING);
  if (headingIndex === -1) return [];
  const afterHeading = markdown.slice(headingIndex + ENFORCED_BY_HEADING.length);
  const nextHeadingIndex = afterHeading.indexOf(`\n${HEADING_PREFIX}`);
  const section = nextHeadingIndex === -1 ? afterHeading : afterHeading.slice(0, nextHeadingIndex);

  const bullets: string[] = [];
  for (const line of section.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    if (line.startsWith(BULLET_PREFIX)) {
      bullets.push(trimmed.slice(BULLET_PREFIX.length));
      continue;
    }
    const openBullet = bullets.at(-1);
    if (openBullet !== undefined) bullets[bullets.length - 1] = `${openBullet} ${trimmed}`;
  }
  return bullets;
}

/** The citation a bullet opens with, or `null` when it opens with prose. */
export function readCitationFromBullet(bullet: string): Citation | null {
  const marker = MARKER_PATTERN.exec(bullet);
  if (marker === null) return null;
  const kind = CITATION_KINDS.find((candidate) => candidate === marker[1]);
  if (kind === undefined) return null;
  if (kind === 'reviewer') return { kind, target: '', claim: bullet };
  const target = marker[2]?.trim();
  if (target === undefined || target.length === 0) return null;
  return { kind, target, claim: bullet };
}

/** The document's `# ` title, or its file name when it has none. */
export function readStandardTitle(markdown: string, fallback: string): string {
  for (const line of markdown.split('\n')) {
    if (line.startsWith('# ')) return line.slice('# '.length).trim();
  }
  return fallback;
}

export function readStandardCitations(standard: string, markdown: string): StandardCitations {
  const bullets = readEnforcedByBullets(markdown);
  const citations: Citation[] = [];
  const unmarkedBullets: string[] = [];
  for (const bullet of bullets) {
    const citation = readCitationFromBullet(bullet);
    if (citation === null) unmarkedBullets.push(bullet);
    else citations.push(citation);
  }
  return {
    standard,
    title: readStandardTitle(markdown, standard),
    citations,
    unmarkedBullets,
  };
}
