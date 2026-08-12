interface CarouselImageProps {
  source: string;
  alternativeText: string;
  className: string;
}

// @FollowsBlueprint atom-plain
export function CarouselImage({ source, alternativeText, className }: CarouselImageProps) {
  return <img src={source} alt={alternativeText} className={className} />;
}
