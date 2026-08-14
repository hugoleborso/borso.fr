interface CarouselVideoProps {
  source: string;
  alternativeText: string;
  className: string;
}

// @FollowsBlueprint atom-plain
export function CarouselVideo({ source, alternativeText, className }: CarouselVideoProps) {
  return (
    <video
      src={source}
      aria-label={alternativeText}
      controls
      playsInline
      preload="metadata"
      className={className}
    >
      <track kind="captions" />
    </video>
  );
}
