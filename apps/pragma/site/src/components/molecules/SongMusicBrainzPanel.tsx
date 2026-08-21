/** @Feature songs */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Chip } from '../atoms/Chip';
import { formatDuration } from './song-duration.utils';

interface SongMusicBrainzPanelProps {
  readonly album: string;
  readonly durationSeconds: number | null;
  readonly mbid: string | null;
  readonly tags: readonly string[];
  readonly isrcs: readonly string[];
}

// @FollowsBlueprint organism-presentational
export function SongMusicBrainzPanel({
  album,
  durationSeconds,
  mbid,
  tags,
  isrcs,
}: SongMusicBrainzPanelProps): JSX.Element | null {
  const { t } = useTranslation();
  const hasContent =
    album.length > 0 ||
    durationSeconds !== null ||
    mbid !== null ||
    tags.length > 0 ||
    isrcs.length > 0;
  if (!hasContent) return null;
  const labelClass = 'text-xs tracking-wider uppercase text-ink-400 font-medium';
  return (
    <section className="border border-line rounded-md p-3 bg-bg-sunk flex flex-col gap-2">
      <h3 className={labelClass}>{t('catalog.musicBrainzMetadata')}</h3>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
        {album.length > 0 ? (
          <div>
            <dt className="text-ink-500">{t('catalog.album')}</dt>
            <dd className="text-ink-900">{album}</dd>
          </div>
        ) : null}
        {durationSeconds === null ? null : (
          <div>
            <dt className="text-ink-500">{t('catalog.duration')}</dt>
            <dd className="text-ink-900 font-mono">{formatDuration(durationSeconds)}</dd>
          </div>
        )}
        {mbid === null ? null : (
          <div className="sm:col-span-2">
            <dt className="text-ink-500">{t('catalog.mbid')}</dt>
            <dd className="text-ink-700 font-mono break-all">{mbid}</dd>
          </div>
        )}
        {isrcs.length > 0 ? (
          <div className="sm:col-span-2">
            <dt className="text-ink-500">{t('catalog.isrcs')}</dt>
            <dd className="text-ink-700 font-mono">{isrcs.join(', ')}</dd>
          </div>
        ) : null}
        {tags.length > 0 ? (
          <div className="sm:col-span-2">
            <dt className="text-ink-500">{t('catalog.tags')}</dt>
            <dd className="flex flex-wrap gap-1 mt-0.5">
              {tags.map((tag) => (
                <Chip key={tag} className="uppercase tracking-wider">
                  {tag}
                </Chip>
              ))}
            </dd>
          </div>
        ) : null}
      </dl>
    </section>
  );
}
