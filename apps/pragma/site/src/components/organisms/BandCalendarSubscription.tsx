/** @Feature sessions */

import { type JSX, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BAND_CALENDAR_ID,
  BAND_CALENDAR_NAME,
  bandCalendarSubscribeAddress,
  bandCalendarSubscriptionOf,
} from '../../lib/band-calendar.utils';
import type { CalendarPlatform } from '../../lib/calendar-guide.utils';
import { readCalendarPlatform } from '../../lib/display-mode.adapter';
import { Button } from '../atoms/Button';
import { ButtonAnchor } from '../atoms/ButtonAnchor';
import { Icon } from '../atoms/Icon';
import { Sheet } from '../molecules/Sheet';

export interface BandCalendarSubscriptionProps {
  readonly platform?: CalendarPlatform;
}

const SUBSCRIBE_ADDRESS = bandCalendarSubscribeAddress(BAND_CALENDAR_ID);

function OpenInGoogleLink({ label }: { readonly label: string }): JSX.Element {
  return (
    <ButtonAnchor
      href={SUBSCRIBE_ADDRESS}
      variant="secondary"
      mark={<Icon name="calendar" size="md" />}
    >
      {label}
    </ButtonAnchor>
  );
}

// @FollowsBlueprint organism-presentational
export function BandCalendarSubscription(props: BandCalendarSubscriptionProps): JSX.Element {
  const { t } = useTranslation();
  const [platform] = useState(() => props.platform ?? readCalendarPlatform());
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  if (bandCalendarSubscriptionOf(platform) === 'one-tap') {
    return <OpenInGoogleLink label={t('freeSlots.bandCalendar.subscribe')} />;
  }
  return (
    <>
      <Button variant="secondary" icon="calendar" onClick={() => setIsGuideOpen(true)}>
        {t('freeSlots.bandCalendar.subscribe')}
      </Button>
      {isGuideOpen ? (
        <Sheet
          title={t('freeSlots.bandCalendar.subscribe')}
          label={t('freeSlots.bandCalendar.subscribe')}
          onClose={() => setIsGuideOpen(false)}
        >
          <div className="flex flex-col gap-3">
            <ol className="m-0 flex list-decimal flex-col gap-1.5 pl-5 text-meta text-ink">
              <li>{t('freeSlots.bandCalendar.steps.addAccount')}</li>
              <li>
                {t('freeSlots.bandCalendar.steps.tickCalendar', { name: BAND_CALENDAR_NAME })}
              </li>
            </ol>
            <p className="m-0 text-meta text-ink-soft">{t('freeSlots.bandCalendar.fallback')}</p>
            <div>
              <OpenInGoogleLink label={t('freeSlots.bandCalendar.openInGoogle')} />
            </div>
          </div>
        </Sheet>
      ) : null}
    </>
  );
}
