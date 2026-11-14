/** @Feature setlists */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { AlbumCover } from '../atoms/AlbumCover';
import { Icon } from '../atoms/Icon';
import { SongActionRow } from './PickableSongRow';

export interface SongSearchHit {
  readonly deezerTrackId: string;
  readonly title: string;
  readonly artist: string;
  readonly deezerAlbumId: string | null;
}

export interface SongSearchHitsProps<Hit extends SongSearchHit> {
  readonly typedTitle: string;
  readonly hits: readonly Hit[];
  readonly isDisabled: boolean;
  readonly onCreateIdea: () => void;
  readonly onPickHit: (hit: Hit) => void;
}

// @FollowsBlueprint molecule-presentational
export function SongSearchHits<Hit extends SongSearchHit>(
  props: SongSearchHitsProps<Hit>,
): JSX.Element {
  const { t } = useTranslation();
  return (
    <section className="flex flex-col gap-1 pt-2">
      <ul className="m-0 flex list-none flex-col p-0">
        <li>
          <SongActionRow
            title={t('setlist.addSongsNewIdea')}
            detail={props.typedTitle}
            leading={
              <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-cover bg-accent-soft text-accent">
                <Icon name="bulb" />
              </span>
            }
            isDisabled={props.isDisabled}
            onSelect={props.onCreateIdea}
          />
        </li>
      </ul>
      {props.hits.length === 0 ? null : (
        <h3 className="m-0 px-1 text-label font-semibold text-ink-soft uppercase">
          {t('setlist.addSongsFromService')}
        </h3>
      )}
      <ul className="m-0 flex list-none flex-col p-0">
        {props.hits.map((hit) => (
          <li key={hit.deezerTrackId}>
            <SongActionRow
              title={hit.title}
              detail={hit.artist}
              leading={<AlbumCover title={hit.title} deezerAlbumId={hit.deezerAlbumId} />}
              isDisabled={props.isDisabled}
              onSelect={() => props.onPickHit(hit)}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
