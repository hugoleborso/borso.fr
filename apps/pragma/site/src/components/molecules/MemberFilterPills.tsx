/** @Feature members */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Chip } from '../atoms/Chip';
import { Icon } from '../atoms/Icon';
import { composeClassName } from '../atoms/class-name.utils';
import { MemberChip } from './MemberChip';

export interface FilterPillMember {
  readonly id: string;
  readonly name: string;
  readonly color: string;
}

export interface MemberFilterPillsProps {
  readonly members: readonly FilterPillMember[];
  readonly selectedMemberId: string | null;
  readonly onChange: (memberId: string | null) => void;
  readonly className?: string;
}

// @FollowsBlueprint molecule-presentational
export function MemberFilterPills({
  members,
  selectedMemberId,
  onChange,
  className,
}: MemberFilterPillsProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <div
      className={composeClassName(
        '-mx-4 px-4 sm:mx-0 sm:px-0 flex flex-nowrap sm:flex-wrap gap-2 overflow-x-auto sm:overflow-visible [scrollbar-width:none]',
        className,
      )}
      role="group"
      aria-label={t('lineup.filterByMember')}
    >
      <Chip pressed={selectedMemberId === null} onPress={() => onChange(null)} className="shrink-0">
        <Icon name="members" />
        {t('lineup.allMembers')}
      </Chip>
      {members.map((member) => (
        <Chip
          key={member.id}
          pressed={selectedMemberId === member.id}
          onPress={() => onChange(member.id)}
          className="shrink-0 pl-1.5"
        >
          <MemberChip memberName={member.name} memberColor={member.color} size="xs" />
          <span>{member.name}</span>
        </Chip>
      ))}
    </div>
  );
}
