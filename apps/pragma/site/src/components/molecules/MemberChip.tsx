/**
 * MemberChip — Avatar + (optional) name label. The prototype has
 * four styles (`pill`, `chip`, `accent`, `avatar`) — we keep two
 * here: the bare (avatar-only) form used in song-card lineups, and
 * the named form used in detail panels.
 */

import { Avatar } from '../atoms/Avatar';
import { cn } from '../atoms/cn.utils';
import { memberInitial, paletteColorFromHex } from '../atoms/member-palette.utils';

export interface MemberChipProps {
  memberName: string;
  memberColor: string;
  size?: 'sm' | 'md' | 'lg';
  withName?: boolean;
  title?: string;
  className?: string;
}

export function MemberChip({
  memberName,
  memberColor,
  size = 'sm',
  withName = false,
  title,
  className,
}: MemberChipProps): JSX.Element {
  const color = paletteColorFromHex(memberColor);
  return (
    <span
      className={cn('inline-flex items-center gap-1.5', className)}
      title={title ?? memberName}
    >
      <Avatar initials={memberInitial(memberName)} color={color} size={size} />
      {withName && (
        <span className="text-[11px] font-medium text-ink-700">{memberName}</span>
      )}
    </span>
  );
}
