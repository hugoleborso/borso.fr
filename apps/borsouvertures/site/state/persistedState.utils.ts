import type { Selection } from '@/openings/selectors.utils';
import { type BoardThemeId, isBoardThemeId } from '@/theme/boardThemes.utils';

export type Mode = 'learn' | 'play';
export type Side = 'white' | 'black';
export type View = 'select' | 'session';
/**
 * `null` defers to the device default (mobile → buttons, desktop → arrows);
 * `'arrows'` / `'buttons'` are explicit user choices that survive across
 * devices.
 */
export type TreeVisualizationMode = 'arrows' | 'buttons' | null;

export interface PlayScope {
  openingIds: string[];
  variationIds: string[];
  lineIds: string[];
}

/**
 * The slice of {@link AppState} that survives a reload. `openings` is
 * intentionally absent — the dataset is fetched (and cached by the service
 * worker) on every cold load, never from localStorage.
 */
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
 * Read a localStorage payload back into a typed {@link PersistedState}. Returns
 * `null` for any failure mode — missing key, JSON syntax error, shape drift,
 * unknown enum value. The caller falls back to the initial state.
 *
 * Schema bumps drop the previous payload silently: a stored
 * `borsouvertures.v0` blob will never be read because the namespace key
 * changed, and any in-place migration logic would cost more than the data is
 * worth for a clan-only app.
 */
export function parsePersistedState(raw: string | null): PersistedState | null {
  if (raw === null) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isPlainRecord(parsed)) return null;

  const mode = parseMode(parsed.mode);
  const side = parseSide(parsed.side);
  const boardStyle = parseBoardStyle(parsed.boardStyle);
  const selection = parseSelection(parsed.selection);
  const view = parseView(parsed.view);
  const playAutoOpponent = parseBoolean(parsed.playAutoOpponent);
  const playScope = parsePlayScope(parsed.playScope);
  const treeVisualizationMode = parseTreeVisualizationMode(parsed.treeVisualizationMode);

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
  return typeof value === 'string' && isBoardThemeId(value) ? value : null;
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
  const result: string[] = [];
  for (const entry of value) {
    if (typeof entry !== 'string') return null;
    result.push(entry);
  }
  return result;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
