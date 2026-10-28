/** @Feature practice-mode */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { composeClassName } from '../atoms/class-name.utils';
import { Icon } from '../atoms/Icon';
import { ListRow } from '../molecules/ListRow';
import { Sheet } from '../molecules/Sheet';

export interface PracticeSongListItem {
  readonly entryId: string;
  readonly title: string;
  readonly setlistName: string;
}

export interface PracticeSongListSheetProps {
  readonly songs: readonly PracticeSongListItem[];
  readonly currentIndex: number;
  readonly onPick: (index: number) => void;
  readonly onClose: () => void;
}

const POSITION_DIGITS = 2;

// @FollowsBlueprint organism-presentational
export function PracticeSongListSheet(props: PracticeSongListSheetProps): JSX.Element {
  const { t } = useTranslation();
  const title = t('practice.songListTitle');
  return (
    <Sheet title={title} label={title} onClose={props.onClose}>
      <ol className="m-0 flex list-none flex-col divide-y divide-rule p-0">
        {props.songs.map((song, index) => {
          const isCurrent = index === props.currentIndex;
          return (
            <li key={song.entryId}>
              <ListRow
                aria-current={isCurrent ? 'step' : undefined}
                onClick={() => props.onPick(index)}
                className="min-h-12 gap-3 py-2"
                isChevronShown={!isCurrent}
              >
                <span className="w-6 shrink-0 text-right font-mono text-label text-ink-faint">
                  {String(index + 1).padStart(POSITION_DIGITS, '0')}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span
                    className={composeClassName(
                      'truncate font-display text-body',
                      isCurrent ? 'font-semibold text-ink' : 'text-ink',
                    )}
                  >
                    {song.title}
                  </span>
                  <span className="truncate text-label text-ink-soft">{song.setlistName}</span>
                </span>
                {isCurrent ? (
                  <span className="flex items-center gap-1 text-label text-ink-soft">
                    <Icon name="play" />
                    {t('practice.nowPlaying')}
                  </span>
                ) : null}
              </ListRow>
            </li>
          );
        })}
      </ol>
    </Sheet>
  );
}
