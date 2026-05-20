/**
 * External-link section of the song detail page. For each
 * SongExternalLink the embed.utils resolver returns either an iframe
 * (Spotify / YouTube / Deezer / Vimeo / SoundCloud / Soundslice) or a
 * plain `<a>` fallback. Closes blocker A13 — links render as oEmbed
 * iframes, not bare anchor tags.
 */

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { resolveEmbed } from '../../lib/embed.utils';

export interface SongExternalLinkValue {
  readonly url: string;
  readonly provider: 'spotify' | 'deezer' | 'youtube' | 'other';
  readonly comment: string;
}

interface SongExternalLinksProps {
  readonly links: readonly SongExternalLinkValue[];
  readonly onRemove: (index: number) => void;
}

export function SongExternalLinks({ links, onRemove }: SongExternalLinksProps): JSX.Element | null {
  const { t } = useTranslation();
  const embeds = useMemo(
    () => links.map((link) => ({ link, embed: resolveEmbed(link.url) })),
    [links],
  );
  if (embeds.length === 0) return null;
  return (
    <section className="song-detail-links">
      <h3 className="song-detail-section-title">{t('catalog.linksTitle')}</h3>
      <ul className="song-detail-link-list">
        {embeds.map(({ link, embed }, index) => (
          <li
            key={link.url}
            className={`song-detail-link song-detail-link--${embed.kind}`}
          >
            {embed.kind === 'oembed' ? (
              <iframe
                src={embed.iframeSrc}
                title={`${link.provider}-${link.url}`}
                width={embed.width}
                height={embed.height}
                loading="lazy"
                referrerPolicy="no-referrer"
                allow="encrypted-media; autoplay; clipboard-write; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <a href={embed.href} target="_blank" rel="noreferrer noopener">
                {embed.href}
              </a>
            )}
            <button
              type="button"
              className="song-detail-link-remove"
              onClick={() => onRemove(index)}
              aria-label={t('common.delete')}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
