import type { JSX } from 'react';

interface PreviewImageProps {
  readonly source: string;
  readonly alternativeText: string;
  readonly className: string;
}

// @FollowsBlueprint atom-plain
export function PreviewImage({
  source,
  alternativeText,
  className,
}: PreviewImageProps): JSX.Element {
  return <img src={source} alt={alternativeText} className={className} />;
}
