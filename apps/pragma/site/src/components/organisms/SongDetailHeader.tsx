/** @Feature songs */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import type { SongRecord } from '../../lib/queries/songs.queries';
import { AlbumCover } from '../atoms/AlbumCover';
import { ButtonLink } from '../atoms/ButtonLink';
import { PageHeader } from '../molecules/PageHeader';
import { SongPreviewButton } from '../molecules/SongPreviewButton';
import { StatusChip } from '../molecules/StatusChip';

export interface SongDetailHeaderProps {
  readonly song: Pick<SongRecord, 'id' | 'title' | 'artist' | 'status' | 'deezerAlbumId'>;
  readonly previewUrl: string | null;
}

// @FollowsBlueprint organism-presentational
export function SongDetailHeader({ song, previewUrl }: SongDetailHeaderProps): JSX.Element {
  const { t } = useTranslation();

  return (
    <PageHeader
      className="mb-0 sm:mb-0 lg:mb-0"
      back={{ to: '/catalog', label: t('catalog.title') }}
      leading={
        <div className="relative shrink-0 pr-2 pb-2">
          <AlbumCover title={song.title} deezerAlbumId={song.deezerAlbumId} size="sheet" />
          {previewUrl === null ? null : (
            <SongPreviewButton
              previewUrl={previewUrl}
              className="absolute right-0 bottom-0 shadow-cover ring-2 ring-paper"
            />
          )}
        </div>
      }
      title={song.title}
      subtitle={
        <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
          {song.artist.length > 0 ? <span className="text-body">{song.artist}</span> : null}
          <StatusChip status={song.status} />
        </span>
      }
      actions={
        <ButtonLink to={`/catalog/${song.id}/edit`} variant="secondary" size="sm" icon="edit">
          {t('common.edit')}
        </ButtonLink>
      }
    />
  );
}
