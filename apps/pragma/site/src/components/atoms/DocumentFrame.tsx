import type { JSX } from 'react';

interface DocumentFrameProps {
  readonly source: string;
  readonly title: string;
  readonly className: string;
}

// @FollowsBlueprint atom-plain
export function DocumentFrame({ source, title, className }: DocumentFrameProps): JSX.Element {
  return <iframe src={source} title={title} className={className} />;
}
