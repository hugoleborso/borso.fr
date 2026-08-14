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
import { ExternalLink } from '../atoms/ExternalLink';
import { OembedFrame } from '../atoms/OembedFrame';

interface SongEmbedProps {
  readonly embed: EmbedResult;
  readonly title: string;
  readonly iframeClassName?: string;
}

const DEFAULT_IFRAME_CLASS = 'rounded-md';

const LINK_CLASS = 'text-accent hover:underline break-all';

// @FollowsBlueprint molecule-presentational
export function SongEmbed({ embed, title, iframeClassName }: SongEmbedProps): JSX.Element {
  if (embed.kind === 'oembed') {
    return (
      <OembedFrame
        source={embed.iframeSrc}
        title={title}
        width={embed.width}
        height={embed.height}
        className={iframeClassName ?? DEFAULT_IFRAME_CLASS}
      />
    );
  }
  return <ExternalLink address={embed.href} className={LINK_CLASS} />;
}
