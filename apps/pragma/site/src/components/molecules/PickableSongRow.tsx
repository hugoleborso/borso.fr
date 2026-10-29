/** @Feature setlists */

import type { JSX, MouseEvent, ReactNode } from 'react';
import { AlbumCover } from '../atoms/AlbumCover';
import { composeClassName } from '../atoms/class-name.utils';
import { Icon } from '../atoms/Icon';
import { ListRow } from './ListRow';

const ROW_CLASS = 'min-h-14 border-b border-rule py-2';

function keepFocusInSearch(event: MouseEvent<HTMLButtonElement>): void {
  event.preventDefault();
}

interface SongLinesProps {
  readonly title: string;
  readonly detail: string;
}

function SongLines({ title, detail }: SongLinesProps): JSX.Element {
  return (
    <span className="min-w-0 flex-1">
      <span className="block truncate font-display text-title text-ink">{title}</span>
      <span className="block truncate text-meta text-ink-soft">{detail}</span>
    </span>
  );
}

export interface PickableSongRowProps {
  readonly title: string;
  readonly detail: string;
  readonly deezerAlbumId: string | null;
  readonly pickNumber: number | null;
  readonly isAlreadyIn: boolean;
  readonly isDisabled: boolean;
  readonly onToggle: () => void;
}

// @FollowsBlueprint molecule-presentational
export function PickableSongRow(props: PickableSongRowProps): JSX.Element {
  const isPicked = props.pickNumber !== null;
  return (
    <ListRow
      role="checkbox"
      aria-checked={isPicked}
      onMouseDown={keepFocusInSearch}
      onClick={props.onToggle}
      disabled={props.isDisabled || props.isAlreadyIn}
      isChevronShown={false}
      leading={<AlbumCover title={props.title} deezerAlbumId={props.deezerAlbumId} />}
      trailing={
        props.isAlreadyIn ? null : (
          <span
            aria-hidden="true"
            className={composeClassName(
              'inline-flex size-7 shrink-0 items-center justify-center rounded-sm border-2 font-mono text-meta',
              isPicked ? 'border-ink bg-ink text-paper' : 'border-rule-strong',
            )}
          >
            {props.pickNumber}
          </span>
        )
      }
      className={composeClassName(ROW_CLASS, props.isAlreadyIn && 'opacity-50')}
    >
      <SongLines title={props.title} detail={props.detail} />
    </ListRow>
  );
}

export interface SongActionRowProps {
  readonly title: string;
  readonly detail: string;
  readonly leading: ReactNode;
  readonly isDisabled: boolean;
  readonly onSelect: () => void;
}

export function SongActionRow(props: SongActionRowProps): JSX.Element {
  return (
    <ListRow
      onClick={props.onSelect}
      disabled={props.isDisabled}
      isChevronShown={false}
      leading={props.leading}
      trailing={<Icon name="plus" className="shrink-0 text-accent" />}
      className={ROW_CLASS}
    >
      <SongLines title={props.title} detail={props.detail} />
    </ListRow>
  );
}
