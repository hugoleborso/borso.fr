/** @Feature auth */

import { CALENDAR_FEEDS_PER_MEMBER_MAX } from '@domain/input-limits.core';
import { type JSX, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { scrollIntoViewWhenAddressed } from '../../lib/anchor-scroll.adapter';
import { ApiError } from '../../lib/api.client';
import {
  useAddCalendarFeed,
  useRemoveCalendarFeed,
  useSignedInMember,
} from '../../lib/queries/me.queries';
import { Card } from '../atoms/Card';
import { CalendarFeedForm } from './CalendarFeedForm';
import { CALENDAR_SECTION_ID, selectCalendarFeedErrorKey } from './calendar-feed-form.utils';

// @FollowsBlueprint organism-query-owning
export function CalendarFeedCard(): JSX.Element {
  const { t } = useTranslation();
  const member = useSignedInMember();
  const addCalendarFeed = useAddCalendarFeed();
  const removeCalendarFeed = useRemoveCalendarFeed();
  const [calendarFeedMessage, setCalendarFeedMessage] = useState<string | null>(null);
  const [calendarFeedError, setCalendarFeedError] = useState<string | null>(null);
  return (
    <Card
      id={CALENDAR_SECTION_ID}
      ref={scrollIntoViewWhenAddressed}
      className="p-4 sm:p-6 scroll-mt-4"
    >
      <CalendarFeedForm
        feeds={member.data?.calendarFeeds ?? []}
        message={calendarFeedMessage}
        error={calendarFeedError}
        isRemoving={removeCalendarFeed.isPending}
        onSave={async (address) => {
          setCalendarFeedMessage(null);
          setCalendarFeedError(null);
          try {
            await addCalendarFeed.mutateAsync({ address });
            setCalendarFeedMessage(t('account.calendarFeedSaved'));
            return 'saved';
          } catch (error) {
            const status = error instanceof ApiError ? error.status : null;
            setCalendarFeedError(
              t(selectCalendarFeedErrorKey(status), { count: CALENDAR_FEEDS_PER_MEMBER_MAX }),
            );
            return 'refused';
          }
        }}
        onRemove={(feedId) => {
          setCalendarFeedMessage(null);
          setCalendarFeedError(null);
          removeCalendarFeed.mutate(
            { id: feedId },
            {
              onSuccess: () => setCalendarFeedMessage(t('account.calendarFeedRemoved')),
            },
          );
        }}
      />
    </Card>
  );
}
