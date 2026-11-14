export type DeckSide = 'white' | 'black';

export interface DeckLineSource {
  name: string;
  movesSan: string[];
}

export interface EngineException {
  movesSan: string[];
  reason: string;
}

export interface PliesPerLine {
  minimum: number;
  maximum: number;
}

export interface DeckSource {
  id: string;
  order: number;
  nameKey: string;
  side: DeckSide;
  lines: DeckLineSource[];
  pliesPerLine: PliesPerLine;
  engineExceptions: EngineException[];
  trapFilter?: { openingTags: string[] };
}

export type DeckSourceParse = { ok: true; deck: DeckSource } | { ok: false; problems: string[] };

export const DEFAULT_PLIES_PER_LINE: PliesPerLine = { minimum: 12, maximum: 20 };
export const EXCEPTION_REASON_MINIMUM_LENGTH = 20;

const DECK_ID_PATTERN = /^[0-9a-z]+(?:-[0-9a-z]+)*$/;
const LINE_NAME_MINIMUM_LENGTH = 3;
const LINE_NAME_MAXIMUM_LENGTH = 60;

interface Field<Value> {
  value: Value | null;
  problems: string[];
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isText(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) > 0;
}

function isTextList(value: unknown): value is string[] {
  return Array.isArray(value) && value.length > 0 && value.every((entry) => isText(entry));
}

function accept<Value>(value: Value): Field<Value> {
  return { value, problems: [] };
}

function refuse<Value>(...problems: string[]): Field<Value> {
  return { value: null, problems };
}

function gatherFields<Value>(fields: readonly Field<Value>[]): Field<Value[]> {
  const values: Value[] = [];
  for (const field of fields) {
    if (field.value !== null) values.push(field.value);
  }
  return {
    value: values.length === fields.length ? values : null,
    problems: fields.flatMap((field) => field.problems),
  };
}

function parseId(value: unknown): Field<string> {
  if (isText(value) && DECK_ID_PATTERN.test(value)) return accept(value);
  return refuse('"id" must be lower-case words joined by hyphens');
}

function parseOrder(value: unknown): Field<number> {
  if (isPositiveInteger(value)) return accept(value);
  return refuse('"order" must be a positive integer');
}

function parseNameKey(value: unknown): Field<string> {
  if (isText(value)) return accept(value);
  return refuse('"nameKey" must be a catalogue key');
}

function parseSide(value: unknown): Field<DeckSide> {
  if (value === 'white' || value === 'black') return accept(value);
  return refuse('"side" must be "white" or "black"');
}

function isLineName(value: unknown): value is string {
  return (
    isText(value) &&
    value.length >= LINE_NAME_MINIMUM_LENGTH &&
    value.length <= LINE_NAME_MAXIMUM_LENGTH
  );
}

function parseLine(value: unknown, index: number): Field<DeckLineSource> {
  const label = `line ${index + 1}`;
  if (!isPlainRecord(value)) return refuse(`${label} must be an object`);
  const { name, movesSan } = value;
  if (isLineName(name) && isTextList(movesSan)) return accept({ name, movesSan });
  const problems: string[] = [];
  if (!isLineName(name)) {
    problems.push(
      `${label}: "name" must have ${LINE_NAME_MINIMUM_LENGTH} to ${LINE_NAME_MAXIMUM_LENGTH} characters`,
    );
  }
  if (!isTextList(movesSan)) problems.push(`${label}: "movesSan" must be a list of moves`);
  return refuse(...problems);
}

function listRepeatedLineNames(lines: readonly DeckLineSource[]): string[] {
  const names = lines.map((line) => line.name);
  const repeated = names.filter((name, index) => names.indexOf(name) !== index);
  return [...new Set(repeated)].map((name) => `the line name "${name}" is used twice`);
}

function parseLines(value: unknown): Field<DeckLineSource[]> {
  if (!Array.isArray(value) || value.length === 0) {
    return refuse('"lines" must hold at least one line');
  }
  const lines = gatherFields(value.map((line: unknown, index) => parseLine(line, index)));
  if (lines.value === null) return lines;
  const repeatedNames = listRepeatedLineNames(lines.value);
  return repeatedNames.length === 0 ? lines : refuse(...repeatedNames);
}

function parsePliesPerLine(value: unknown): Field<PliesPerLine> {
  if (value === undefined) return accept(DEFAULT_PLIES_PER_LINE);
  if (
    isPlainRecord(value) &&
    isPositiveInteger(value.minimum) &&
    isPositiveInteger(value.maximum) &&
    value.minimum <= value.maximum
  ) {
    return accept({ minimum: value.minimum, maximum: value.maximum });
  }
  return refuse('"pliesPerLine" must hold a positive "minimum" no greater than its "maximum"');
}

function isReason(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length >= EXCEPTION_REASON_MINIMUM_LENGTH;
}

function parseException(value: unknown, index: number): Field<EngineException> {
  const label = `engine exception ${index + 1}`;
  if (!isPlainRecord(value) || !isTextList(value.movesSan)) {
    return refuse(`${label}: "movesSan" must be a list of moves`);
  }
  if (!isReason(value.reason)) {
    return refuse(
      `${label} (${value.movesSan.join(' ')}): "reason" must give the chess reason in at least ${EXCEPTION_REASON_MINIMUM_LENGTH} characters`,
    );
  }
  return accept({ movesSan: value.movesSan, reason: value.reason.trim() });
}

function parseExceptions(value: unknown): Field<EngineException[]> {
  if (value === undefined) return gatherFields<EngineException>([]);
  if (!Array.isArray(value)) return refuse('"engineExceptions" must be a list');
  return gatherFields(value.map((exception: unknown, index) => parseException(exception, index)));
}

function parseTrapFilter(value: unknown): Field<Pick<DeckSource, 'trapFilter'>> {
  if (value === undefined) return accept({});
  if (isPlainRecord(value) && isTextList(value.openingTags)) {
    return accept({ trapFilter: { openingTags: value.openingTags } });
  }
  return refuse('"trapFilter.openingTags" must be a list of tags');
}

// @FollowsBlueprint core-parse-untrusted
export function parseDeckSource(value: unknown): DeckSourceParse {
  if (!isPlainRecord(value)) return { ok: false, problems: ['deck.json must hold an object'] };
  const id = parseId(value.id);
  const order = parseOrder(value.order);
  const nameKey = parseNameKey(value.nameKey);
  const side = parseSide(value.side);
  const lines = parseLines(value.lines);
  const pliesPerLine = parsePliesPerLine(value.pliesPerLine);
  const engineExceptions = parseExceptions(value.engineExceptions);
  const trapFilter = parseTrapFilter(value.trapFilter);
  if (
    id.value === null ||
    order.value === null ||
    nameKey.value === null ||
    side.value === null ||
    lines.value === null ||
    pliesPerLine.value === null ||
    engineExceptions.value === null ||
    trapFilter.value === null
  ) {
    return {
      ok: false,
      problems: [
        ...id.problems,
        ...order.problems,
        ...nameKey.problems,
        ...side.problems,
        ...lines.problems,
        ...pliesPerLine.problems,
        ...engineExceptions.problems,
        ...trapFilter.problems,
      ],
    };
  }
  return {
    ok: true,
    deck: {
      id: id.value,
      order: order.value,
      nameKey: nameKey.value,
      side: side.value,
      lines: lines.value,
      pliesPerLine: pliesPerLine.value,
      engineExceptions: engineExceptions.value,
      ...trapFilter.value,
    },
  };
}
