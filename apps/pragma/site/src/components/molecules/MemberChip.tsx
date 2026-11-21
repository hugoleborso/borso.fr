/** @Feature members */

import { Avatar } from '../atoms/Avatar';
import { memberInitial } from '../atoms/member-palette.utils';

export interface MemberChipProps {
  memberName: string;
  memberColor: string;
  size?: 'xs' | 'md' | 'lg';
  withName?: boolean;
  nameClassName?: string;
}

const DEFAULT_NAME_CLASS = 'min-w-0 truncate text-meta font-medium text-ink';

// @FollowsBlueprint molecule-presentational
export function MemberChip({
  memberName,
  memberColor,
  size = 'xs',
  withName = false,
  nameClassName = DEFAULT_NAME_CLASS,
}: MemberChipProps): JSX.Element {
  if (!withName) {
    return (
      <Avatar
        initials={memberInitial(memberName)}
        color={memberColor}
        size={size}
        aria-label={memberName}
        title={memberName}
      />
    );
  }
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <Avatar
        initials={memberInitial(memberName)}
        color={memberColor}
        size={size}
        aria-hidden="true"
      />
      <span className={nameClassName}>{memberName}</span>
    </span>
  );
}
