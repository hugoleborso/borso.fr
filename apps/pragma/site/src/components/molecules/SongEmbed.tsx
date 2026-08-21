/** @Feature songs */

import type { JSX } from 'react';
import type { EmbedResult } from '../../lib/embed.utils';
import { ExternalLink } from '../atoms/ExternalLink';
import { OembedFrame } from '../atoms/OembedFrame';

interface SongEmbedProps {
  readonly embed: EmbedResult;
  readonly title: string;
}

const IFRAME_CLASS = 'rounded-md';

const LINK_CLASS = 'text-accent hover:underline break-all';

// @FollowsBlueprint molecule-presentational
export function SongEmbed({ embed, title }: SongEmbedProps): JSX.Element {
  if (embed.kind === 'oembed') {
    return (
      <OembedFrame
        source={embed.iframeSrc}
        title={title}
        width={embed.width}
        height={embed.height}
        className={IFRAME_CLASS}
      />
    );
  }
  return <ExternalLink address={embed.href} className={LINK_CLASS} />;
}
