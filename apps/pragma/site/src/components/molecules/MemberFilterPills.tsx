/**
 * Sticky pill row on the setlist editor — one pill per band member
 * plus a leading "All members" pill. Tapping a member pill enters
 * single-member mode; tapping "All members" returns to the full
 * setlist. The row scrolls horizontally on narrow viewports so the
 * sticky behaviour stays one line tall.
 */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '../atoms/cn.utils';
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

const PILL_BASE_CLASS =
  'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border border-line transition-colors cursor-pointer whitespace-nowrap';
const PILL_INACTIVE_CLASS = 'bg-bg-elev text-ink-500 hover:text-ink-900 hover:border-line-strong';
const PILL_ACTIVE_CLASS = 'bg-ink-900 text-bg-elev border-ink-900';

export function MemberFilterPills({
  members,
  selectedMemberId,
  onChange,
  className,
}: MemberFilterPillsProps): JSX.Element {
  const { t } = useTranslation();
  const isAllActive = selectedMemberId === null;
  return (
    <div
      className={cn('flex gap-2 overflow-x-auto whitespace-nowrap py-2', className)}
      role="tablist"
      aria-label={t('lineup.filterByMember')}
    >
      <button
        type="button"
        role="tab"
        aria-selected={isAllActive}
        onClick={() => onChange(null)}
        className={cn(PILL_BASE_CLASS, isAllActive ? PILL_ACTIVE_CLASS : PILL_INACTIVE_CLASS)}
      >
        {t('lineup.allMembers')}
      </button>
      {members.map((member) => {
        const isActive = selectedMemberId === member.id;
        return (
          <button
            key={member.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(member.id)}
            className={cn(PILL_BASE_CLASS, isActive ? PILL_ACTIVE_CLASS : PILL_INACTIVE_CLASS)}
          >
            <MemberChip memberName={member.name} memberColor={member.color} size="sm" />
            <span>{member.name}</span>
          </button>
        );
      })}
    </div>
  );
}
