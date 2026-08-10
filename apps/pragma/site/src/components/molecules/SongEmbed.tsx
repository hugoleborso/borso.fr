/**
 * One resolved external link, rendered the way its provider allows: an oEmbed
 * iframe when `resolveEmbed` recognised the URL, a plain anchor when it did
 * not.
 *
 * Both the song detail page and the song edit form's link list show the same
 * thing, so the markup lives here rather than twice.
 */

import type { JSX } from 'react';
import type { EmbedResult } from '../../lib/embed.utils';

interface SongEmbedProps {
  readonly embed: EmbedResult;
  readonly title: string;
  readonly iframeClassName?: string;
}

const DEFAULT_IFRAME_CLASS = 'rounded-md';

export function SongEmbed({ embed, title, iframeClassName }: SongEmbedProps): JSX.Element {
  if (embed.kind === 'oembed') {
    return (
      <iframe
        src={embed.iframeSrc}
        title={title}
        width={embed.width}
        height={embed.height}
        loading="lazy"
        referrerPolicy="no-referrer"
        allow="encrypted-media; autoplay; clipboard-write; picture-in-picture"
        allowFullScreen
        className={iframeClassName ?? DEFAULT_IFRAME_CLASS}
      />
    );
  }
  return (
    <a
      href={embed.href}
      target="_blank"
      rel="noreferrer noopener"
      className="text-accent hover:underline break-all"
    >
      {embed.href}
    </a>
  );
}
