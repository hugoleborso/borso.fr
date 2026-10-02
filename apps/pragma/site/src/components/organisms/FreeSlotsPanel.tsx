/** @Feature sessions */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  type FreeSlotsView,
  formatFreeSlot,
  type NamedExclusion,
  nameExclusions,
  selectFreeSlotsView,
} from '../../lib/free-slots.utils';
import { useFreeSlots } from '../../lib/queries/free-slots.queries';
import { useMembersList } from '../../lib/queries/members.queries';
import { FreeSlotRow } from '../molecules/FreeSlotRow';

export interface FreeSlotsPanelProps {
  readonly onBook: (start: Date) => void;
}

interface FreeSlot {
  readonly start: string;
  readonly end: string;
}

interface ViewProps {
  readonly slots: readonly FreeSlot[];
  readonly exclusions: readonly NamedExclusion[];
  readonly onBook: (start: Date) => void;
}

const EXCLUSION_MESSAGE_KEY = {
  'no-calendar': 'freeSlots.excluded.noCalendar',
  'needs-reconnecting': 'freeSlots.excluded.needsReconnecting',
  unavailable: 'freeSlots.excluded.unavailable',
} as const;

const NO_MEMBERS: readonly { id: string; firstName: string }[] = [];
const NO_SLOTS: readonly FreeSlot[] = [];

function ExclusionList({ exclusions }: Pick<ViewProps, 'exclusions'>): JSX.Element {
  const { t } = useTranslation();
  return (
    <ul className="flex flex-col gap-0.5 p-0 m-0 list-none text-xs text-ink-500">
      {exclusions.map((exclusion) => (
        <li key={`${exclusion.firstName}-${exclusion.reason}`}>
          {t(EXCLUSION_MESSAGE_KEY[exclusion.reason], { name: exclusion.firstName })}
        </li>
      ))}
    </ul>
  );
}

function LoadingView(): JSX.Element {
  const { t } = useTranslation();
  return <p className="text-ink-400 italic text-sm">{t('freeSlots.loading')}</p>;
}

function NoCalendarAtAllView(): JSX.Element {
  const { t } = useTranslation();
  return (
    <p className="text-sm text-ink-500">
      {t('freeSlots.noCalendarAtAll')}{' '}
      <Link to="/account" className="underline text-ink-900">
        {t('freeSlots.connectYours')}
      </Link>
    </p>
  );
}

function NoSlotView({ exclusions }: ViewProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <>
      <p className="text-sm text-ink-500">{t('freeSlots.none')}</p>
      <ExclusionList exclusions={exclusions} />
    </>
  );
}

function SlotsView({ slots, exclusions, onBook }: ViewProps): JSX.Element {
  const { i18n } = useTranslation();
  return (
    <>
      <ul className="flex flex-col gap-1.5 p-0 m-0 list-none">
        {slots.map((slot) => {
          const formatted = formatFreeSlot(slot.start, slot.end, i18n.language);
          return (
            <FreeSlotRow
              key={slot.start}
              day={formatted.day}
              hours={formatted.hours}
              onBook={() => onBook(new Date(slot.start))}
            />
          );
        })}
      </ul>
      <ExclusionList exclusions={exclusions} />
    </>
  );
}

const VIEW_COMPONENT: Readonly<Record<FreeSlotsView, (props: ViewProps) => JSX.Element>> = {
  loading: LoadingView,
  'no-calendar-at-all': NoCalendarAtAllView,
  'no-slot': NoSlotView,
  slots: SlotsView,
};

// @FollowsBlueprint organism-query-owning
export function FreeSlotsPanel({ onBook }: FreeSlotsPanelProps): JSX.Element {
  const { t } = useTranslation();
  const freeSlotsQuery = useFreeSlots();
  const membersQuery = useMembersList();
  const slots = freeSlotsQuery.data?.slots ?? NO_SLOTS;
  const members = membersQuery.data?.members ?? NO_MEMBERS;
  const exclusions = nameExclusions(freeSlotsQuery.data?.excludedMembers ?? [], members);
  const View =
    VIEW_COMPONENT[
      selectFreeSlotsView({
        isLoaded: freeSlotsQuery.data !== undefined,
        slotCount: slots.length,
        exclusions,
        memberCount: members.length,
      })
    ];

  return (
    <section aria-labelledby="free-slots-title" className="flex flex-col gap-2 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
        <h2 id="free-slots-title" className="text-base text-ink-900 m-0">
          {t('freeSlots.title')}
        </h2>
        <p className="text-xs text-ink-400 m-0">{t('freeSlots.subtitle')}</p>
      </div>
      {freeSlotsQuery.isError ? (
        <p className="text-danger text-sm" role="alert">
          {t('freeSlots.error')}
        </p>
      ) : (
        <View slots={slots} exclusions={exclusions} onBook={onBook} />
      )}
    </section>
  );
}
