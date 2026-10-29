/** @Feature sessions */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import {
  type FreeSlotsView,
  formatFreeSlot,
  type NamedExclusion,
  nameExclusions,
  selectExclusionMessageKey,
  selectFreeSlotsView,
} from '../../lib/free-slots.utils';
import { useFreeSlots } from '../../lib/queries/free-slots.queries';
import { useMembersList } from '../../lib/queries/members.queries';
import { ButtonLink } from '../atoms/ButtonLink';
import { FreeSlotRow } from '../molecules/FreeSlotRow';
import { CALENDAR_SECTION_PATH } from './calendar-feed-form.utils';

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

const NO_MEMBERS: readonly { id: string; firstName: string }[] = [];
const NO_SLOTS: readonly FreeSlot[] = [];

function ExclusionList({ exclusions }: Pick<ViewProps, 'exclusions'>): JSX.Element {
  const { t } = useTranslation();
  return (
    <ul className="flex flex-col gap-0.5 p-0 m-0 list-none text-meta text-ink-soft">
      {exclusions.map((exclusion, index) => (
        <li key={index}>
          {t(selectExclusionMessageKey(exclusion), {
            name: exclusion.firstName,
            calendar: exclusion.calendarName,
          })}
        </li>
      ))}
    </ul>
  );
}

function LoadingView(): JSX.Element {
  const { t } = useTranslation();
  return <p className="text-ink-soft italic text-meta">{t('freeSlots.loading')}</p>;
}

function NoCalendarAtAllView(): JSX.Element {
  const { t } = useTranslation();
  return (
    <>
      <p className="text-meta text-ink-soft m-0">{t('freeSlots.noCalendarAtAll')}</p>
      <ButtonLink
        to={CALENDAR_SECTION_PATH}
        variant="secondary"
        icon="calendar"
        className="self-start"
      >
        {t('freeSlots.connectYours')}
      </ButtonLink>
    </>
  );
}

function NoSlotView({ exclusions }: ViewProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <>
      <p className="text-meta text-ink-soft">{t('freeSlots.none')}</p>
      <ExclusionList exclusions={exclusions} />
    </>
  );
}

function SlotsView({ slots, exclusions, onBook }: ViewProps): JSX.Element {
  const { t, i18n } = useTranslation();
  return (
    <>
      <ExclusionList exclusions={exclusions} />
      <ul className="flex flex-col gap-1.5 p-0 m-0 list-none" aria-label={t('freeSlots.title')}>
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
    <div className="flex flex-col gap-2">
      {freeSlotsQuery.isError ? (
        <p className="text-danger text-meta" role="alert">
          {t('freeSlots.error')}
        </p>
      ) : (
        <View slots={slots} exclusions={exclusions} onBook={onBook} />
      )}
    </div>
  );
}
