import type { Selection } from '@/openings/selectors.utils';
import { type BoardThemeId, isBoardThemeId } from '@/theme/boardThemes.utils';

export type Mode = 'learn' | 'play';
export type Side = 'white' | 'black';
export type View = 'select' | 'session';
export type TreeVisualizationMode = 'arrows' | 'buttons' | null;

export interface PlayScope {
  openingIds: string[];
  variationIds: string[];
  lineIds: string[];
}

export interface PersistedState {
  mode: Mode;
  side: Side;
  boardStyle: BoardThemeId;
  selection: Selection;
  view: View;
  playAutoOpponent: boolean;
  playScope: PlayScope;
  treeVisualizationMode: TreeVisualizationMode;
}

/**
 * @Blueprint unknown-payload-parser
 * @BlueprintName Unknown Payload Parser
 * @BlueprintUsage Use for any boundary where a value arrives as `unknown`, such as storage, a fetch body, or a bundled JSON import.
 * @BlueprintDescription Annotates the parse result as `const parsed: unknown` rather than asserting a shape onto it, then narrows one field at a time through a small named predicate per field, each returning the typed value or `null`. The returned object is rebuilt field by field from those narrowed values, so TypeScript infers the result type instead of being told it, and a field the payload is missing cannot reach the caller. `treeVisualizationMode` uses `undefined` as its failure marker because `null` is one of its valid values, which is the trap a single nullable sentinel would hide.
 */
export function parsePersistedState(raw: string): PersistedState | null {
  let record: Record<string, unknown>;
  try {
    const storedValue: unknown = JSON.parse(raw);
    if (!isPlainRecord(storedValue)) return null;
    record = storedValue;
  } catch {
    return null;
  }

  const mode = parseMode(record.mode);
  const side = parseSide(record.side);
  const boardStyle = parseBoardStyle(record.boardStyle);
  const selection = parseSelection(record.selection);
  const view = parseView(record.view);
  const playAutoOpponent = parseBoolean(record.playAutoOpponent);
  const playScope = parsePlayScope(record.playScope);
  const treeVisualizationMode = parseTreeVisualizationMode(record.treeVisualizationMode);

  if (
    mode === null ||
    side === null ||
    boardStyle === null ||
    selection === null ||
    view === null ||
    playAutoOpponent === null ||
    playScope === null ||
    treeVisualizationMode === undefined
  ) {
    return null;
  }
  return {
    mode,
    side,
    boardStyle,
    selection,
    view,
    playAutoOpponent,
    playScope,
    treeVisualizationMode,
  };
}

function parseTreeVisualizationMode(value: unknown): TreeVisualizationMode | undefined {
  if (value === null) return null;
  if (value === 'arrows' || value === 'buttons') return value;
  return undefined;
}

export function stringifyPersistedState(state: PersistedState): string {
  return JSON.stringify(state);
}

function parseMode(value: unknown): Mode | null {
  return value === 'learn' || value === 'play' ? value : null;
}

function parseSide(value: unknown): Side | null {
  return value === 'white' || value === 'black' ? value : null;
}

function parseBoardStyle(value: unknown): BoardThemeId | null {
  return isBoardThemeId(value) ? value : null;
}

function parseView(value: unknown): View | null {
  return value === 'select' || value === 'session' ? value : null;
}

function parseBoolean(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

function parseSelection(value: unknown): Selection | null {
  if (!isPlainRecord(value)) return null;
  if (
    !isStringOrNull(value.openingId) ||
    !isStringOrNull(value.variationId) ||
    !isStringOrNull(value.lineId)
  ) {
    return null;
  }
  return {
    openingId: value.openingId,
    variationId: value.variationId,
    lineId: value.lineId,
  };
}

function isStringOrNull(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function parsePlayScope(value: unknown): PlayScope | null {
  if (!isPlainRecord(value)) return null;
  const openingIds = parseStringArray(value.openingIds);
  const variationIds = parseStringArray(value.variationIds);
  const lineIds = parseStringArray(value.lineIds);
  if (openingIds === null || variationIds === null || lineIds === null) return null;
  return { openingIds, variationIds, lineIds };
}

function parseStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const strings: string[] = [];
  for (const entry of value) {
    if (typeof entry !== 'string') return null;
    strings.push(entry);
  }
  return strings;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
