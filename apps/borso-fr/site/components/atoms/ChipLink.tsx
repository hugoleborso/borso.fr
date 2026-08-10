import type { ChipProps } from './Chip';

// @FollowsBlueprint atom-plain
export function ChipLink({ address, style, children }: ChipProps) {
  return (
    <a href={address} target="_blank" rel="noopener noreferrer" style={style}>
      {children}
    </a>
  );
}
