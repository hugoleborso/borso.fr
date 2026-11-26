/** @Feature sessions */

import { type JSX, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useConcertRegistrations } from '../../lib/queries/concert-registrations.queries';
import {
  computeSharePercent,
  isCapacityKnown,
  parseFriendsCounts,
  tallyFriends,
} from '../../routes/sessions/friends-count.core';
import { Card } from '../atoms/Card';
import { composeClassName } from '../atoms/class-name.utils';
import { MemberMark } from '../atoms/MemberMark';

export interface ConcertFriendsCardMember {
  readonly id: string;
  readonly firstName: string;
  readonly color: string;
}

export interface ConcertFriendsCardSession {
  readonly id: string;
  readonly capacity: number | null;
  readonly friendsCountPerMember: unknown;
}

export interface ConcertFriendsCardProps {
  readonly session: ConcertFriendsCardSession;
  readonly members: readonly ConcertFriendsCardMember[];
}

const LABEL_CLASS = 'text-label tracking-wider uppercase text-ink-soft font-medium';
const ROW_CLASS = 'flex h-7 items-center gap-2.5';
const NAME_CLASS = 'flex w-24 min-w-0 shrink-0 items-center gap-1.5 text-meta text-ink';
const TRACK_CLASS = 'relative h-2.5 flex-1';
const BAR_CLASS = 'absolute inset-y-0 left-0 h-full min-h-0 min-w-0 rounded-sm px-0';
const EXPECTED_BAR_CLASS = 'size-auto border-[1.5px] border-dashed';
const COUNT_CLASS = 'min-w-11 text-right font-mono text-meta';
const LEGEND_SWATCH_CLASS = 'h-2 w-4.5 rounded-cover';
const NO_REGISTRATIONS: readonly never[] = [];

// @FollowsBlueprint organism-query-owning
export function ConcertFriendsCard({ session, members }: ConcertFriendsCardProps): JSX.Element {
  const { t } = useTranslation();
  const { capacity } = session;
  const registrations = useConcertRegistrations(session.id).data?.registrations ?? NO_REGISTRATIONS;
  const tally = useMemo(
    () =>
      tallyFriends({
        members,
        expectedCounts: parseFriendsCounts(session.friendsCountPerMember),
        registrations,
      }),
    [members, session, registrations],
  );
  const isVenueFillShown = isCapacityKnown(capacity);
  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className={LABEL_CLASS}>{t('sessions.friendsCountPerMember')}</span>
        <span className="text-meta text-ink-soft">
          <b className="font-semibold text-ink">{tally.registeredTotal}</b>{' '}
          {t('sessions.friendsRegistered', { count: tally.registeredTotal })} ·{' '}
          {tally.expectedTotal} {t('sessions.friendsExpected', { count: tally.expectedTotal })}
        </span>
      </div>
      <div className="flex flex-col">
        {tally.rows.map(({ member, ...row }) => (
          <div key={member.id} className={ROW_CLASS}>
            <span className={NAME_CLASS}>
              <MemberMark color={member.color} shape="dot" />
              <span className="truncate">{member.firstName}</span>
            </span>
            <div className={TRACK_CLASS} aria-hidden="true">
              {row.isExpectedShown ? (
                <MemberMark
                  color={member.color}
                  shape="ring"
                  className={composeClassName(BAR_CLASS, EXPECTED_BAR_CLASS)}
                  style={{ width: `${row.expectedPercent}%` }}
                />
              ) : null}
              <MemberMark
                color={member.color}
                shape="cell"
                className={BAR_CLASS}
                style={{ width: `${row.registeredPercent}%` }}
              />
            </div>
            <span className={COUNT_CLASS}>
              <b className="font-semibold text-ink">{row.registered}</b>
              <span className="text-ink-soft"> / {row.expected}</span>
            </span>
          </div>
        ))}
        <div
          className={composeClassName(
            ROW_CLASS,
            'mt-1 box-content border-t border-dashed border-rule pt-1.5',
          )}
        >
          <span className={NAME_CLASS}>
            <span className="size-2.5 shrink-0 rounded-pill bg-rule-strong" />
            <span className="truncate">{t('sessions.friendsNoPreference')}</span>
          </span>
          <div className={TRACK_CLASS} aria-hidden="true">
            <span
              className={composeClassName(BAR_CLASS, 'bg-rule-strong')}
              style={{ width: `${tally.noPreferencePercent}%` }}
            />
          </div>
          <span className={COUNT_CLASS}>
            <b className="font-semibold text-ink">{tally.noPreferenceCount}</b>
          </span>
        </div>
      </div>
      <div className="mt-2.5 flex gap-4 text-label text-ink-soft" aria-hidden="true">
        <span className="flex items-center gap-1.5">
          <span className={composeClassName(LEGEND_SWATCH_CLASS, 'bg-ink-soft')} />
          {t('sessions.friendsLegendRegistered')}
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className={composeClassName(
              LEGEND_SWATCH_CLASS,
              'border-[1.5px] border-dashed border-ink-soft',
            )}
          />
          {t('sessions.friendsLegendExpected')}
        </span>
      </div>
      {isVenueFillShown ? (
        <div className="mt-3.5 flex justify-between border-t border-rule pt-3.5 text-meta">
          <span className="text-ink-soft">{t('sessions.friendsVenueFill')}</span>
          <span className="font-mono">
            {Math.round(computeSharePercent(tally.registeredTotal, capacity))}% ·{' '}
            {tally.registeredTotal}/{capacity}
          </span>
        </div>
      ) : null}
    </Card>
  );
}
