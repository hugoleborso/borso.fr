/**
 * External-link section of the song detail page. For each
 * SongExternalLink the embed.utils resolver returns either an iframe
 * (Spotify / YouTube / Deezer / Vimeo / SoundCloud / Soundslice) or a
 * plain `<a>` fallback. Closes blocker A13 — links render as oEmbed
 * iframes, not bare anchor tags.
 */

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../../components/atoms/Card';
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
    <Card>
      <h3 className="text-[11px] tracking-wider uppercase text-ink-400 font-medium m-0 mb-3">
        {t('catalog.linksTitle')}
      </h3>
      <ul className="flex flex-col gap-2">
        {embeds.map(({ link, embed }, index) => (
          <li
            key={link.url}
            className="relative bg-bg border border-line rounded-md p-2 flex items-start gap-2"
          >
            <div className="flex-1 min-w-0">
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
                  className="rounded-md"
                />
              ) : (
                <a
                  href={embed.href}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-accent hover:underline break-all"
                >
                  {embed.href}
                </a>
              )}
            </div>
            <button
              type="button"
              className="text-ink-400 hover:text-danger text-lg leading-none cursor-pointer bg-transparent border-0 px-1"
              onClick={() => onRemove(index)}
              aria-label={t('common.delete')}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
