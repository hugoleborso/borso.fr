import type { CSSProperties, JSX } from 'react';
import { useState } from 'react';
import { buildCoverArtUrl, selectCoverColor, selectCoverInitials } from '../../lib/cover-art.utils';
import { composeClassName } from './class-name.utils';
import { type AlbumCoverVariantProps, albumCoverVariants } from './album-cover.variants';

export interface AlbumCoverProps extends AlbumCoverVariantProps {
  readonly title: string;
  readonly releaseId: string | null;
  readonly className?: string;
}

// @FollowsBlueprint atom-variant
export function AlbumCover({ title, releaseId, size, className }: AlbumCoverProps): JSX.Element {
  const [hasArtFailed, setHasArtFailed] = useState<boolean>(false);
  const artUrl = buildCoverArtUrl(releaseId);
  const composed = composeClassName(albumCoverVariants({ size }), className);
  const tint: CSSProperties = { backgroundColor: selectCoverColor(title) };

  if (artUrl === null || hasArtFailed) {
    return (
      <span aria-hidden="true" className={composed} style={tint}>
        {selectCoverInitials(title)}
      </span>
    );
  }

  return (
    <img
      src={artUrl}
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => setHasArtFailed(true)}
      className={composed}
      style={tint}
    />
  );
}
