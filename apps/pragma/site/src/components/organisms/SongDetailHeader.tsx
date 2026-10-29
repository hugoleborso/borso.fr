/** @Feature songs */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import type { SongRecord } from '../../lib/queries/songs.queries';
import { buildTonalityLabel } from '../../routes/catalog/tonality-label.utils';
import { AlbumCover } from '../atoms/AlbumCover';
import { ButtonLink } from '../atoms/ButtonLink';
import { Menu, type MenuItem } from '../molecules/Menu';
import { PageHeader } from '../molecules/PageHeader';
import { StatusChip } from '../molecules/StatusChip';

export interface SongDetailHeaderProps {
  readonly song: SongRecord;
  readonly menuItems: readonly MenuItem[];
}

// @FollowsBlueprint organism-presentational
export function SongDetailHeader({ song, menuItems }: SongDetailHeaderProps): JSX.Element {
  const { t } = useTranslation();
  const tonality = buildTonalityLabel(song.tonalityStart, song.tonalityEnd);

  return (
    <PageHeader
      className="mb-0 sm:mb-0"
      back={{ to: '/catalog', label: t('catalog.title') }}
      leading={<AlbumCover title={song.title} deezerAlbumId={song.deezerAlbumId} size="md" />}
      title={song.title}
      subtitle={
        <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
          {song.artist.length > 0 ? <span className="text-body">{song.artist}</span> : null}
          <StatusChip status={song.status} />
          {tonality === null ? null : <span className="font-mono">{tonality}</span>}
        </span>
      }
      actions={
        <>
          <ButtonLink to={`/catalog/${song.id}/edit`} variant="secondary" size="sm" icon="edit">
            {t('common.edit')}
          </ButtonLink>
          <Menu label={t('catalog.songActions')} items={menuItems} />
        </>
      }
    />
  );
}
