import { create } from 'zustand';
import { ALL_KEY, type Selection } from '@/openings/selectors.utils';
import type { Opening } from '@/openings/types';
import type { BoardThemeId } from '@/theme/boardThemes.utils';

export type Mode = 'learn' | 'play';
export type Side = 'white' | 'black';
type View = 'select' | 'session';

export interface PlayScope {
  openingIds: string[];
  variationIds: string[];
  lineIds: string[];
}

interface AppState {
  mode: Mode;
  side: Side;
  boardStyle: BoardThemeId;
  selection: Selection;
  openings: Opening[];
  view: View;
  playAutoOpponent: boolean;
  playScope: PlayScope;
  setMode: (mode: Mode) => void;
  setSide: (side: Side) => void;
  setBoardStyle: (style: BoardThemeId) => void;
  setSelection: (selection: Selection) => void;
  setOpenings: (openings: Opening[]) => void;
  setView: (view: View) => void;
  setPlayAutoOpponent: (value: boolean) => void;
  setPlayScope: (scope: PlayScope) => void;
}

export const useAppState = create<AppState>((set) => ({
  mode: 'learn',
  side: 'white',
  boardStyle: 'chesscom',
  selection: { openingId: ALL_KEY, variationId: ALL_KEY, lineId: ALL_KEY },
  openings: [],
  view: 'select',
  playAutoOpponent: true,
  playScope: { openingIds: [], variationIds: [], lineIds: [] },
  setMode: (mode) => set({ mode }),
  setSide: (side) => set({ side }),
  setBoardStyle: (boardStyle) => set({ boardStyle }),
  setSelection: (selection) => set({ selection }),
  setOpenings: (openings) => set({ openings }),
  setView: (view) => set({ view }),
  setPlayAutoOpponent: (value) => set({ playAutoOpponent: value }),
  setPlayScope: (playScope) => set({ playScope }),
}));
