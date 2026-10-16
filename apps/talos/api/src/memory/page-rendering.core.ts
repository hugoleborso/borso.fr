export type AttributeValue = string | readonly string[];
export type AttributeMap = Readonly<Record<string, AttributeValue>>;

export interface DatedLine {
  readonly since: string | null;
  readonly until: string | null;
  readonly seen: string | null;
  readonly sourceRef: string | null;
  readonly inferred: boolean;
  readonly extra: string | null;
  readonly raw: string | null;
  readonly position: number;
}

export interface FactLine extends DatedLine {
  readonly section: string;
  readonly key: string | null;
  readonly value: string;
}

export interface RelationLine extends DatedLine {
  readonly verb: string;
  readonly toSlug: string;
}

export interface RenderableEntity {
  readonly kind: string;
  readonly body: string;
  readonly attributes: AttributeMap;
  readonly closeness: number | null;
  readonly closenessReason: string | null;
}

const FENCE = '---';
const LINE_BREAK = '\n';
const TYPE_KEY = 'type';
const CLOSENESS_KEY = 'proximite';
const CLOSENESS_REASON_KEY = 'proximite_pourquoi';
const UNTIL_LABEL = "jusqu'à";
const INFERRED_MARK = ' (inféré)';
const NEEDS_QUOTES_PATTERN = /^[[\]{}"'&*!|>%@`#-]|: | #|^\s|\s$/;
const UNTIL_SEGMENT_PATTERN = /\s*\|\s*jusqu'à\s*:[^|]*?(?=\s*\||\s*\(inféré\)\s*$|$)/;
const FACTS_HEADING = 'Faits';
const HISTORY_HEADING = 'Historique';
const RELATIONS_HEADING = 'Relations';

function renderScalar(value: string): string {
  return NEEDS_QUOTES_PATTERN.test(value) ? JSON.stringify(value) : value;
}

function renderAttribute(key: string, value: AttributeValue): string {
  if (typeof value !== 'string') return `${key}: ${JSON.stringify(value)}`;
  return value === '' ? `${key}:` : `${key}: ${renderScalar(value)}`;
}

function selectAttributeValue(entity: RenderableEntity, key: string, value: AttributeValue) {
  if (key === CLOSENESS_KEY && entity.closeness !== null) return String(entity.closeness);
  if (key === CLOSENESS_REASON_KEY && entity.closenessReason !== null) {
    return entity.closenessReason;
  }
  return value;
}

export function renderFrontMatter(entity: RenderableEntity): string {
  const type = entity.attributes[TYPE_KEY] ?? entity.kind;
  const ordered = Object.entries(entity.attributes)
    .filter(([key]) => key !== TYPE_KEY)
    .map(([key, value]) => renderAttribute(key, selectAttributeValue(entity, key, value)));
  const missingCloseness =
    entity.closeness !== null && !(CLOSENESS_KEY in entity.attributes)
      ? [renderAttribute(CLOSENESS_KEY, String(entity.closeness))]
      : [];
  const missingReason =
    entity.closenessReason !== null && !(CLOSENESS_REASON_KEY in entity.attributes)
      ? [renderAttribute(CLOSENESS_REASON_KEY, entity.closenessReason)]
      : [];
  return [
    FENCE,
    renderAttribute(TYPE_KEY, type),
    ...ordered,
    ...missingCloseness,
    ...missingReason,
    FENCE,
  ].join(LINE_BREAK);
}

export function renderRecordFrontMatter(attributes: AttributeMap): string {
  const lines = Object.entries(attributes).map(([key, value]) => renderAttribute(key, value));
  return [FENCE, ...lines, FENCE].join(LINE_BREAK);
}

function renderDatedSuffix(line: DatedLine): string {
  const segments = [
    line.since === null ? null : `depuis: ${line.since}`,
    line.until === null ? null : `${UNTIL_LABEL}: ${line.until}`,
    line.seen === null ? null : `vu: ${line.seen}`,
    line.sourceRef === null ? null : `src: ${line.sourceRef}`,
    line.extra,
  ].filter((segment) => segment !== null);
  const attributes = segments.map((segment) => ` | ${segment}`).join('');
  return `${attributes}${line.inferred ? INFERRED_MARK : ''}`;
}

export function composeFactRaw(fact: FactLine): string {
  const head = fact.key === null ? fact.value : `${fact.key}: ${fact.value}`;
  return `${head}${renderDatedSuffix(fact)}`;
}

export function composeRelationRaw(relation: RelationLine): string {
  return `${relation.verb} → [[${relation.toSlug}]]${renderDatedSuffix(relation)}`;
}

export function closeRaw(raw: string, until: string, note: string | null): string {
  const withoutUntil = raw.replace(UNTIL_SEGMENT_PATTERN, '');
  const isInferred = withoutUntil.endsWith(INFERRED_MARK);
  const head = isInferred ? withoutUntil.slice(0, -INFERRED_MARK.length) : withoutUntil;
  const noteSegment = note === null ? '' : ` | ${note}`;
  return `${head} | ${UNTIL_LABEL}: ${until}${noteSegment}${isInferred ? INFERRED_MARK : ''}`;
}

function renderLines(lines: readonly string[]): string[] {
  return lines.map((line) => `- ${line}`);
}

export function insertSectionLines(
  body: string,
  heading: string,
  lines: readonly string[],
): string {
  if (lines.length === 0) return body;
  const bodyLines = body.split(LINE_BREAK);
  const headingIndex = bodyLines.findIndex((line) => line.trimEnd() === `## ${heading}`);
  if (headingIndex === -1) {
    const separator = body === '' || body.endsWith(LINE_BREAK) ? '' : LINE_BREAK;
    return `${body}${separator}\n## ${heading}\n\n${renderLines(lines).join(LINE_BREAK)}\n`;
  }
  const isFollowedByBlank = bodyLines[headingIndex + 1] === '';
  const insertionIndex = headingIndex + 1 + (isFollowedByBlank ? 1 : 0);
  return [
    ...bodyLines.slice(0, insertionIndex),
    ...renderLines(lines),
    ...bodyLines.slice(insertionIndex),
  ].join(LINE_BREAK);
}

function byPosition(left: DatedLine, right: DatedLine): number {
  return left.position - right.position;
}

export function renderEntityPage(
  entity: RenderableEntity,
  facts: readonly FactLine[],
  relations: readonly RelationLine[],
): string {
  const sorted = facts.toSorted(byPosition);
  const factLines = sorted
    .filter((fact) => fact.section === 'facts')
    .map((fact) => fact.raw ?? composeFactRaw(fact));
  const historyLines = sorted
    .filter((fact) => fact.section === 'history')
    .map((fact) => fact.raw ?? composeFactRaw(fact));
  const relationLines = relations
    .toSorted(byPosition)
    .map((relation) => relation.raw ?? composeRelationRaw(relation));
  const withFacts = insertSectionLines(entity.body, FACTS_HEADING, factLines);
  const withHistory = insertSectionLines(withFacts, HISTORY_HEADING, historyLines);
  const body = insertSectionLines(withHistory, RELATIONS_HEADING, relationLines);
  return `${renderFrontMatter(entity)}${LINE_BREAK}${body}`;
}

export function renderRecordPage(attributes: AttributeMap, body: string): string {
  return `${renderRecordFrontMatter(attributes)}${LINE_BREAK}${body}`;
}
