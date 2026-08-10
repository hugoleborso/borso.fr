import type { CSSProperties } from 'react';

interface CarouselVideoProps {
  source: string;
  alternativeText: string;
  style: CSSProperties;
}

// @FollowsBlueprint atom-plain
export function CarouselVideo({ source, alternativeText, style }: CarouselVideoProps) {
  return (
    <video
      src={source}
      aria-label={alternativeText}
      controls
      playsInline
      preload="metadata"
      style={style}
    >
      <track kind="captions" />
    </video>
  );
}
