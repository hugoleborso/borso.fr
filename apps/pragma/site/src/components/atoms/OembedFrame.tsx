/**
 * The provider iframe an oEmbed response describes. The `allow` list is fixed
 * here rather than passed in, because it is the same for every provider the
 * resolver recognises and a caller has no way to widen it safely.
 *
 * The frame never exceeds its column and keeps the provider's proportions
 * while shrinking. Both are fixed here rather than left to the caller: one
 * call site forgot `max-w-full` and shipped a 560px player onto a 375px
 * screen, and a second remembered it alone and shipped a squashed one.
 *
 * The ratio has to be stated. An `<iframe>` takes no intrinsic aspect ratio
 * from its `width`/`height` attributes the way an `<img>` does — left to
 * `height: auto` it falls back to the replaced element's default 150px — so
 * the provider's own numbers are written into `aspect-ratio`, which is a
 * per-provider value no static utility class can carry.
 */

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
