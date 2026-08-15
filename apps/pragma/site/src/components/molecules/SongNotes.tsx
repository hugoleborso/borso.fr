/**
 * The song's notes, as the band reads them: how the song is built, the
 * gimmicks to watch for, and anything else. Renders nothing when the song
 * carries none, so a page can drop it in unconditionally.
 *
 * `tone` picks the palette rather than the layout: the same block appears on
 * the cream detail page and on the black stage view.
 *
 * A pasted link is one unbreakable word, and the detail page clips what
 * overflows, so the note text breaks mid-word rather than running past the
 * card and off the screen.
 * @Feature songs
 */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import {
  SONG_NOTE_LABEL_KEY,
  type SongNoteInput,
  selectSongNoteSections,
} from '../../routes/catalog/song-notes.core';
import { composeClassName } from '../atoms/class-name.utils';

export interface SongNotesProps {
  readonly song: SongNoteInput;
  readonly tone?: 'light' | 'dark';
  readonly className?: string;
}

const LABEL_CLASS_BY_TONE = {
  light: 'text-ink-400',
  dark: 'text-stage-ink-dim',
} as const;

const TEXT_CLASS_BY_TONE = {
  light: 'text-ink-700',
  dark: 'text-stage-ink',
} as const;

// @FollowsBlueprint molecule-presentational
export function SongNotes({ song, tone = 'light', className }: SongNotesProps): JSX.Element | null {
  const { t } = useTranslation();
  const sections = selectSongNoteSections(song);
  if (sections.length === 0) return null;
  return (
    <div className={composeClassName('flex flex-col gap-3', className)}>
      {sections.map((section) => (
        <div key={section.kind} className="flex flex-col gap-1">
          <span
            className={composeClassName(
              'text-xs tracking-wider uppercase font-medium',
              LABEL_CLASS_BY_TONE[tone],
            )}
          >
            {t(SONG_NOTE_LABEL_KEY[section.kind])}
          </span>
          <p
            className={composeClassName(
              'm-0 text-[13px] leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere]',
              TEXT_CLASS_BY_TONE[tone],
            )}
          >
            {section.text}
          </p>
        </div>
      ))}
    </div>
  );
}
