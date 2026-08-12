/**
 * The provider iframe an oEmbed response describes. The `allow` list is fixed
 * here rather than passed in, because it is the same for every provider the
 * resolver recognises and a caller has no way to widen it safely.
 */

import type { JSX } from 'react';

const EMBED_PERMISSIONS = 'encrypted-media; autoplay; clipboard-write; picture-in-picture';

interface OembedFrameProps {
  readonly source: string;
  readonly title: string;
  readonly width: number;
  readonly height: number;
  readonly className: string;
}

// @FollowsBlueprint atom-plain
export function OembedFrame({
  source,
  title,
  width,
  height,
  className,
}: OembedFrameProps): JSX.Element {
  return (
    <iframe
      src={source}
      title={title}
      width={width}
      height={height}
      loading="lazy"
      referrerPolicy="no-referrer"
      allow={EMBED_PERMISSIONS}
      allowFullScreen
      className={className}
    />
  );
}
