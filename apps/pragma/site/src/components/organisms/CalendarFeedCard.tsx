/** @Feature auth */

import { type JSX, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { scrollIntoViewWhenAddressed } from '../../lib/anchor-scroll.adapter';
import {
  useRemoveCalendarFeed,
  useSaveCalendarFeed,
  useSignedInMember,
} from '../../lib/queries/me.queries';
import { Card } from '../atoms/Card';
import { CalendarFeedForm } from './CalendarFeedForm';
import { CALENDAR_SECTION_ID } from './calendar-feed-form.utils';

// @FollowsBlueprint organism-query-owning
export function CalendarFeedCard(): JSX.Element {
  const { t } = useTranslation();
  const member = useSignedInMember();
  const saveCalendarFeed = useSaveCalendarFeed();
  const removeCalendarFeed = useRemoveCalendarFeed();
  const [calendarFeedMessage, setCalendarFeedMessage] = useState<string | null>(null);
  const [calendarFeedError, setCalendarFeedError] = useState<string | null>(null);
  return (
    <Card
      id={CALENDAR_SECTION_ID}
      ref={scrollIntoViewWhenAddressed}
      className="p-4 sm:p-6 scroll-mt-4"
    >
      <h2 className="text-body text-ink m-0 mb-3">{t('account.calendarFeed')}</h2>
      <p className="text-meta text-ink-soft mt-0 mb-3">{t('account.calendarFeedHint')}</p>
      <CalendarFeedForm
        state={member.data?.calendarFeed ?? 'absent'}
        message={calendarFeedMessage}
        error={calendarFeedError}
        isRemoving={removeCalendarFeed.isPending}
        onSave={async (address) => {
          setCalendarFeedMessage(null);
          setCalendarFeedError(null);
          try {
            await saveCalendarFeed.mutateAsync({ address });
            setCalendarFeedMessage(t('account.calendarFeedSaved'));
          } catch {
            setCalendarFeedError(t('account.calendarFeedInvalid'));
          }
        }}
        onRemove={() => {
          setCalendarFeedMessage(null);
          setCalendarFeedError(null);
          removeCalendarFeed.mutate(undefined, {
            onSuccess: () => setCalendarFeedMessage(t('account.calendarFeedRemoved')),
          });
        }}
      />
    </Card>
  );
}
