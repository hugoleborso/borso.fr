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
import { PickRowButton } from '../atoms/PickRowButton';

export interface SetlistSongPickerProps {
  readonly songs: readonly { id: string; title: string }[];
  readonly onPick: (songId: string) => void;
}

// @FollowsBlueprint organism-presentational
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
              <PickRowButton label={`+ ${song.title}`} onPick={() => props.onPick(song.id)} />
            </li>
          ))}
      </ul>
    </details>
  );
}
