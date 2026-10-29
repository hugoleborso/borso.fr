/** @Feature sessions */

import { type JSX, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '../../components/molecules/PageHeader';
import { BandCalendarSubscription } from '../../components/organisms/BandCalendarSubscription';
import { CreateSessionDialog } from '../../components/organisms/CreateSessionDialog';
import { FreeSlotsPanel } from '../../components/organisms/FreeSlotsPanel';
import { useNavigateTo } from '../../lib/navigation.hook';
import { useSessionsList } from '../../lib/queries/sessions.queries';

const NO_ROWS: readonly never[] = [];

// @FollowsBlueprint route-list-page
export function FindSlotPage(): JSX.Element {
  const { t } = useTranslation();
  const navigateTo = useNavigateTo();
  const [bookedStart, setBookedStart] = useState<Date | null>(null);
  const sessionsQuery = useSessionsList();
  const concerts = useMemo(
    () =>
      (sessionsQuery.data?.sessions ?? NO_ROWS)
        .filter((session) => session.kind === 'concert')
        .map((concert) => ({ id: concert.id, date: concert.date, venue: concert.venue })),
    [sessionsQuery.data],
  );

  return (
    <section className="max-w-3xl px-4 py-4 sm:px-9 sm:py-7">
      <PageHeader
        back={{ to: '/sessions', label: t('sessions.title') }}
        title={t('freeSlots.pageTitle')}
        subtitle={t('freeSlots.subtitle')}
        actions={<BandCalendarSubscription />}
      />
      <FreeSlotsPanel onBook={setBookedStart} />
      {bookedStart === null ? null : (
        <CreateSessionDialog
          kind="practice"
          initialDate={bookedStart}
          origin="free_slot"
          existingConcerts={concerts}
          onClose={() => setBookedStart(null)}
          onCreated={(sessionId) => navigateTo(`/sessions/${sessionId}`)}
        />
      )}
    </section>
  );
}
