/** @Feature sessions */

import { useTranslation } from 'react-i18next';
import { Card } from '../atoms/Card';
import { composeClassName } from '../atoms/class-name.utils';
import { MemberMark } from '../atoms/MemberMark';
import { MemberChip } from '../molecules/MemberChip';
import { computeSharePercent, isCapacityKnown } from '../../routes/sessions/friends-count.core';

export interface ConcertReadViewMember {
  readonly id: string;
  readonly firstName: string;
  readonly color: string;
}

export interface ConcertReadViewProps {
  readonly venue: string | null;
  readonly capacity: number | null;
  readonly gear: string | null;
  readonly friendsCounts: Readonly<Record<string, number>>;
  readonly members: readonly ConcertReadViewMember[];
  readonly friendsTotal: number;
}

const LABEL_CLASS = 'text-label tracking-wider uppercase text-ink-soft font-medium';

// @FollowsBlueprint organism-presentational
export function ConcertReadView({
  venue,
  capacity,
  gear,
  friendsCounts,
  members,
  friendsTotal,
}: ConcertReadViewProps): JSX.Element {
  const { t } = useTranslation();
  const isVenueFillShown = isCapacityKnown(capacity);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6 items-start">
      <div className="flex flex-col gap-4">
        <Card>
          <div className="flex items-center justify-between mb-3">
            <div className={LABEL_CLASS}>{t('sessions.friendsCountPerMember')}</div>
            <span className="text-label uppercase tracking-wider text-ink-soft">
              Σ {friendsTotal}
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            {members.map((member) => {
              const count = friendsCounts[member.id] ?? 0;
              const percent = computeSharePercent(count, friendsTotal);
              return (
                <div key={member.id} className="flex items-center gap-2.5">
                  <MemberChip memberName={member.firstName} memberColor={member.color} />
                  <span className="text-meta text-ink w-20 flex-shrink-0">{member.firstName}</span>
                  <div className="flex-1 h-1.5 bg-sunk rounded-sm overflow-hidden">
                    <MemberMark
                      color={member.color}
                      shape="cell"
                      className="block h-full min-h-0 min-w-0 rounded-sm px-0"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <span className="font-mono text-meta text-ink-soft min-w-[28px] text-right">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
          {isVenueFillShown ? (
            <div className="mt-3.5 pt-3.5 border-t border-rule flex justify-between text-meta">
              <span className="text-ink-soft">{t('sessions.capacity')}</span>
              <span className="font-mono">
                {Math.round(computeSharePercent(friendsTotal, capacity))}% · {friendsTotal}/
                {capacity}
              </span>
            </div>
          ) : null}
        </Card>
        <Card>
          <div className={composeClassName(LABEL_CLASS, 'mb-2.5')}>{t('sessions.gear')}</div>
          <div className="font-display text-meta text-ink whitespace-pre-line italic">
            {gear === null || gear.length === 0 ? '—' : gear}
          </div>
        </Card>
      </div>
      <aside className="flex flex-col gap-4">
        <Card variant="sunk">
          <div className={composeClassName(LABEL_CLASS, 'mb-1.5')}>{t('sessions.venue')}</div>
          <div className="font-display text-title text-ink leading-tight">{venue ?? '—'}</div>
        </Card>
      </aside>
    </div>
  );
}
