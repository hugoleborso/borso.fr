import type { CSSProperties } from 'react';

interface CarouselImageProps {
  source: string;
  alternativeText: string;
  style: CSSProperties;
}

// @FollowsBlueprint atom-plain
export function CarouselImage({ source, alternativeText, style }: CarouselImageProps) {
  return <img src={source} alt={alternativeText} style={style} />;
}
