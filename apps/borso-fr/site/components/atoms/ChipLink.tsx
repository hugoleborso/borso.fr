import type { ChipProps } from './Chip';

export function ChipLink({ address, style, children }: ChipProps) {
  return (
    <a href={address} target="_blank" rel="noopener noreferrer" style={style}>
      {children}
    </a>
  );
}
