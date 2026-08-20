const ENFORCED_BY_HEADING = '## Enforced by';
const HEADING_PREFIX = '## ';
const BULLET_PREFIX = '- ';

const CITATION_MARKER = /^`(?<kind>[a-z]+)(?::(?<target>[^`]+))?`/;

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
  readonly target: string;
  readonly bullet: string;
}

export interface StandardCitations {
  readonly standard: string;
  readonly title: string;
  readonly citations: readonly Citation[];
  readonly unmarkedBullets: readonly string[];
}

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

export function readCitationFromBullet(bullet: string): Citation | null {
  const marker = CITATION_MARKER.exec(bullet)?.groups;
  if (marker === undefined) return null;
  const kind = CITATION_KINDS.find((candidate) => candidate === marker.kind);
  if (kind === undefined) return null;
  if (kind === 'reviewer') return { kind, target: '', bullet };
  const target = marker.target?.trim();
  if (target === undefined || target.length === 0) return null;
  return { kind, target, bullet };
}

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
