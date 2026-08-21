import type { JSX } from 'react';
import { composeClassName } from './class-name.utils';

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
      style={{ aspectRatio: `${width} / ${height}` }}
      referrerPolicy="no-referrer"
      allow={EMBED_PERMISSIONS}
      allowFullScreen
      className={composeClassName('w-full max-w-full h-auto', className)}
    />
  );
}
