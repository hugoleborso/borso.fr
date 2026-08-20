/** @Feature songs */

export interface SongNoteInput {
  readonly structureNotes: string;
  readonly gimmickNotes: string;
  readonly notes: string;
}

export type SongNoteKind = 'structure' | 'gimmicks' | 'notes';

export interface SongNoteSection {
  readonly kind: SongNoteKind;
  readonly text: string;
}

const SECTION_ORDER: readonly SongNoteKind[] = ['structure', 'gimmicks', 'notes'];

const TEXT_BY_KIND: Record<SongNoteKind, (song: SongNoteInput) => string> = {
  structure: (song) => song.structureNotes,
  gimmicks: (song) => song.gimmickNotes,
  notes: (song) => song.notes,
};

// @FollowsBlueprint core-view-projection
export function selectSongNoteSections(song: SongNoteInput): SongNoteSection[] {
  return SECTION_ORDER.flatMap((kind) => {
    const text = TEXT_BY_KIND[kind](song).trim();
    return text.length === 0 ? [] : [{ kind, text }];
  });
}

export const SONG_NOTE_LABEL_KEY = {
  structure: 'catalog.notesStructure',
  gimmicks: 'catalog.notesGimmicks',
  notes: 'catalog.notesFree',
} as const satisfies Record<SongNoteKind, string>;
