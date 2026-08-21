export type BoardThemeId = 'lichess' | 'chesscom' | 'nord' | 'sand';

type BoardThemeNameKey =
  | 'top-bar.board-style.theme.lichess'
  | 'top-bar.board-style.theme.chesscom'
  | 'top-bar.board-style.theme.nord'
  | 'top-bar.board-style.theme.sand';

interface BoardTheme {
  id: BoardThemeId;
  nameKey: BoardThemeNameKey;
  light: string;
  dark: string;
  highlight: string;
  arrow: string;
}

/**
 * @Blueprint satisfies-over-assertion
 * @BlueprintName Satisfies Over Type Assertion
 * @BlueprintUsage Use for a literal table that must match a declared type while keeping its own narrower inferred type.
 * @BlueprintDescription Checks the literal against `Record<BoardThemeId, BoardTheme>` with `satisfies`, so a missing or misspelt entry fails the build while the inferred type stays the exact object rather than widening to the annotation. That is what lets `getBoardTheme` index it without a lookup returning `undefined`, and what keeps each `nameKey` its literal type so `t(theme.nameKey)` still typechecks against the catalogue. An `as Record<...>` annotation would silently accept a wrong shape and widen every field; both forms of assertion are banned here.
 */
const boardThemesById = {
  lichess: {
    id: 'lichess',
    nameKey: 'top-bar.board-style.theme.lichess',
    light: '#f0d9b5',
    dark: '#b58863',
    highlight: '#f6f669',
    arrow: '#a2d17c',
  },
  chesscom: {
    id: 'chesscom',
    nameKey: 'top-bar.board-style.theme.chesscom',
    light: '#d9d7c9',
    dark: '#6b8f41',
    highlight: '#ffda79',
    arrow: '#5bc86e',
  },
  nord: {
    id: 'nord',
    nameKey: 'top-bar.board-style.theme.nord',
    light: '#eceff4',
    dark: '#4c566a',
    highlight: '#88c0d0',
    arrow: '#81a1c1',
  },
  sand: {
    id: 'sand',
    nameKey: 'top-bar.board-style.theme.sand',
    light: '#f3e9dc',
    dark: '#c2a878',
    highlight: '#ffd590',
    arrow: '#d49a6a',
  },
} satisfies Record<BoardThemeId, BoardTheme>;

export const boardThemes: BoardTheme[] = Object.values(boardThemesById);

export function getBoardTheme(id: BoardThemeId): BoardTheme {
  return boardThemesById[id];
}

export function isBoardThemeId(value: unknown): value is BoardThemeId {
  return value === 'lichess' || value === 'chesscom' || value === 'nord' || value === 'sand';
}

// @FollowsBlueprint utils-pure-module
export function toBoardThemeId(value: string, fallback: BoardThemeId): BoardThemeId {
  return isBoardThemeId(value) ? value : fallback;
}
