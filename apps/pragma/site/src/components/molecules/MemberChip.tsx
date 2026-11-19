/** @Feature members */

import { Avatar } from '../atoms/Avatar';
import { memberInitial } from '../atoms/member-palette.utils';

export interface MemberChipProps {
  memberName: string;
  memberColor: string;
  size?: 'xs' | 'md' | 'lg';
}

// @FollowsBlueprint molecule-presentational
export function MemberChip({ memberName, memberColor, size = 'xs' }: MemberChipProps): JSX.Element {
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
