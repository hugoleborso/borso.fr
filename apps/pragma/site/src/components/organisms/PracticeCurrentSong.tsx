/** @Feature practice-mode */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { AlbumCover } from '../atoms/AlbumCover';
import { RoundAction } from '../atoms/RoundAction';
import { LineupSlots } from '../molecules/LineupSlots';
import type { LineupColumnView } from '../molecules/lineup-slots.core';

export interface PracticeCurrentSongProps {
  readonly title: string;
  readonly artist: string;
  readonly deezerAlbumId: string | null;
  readonly keyLabel: string | null;
  readonly capo: number | null;
  readonly lineupColumn: LineupColumnView;
  readonly note: string;
  readonly transitionNote: string;
  readonly chordsTo: string;
  readonly onOpenNote: () => void;
}

const DETAIL_SEPARATOR = ' · ';

// @FollowsBlueprint organism-presentational
export function PracticeCurrentSong(props: PracticeCurrentSongProps): JSX.Element {
  const { t } = useTranslation();
  const keyParts = [
    props.keyLabel,
    props.capo === null ? null : t('setlist.capoValue', { capo: props.capo }),
  ].filter((part) => part !== null);
  return (
    <section className="flex flex-col gap-3" aria-label={props.title}>
      <div className="flex items-center gap-3">
        <AlbumCover title={props.title} deezerAlbumId={props.deezerAlbumId} size="sheet" />
        <div className="flex min-w-0 flex-col gap-0.5">
          <h1 className="m-0 font-display text-display leading-tight text-ink wrap-anywhere">
            {props.title}
          </h1>
          <span className="truncate text-meta text-ink-soft">{props.artist}</span>
          {keyParts.length === 0 ? null : (
            <span className="font-mono text-meta text-ink">{keyParts.join(DETAIL_SEPARATOR)}</span>
          )}
        </div>
      </div>
      <LineupSlots column={props.lineupColumn} />
      {props.note.length === 0 ? null : (
        <p className="m-0 font-display text-body leading-snug text-ink italic">{props.note}</p>
      )}
      {props.transitionNote.length === 0 ? null : (
        <p className="m-0 font-display text-meta text-pencil italic">
          {t('practice.towardsNext', { note: props.transitionNote })}
        </p>
      )}
      <div className="flex items-start gap-6">
        <RoundAction kind="link" icon="text" label={t('practice.chords')} to={props.chordsTo} />
        <RoundAction
          kind="button"
          icon="edit"
          label={t('practice.note')}
          onPress={props.onOpenNote}
        />
      </div>
    </section>
  );
}
