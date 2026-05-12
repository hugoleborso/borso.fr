export type BoardThemeId = 'lichess' | 'chesscom' | 'nord' | 'sand';

interface BoardTheme {
  id: BoardThemeId;
  name: string;
  light: string;
  dark: string;
  highlight: string;
  arrow: string;
}

const boardThemesById = {
  lichess: {
    id: 'lichess',
    name: 'Lichess',
    light: '#f0d9b5',
    dark: '#b58863',
    highlight: '#f6f669',
    arrow: '#a2d17c',
  },
  chesscom: {
    id: 'chesscom',
    name: 'Chess.com',
    light: '#d9d7c9',
    dark: '#6b8f41',
    highlight: '#ffda79',
    arrow: '#5bc86e',
  },
  nord: {
    id: 'nord',
    name: 'Nord Blue',
    light: '#eceff4',
    dark: '#4c566a',
    highlight: '#88c0d0',
    arrow: '#81a1c1',
  },
  sand: {
    id: 'sand',
    name: 'Sand',
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

export function isBoardThemeId(value: string): value is BoardThemeId {
  return value === 'lichess' || value === 'chesscom' || value === 'nord' || value === 'sand';
}
