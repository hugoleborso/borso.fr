/**
 * Collapsible "Add a song" picker shown at the bottom of the setlist
 * editor. Renders the catalog sorted alphabetically; each button hands
 * the chosen song id to the parent's append-entry mutation.
 *
 * Lives in its own file so `SetlistEditor.tsx` stays inside the
 * `noExcessiveLinesPerFile` budget without inlining behaviour at the
 * cost of readability.
 */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

export interface SetlistSongPickerProps {
  readonly songs: readonly { id: string; title: string }[];
  readonly onPick: (songId: string) => void;
}

export function SetlistSongPicker(props: SetlistSongPickerProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <details className="bg-bg-sunk border border-line rounded-md p-3">
      <summary className="cursor-pointer text-sm text-ink-700 font-medium">
        {t('setlist.addSong')}
      </summary>
      <ul className="flex flex-col gap-1 mt-3">
        {props.songs
          .toSorted((left, right) => left.title.localeCompare(right.title))
          .map((song) => (
            <li key={song.id}>
              <button
                type="button"
                onClick={() => props.onPick(song.id)}
                className="w-full text-left bg-transparent border-0 text-[13px] text-ink-700 hover:bg-bg-elev px-2 py-1 rounded-md cursor-pointer transition-colors"
              >
                + {song.title}
              </button>
            </li>
          ))}
      </ul>
    </details>
  );
}
