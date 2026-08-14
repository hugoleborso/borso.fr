import type { JSX } from 'react';

interface ExternalLinkProps {
  readonly address: string;
  readonly className: string;
}

// @FollowsBlueprint atom-plain
export function ExternalLink({ address, className }: ExternalLinkProps): JSX.Element {
  return (
    <a href={address} target="_blank" rel="noreferrer noopener" className={className}>
      {address}
    </a>
  );
}
