/**
 * Read-only concert detail. Renders the prototype's two-column
 * concert layout: friends-per-member bars on the left + gear card,
 * venue + capacity summary on the right. The "Edit" affordance lives
 * on the parent SessionDetailPage header.
 */

import { useTranslation } from 'react-i18next';
import { Card } from '../../components/atoms/Card';
import { MemberChip } from '../../components/molecules/MemberChip';

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

const LABEL_CLASS = 'text-[11px] tracking-wider uppercase text-ink-400 font-medium';

export function ConcertReadView({
  venue,
  capacity,
  gear,
  friendsCounts,
  members,
  friendsTotal,
}: ConcertReadViewProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6 items-start">
      <div className="flex flex-col gap-4">
        <Card>
          <div className="flex items-center justify-between mb-3">
            <div className={LABEL_CLASS}>{t('sessions.friendsCountPerMember')}</div>
            <span className="font-mono text-[11px] uppercase tracking-wider text-ink-500">
              Σ {friendsTotal}
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            {members.map((member) => {
              const count = friendsCounts[member.id] ?? 0;
              const percent = friendsTotal === 0 ? 0 : (count / friendsTotal) * 100;
              return (
                <div key={member.id} className="flex items-center gap-2.5">
                  <MemberChip memberName={member.firstName} memberColor={member.color} />
                  <span className="text-[12.5px] text-ink-900 w-20 flex-shrink-0">
                    {member.firstName}
                  </span>
                  <div className="flex-1 h-1.5 bg-bg-sunk rounded-sm overflow-hidden">
                    <div
                      className="h-full rounded-sm"
                      style={{
                        width: `${percent}%`,
                        background: member.color,
                        opacity: 0.85,
                      }}
                    />
                  </div>
                  <span className="font-mono text-[11px] text-ink-500 min-w-[28px] text-right">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
          {capacity !== null && capacity > 0 ? (
            <div className="mt-3.5 pt-3.5 border-t border-line flex justify-between text-[12.5px]">
              <span className="text-ink-500">{t('sessions.capacity')}</span>
              <span className="font-mono">
                {Math.round((friendsTotal / capacity) * 100)}% · {friendsTotal}/
                {capacity}
              </span>
            </div>
          ) : null}
        </Card>
        <Card>
          <div className={`${LABEL_CLASS} mb-2.5`}>{t('sessions.gear')}</div>
          <div className="text-[13px] text-ink-700 whitespace-pre-line font-mono">
            {gear === null || gear.length === 0 ? '—' : gear}
          </div>
        </Card>
      </div>
      <aside className="flex flex-col gap-4">
        <Card variant="sunk">
          <div className={`${LABEL_CLASS} mb-1.5`}>{t('sessions.venue')}</div>
          <div className="font-display italic text-2xl text-ink-900 leading-tight">
            {venue ?? '—'}
          </div>
        </Card>
      </aside>
    </div>
  );
}
