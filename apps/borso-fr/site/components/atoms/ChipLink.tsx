import type { ChipProps } from './Chip';

// @FollowsBlueprint atom-plain
export function ChipLink({ address, className, children }: ChipProps) {
  return (
    <a href={address} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  );
}
