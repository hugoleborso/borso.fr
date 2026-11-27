/** @Feature concert-registrations */

import type { JSX, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { UpcomingConcert } from '../../lib/queries/concert-registrations.queries';
import {
  buildVenueMapUrl,
  formatTicketDate,
  PRIZE_ICON_GLYPH,
  selectTicketLayout,
  type TicketLayout,
} from '../../routes/concerts/concert-ticket.core';
import { composeClassName } from '../atoms/class-name.utils';
import { Icon } from '../atoms/Icon';
import { PreviewImage } from '../atoms/PreviewImage';

export interface ConcertTicketProps {
  readonly concert: UpcomingConcert;
  readonly actions: ReactNode;
}

interface TicketLook {
  readonly band: string;
  readonly dayRow: string;
  readonly day: string;
  readonly month: string;
  readonly weekday: string;
  readonly hour: string;
  readonly clock: string;
  readonly venue: string;
  readonly message: string;
}

const TICKET_CLASS =
  'flex flex-col rounded-lg border-2 border-ink bg-raised ' +
  'md:w-full md:max-w-240 md:flex-row md:rounded-sheet';
const DETAILS_CLASS = 'contents md:relative md:flex md:min-w-0 md:flex-auto md:flex-col';
const OPENING_CLASS = 'rounded-t-lg-inset md:rounded-tr-none md:rounded-l-sheet-inset';
const NOTCH_CLASS =
  'absolute size-4.5 rotate-45 rounded-full border-2 border-transparent bg-paper bg-clip-padding';
const PERFORATION_DOTS_CLASS =
  'absolute bg-radial-[circle] from-rule-strong from-[1.7px] to-transparent to-[2.1px]';
const MONTHS_CLASS = 'flex flex-col gap-1 uppercase tracking-[0.12em]';
const VENUE_LINK_CLASS =
  'flex items-center gap-2 font-display italic underline decoration-1 underline-offset-4';
const ACTIONS_CLASS =
  'fixed inset-x-0 bottom-0 z-10 flex gap-2.5 bg-linear-to-t from-paper from-80% to-transparent px-5 pt-4 ' +
  'pb-[max(28px,env(safe-area-inset-bottom))] md:static md:mt-auto md:flex-wrap md:bg-none md:px-12 md:pt-9 md:pb-9';
const COUPON_CLASS =
  'block p-2 bg-highlight text-on-highlight md:rounded-bl-none md:rounded-br-sheet-inset';
const POSTER_IMAGE_CLASS = 'block h-auto w-full object-contain';
const POSTER_FIT_CLASS = {
  withPrize: 'max-md:max-h-[calc(100dvh-365px-max(28px,env(safe-area-inset-bottom)))]',
  withoutPrize: 'max-md:max-h-[calc(100dvh-275px-max(28px,env(safe-area-inset-bottom)))]',
} as const;
const COUPON_STUB_CLASS =
  'flex items-center gap-3.5 rounded-stub border-[1.5px] border-dashed border-ink px-3 py-2 ' +
  'md:px-9.5 md:py-2.5';

const LOOK_BY_LAYOUT = {
  poster: {
    band:
      'flex items-center gap-3.5 bg-stage-bg px-4.5 py-3.5 text-stage-ink ' +
      'md:flex-col md:items-start md:gap-4.5 md:bg-transparent md:px-12 md:pt-11 md:pb-0 md:text-ink',
    dayRow: 'flex items-center gap-3.5 md:gap-4.5',
    day: 'text-ticket-day md:text-ticket-day-wide',
    month: 'text-meta text-stage-chord md:text-body md:text-accent',
    weekday: 'text-meta text-stage-ink-dim md:text-body md:text-ink-soft',
    hour: 'ml-auto gap-2 text-ticket-hour max-[374px]:text-ticket-prize md:ml-0 md:gap-2.5 md:text-ticket-hour-wide',
    clock: 'size-6 text-stage-chord md:size-8 md:text-accent',
    venue:
      'px-4.5 py-3 text-ticket-venue text-ink md:px-12 md:pt-4.5 md:pb-0 md:text-ticket-venue-wide',
    message: 'px-4.5 pb-4 max-md:order-last md:px-12 md:pt-4.5 md:pb-0',
  },
  date: {
    band:
      'flex flex-col gap-3.5 bg-stage-bg px-5.5 pt-5.5 pb-3.5 text-stage-ink ' +
      OPENING_CLASS +
      ' ' +
      'md:min-h-140 md:w-105 md:shrink-0 md:justify-center md:gap-6 md:px-10 md:py-12',
    dayRow: 'flex items-center gap-4 md:flex-col md:items-start md:gap-6',
    day: 'text-ticket-day-hero md:text-ticket-day-giant',
    month: 'text-body text-stage-chord md:tracking-[0.16em]',
    weekday: 'text-body text-stage-ink-dim md:tracking-[0.16em]',
    hour: 'gap-2.5 text-ticket-hour-hero md:gap-3 md:text-ticket-hour-giant',
    clock: 'size-7 text-stage-chord md:size-10',
    venue:
      'bg-stage-bg px-5.5 pb-6 text-ticket-venue-hero text-stage-ink ' +
      'md:bg-transparent md:px-12 md:pt-12 md:pb-0 md:text-ticket-venue-giant md:text-ink',
    message: 'px-4.5 py-4 md:px-12 md:pt-5 md:pb-0',
  },
} as const satisfies Readonly<Record<TicketLayout, TicketLook>>;

interface DateBandProps {
  readonly concert: UpcomingConcert;
  readonly look: TicketLook;
}

function DateBand({ concert, look }: DateBandProps): JSX.Element {
  const { i18n } = useTranslation();
  const date = formatTicketDate(concert.date, i18n.language);
  return (
    <div className={look.band}>
      <p className={composeClassName('m-0', look.dayRow)}>
        <span className={composeClassName('font-display', look.day)}>{date.day}</span>
        <span className={MONTHS_CLASS}>
          <span className={look.month}>{date.month}</span>
          <span className={look.weekday}>{date.weekday}</span>
        </span>
      </p>
      <p
        className={composeClassName(
          'm-0 flex items-center font-display font-semibold whitespace-nowrap',
          look.hour,
        )}
      >
        <Icon name="clock" className={look.clock} />
        {date.hour}
      </p>
    </div>
  );
}

interface VenueProps {
  readonly venue: string | null;
  readonly look: TicketLook;
  readonly isLast: boolean;
}

function Venue({ venue, look, isLast }: VenueProps): JSX.Element {
  const { t } = useTranslation();
  const className = composeClassName(
    VENUE_LINK_CLASS,
    look.venue,
    isLast && 'rounded-b-lg-inset md:rounded-none',
  );
  if (venue === null) {
    return (
      <p className={composeClassName('m-0', className, 'no-underline')}>
        {t('concerts.venueUnknown')}
      </p>
    );
  }
  return (
    <a href={buildVenueMapUrl(venue)} target="_blank" rel="noreferrer" className={className}>
      <Icon name="mapPin" className="size-5 not-italic md:size-6.5" />
      {venue}
    </a>
  );
}

function VerticalPerforation(): JSX.Element {
  return (
    <div aria-hidden="true" className="absolute inset-y-0 left-0 z-1 hidden w-0 md:block">
      <div
        className={composeClassName(NOTCH_CLASS, '-top-2.5 -left-2.25 border-r-ink border-b-ink')}
      />
      <div
        className={composeClassName(
          NOTCH_CLASS,
          '-bottom-2.5 -left-2.25 border-t-ink border-l-ink',
        )}
      />
      <div
        className={composeClassName(
          PERFORATION_DOTS_CLASS,
          'inset-y-3.5 -left-0.5 w-1 bg-size-[4px_9px] bg-top bg-repeat-y',
        )}
      />
    </div>
  );
}

function HorizontalPerforation(): JSX.Element {
  return (
    <div aria-hidden="true" className="relative z-1 h-0 md:hidden">
      <div
        className={composeClassName(NOTCH_CLASS, '-top-2.25 -left-2.5 border-t-ink border-r-ink')}
      />
      <div
        className={composeClassName(NOTCH_CLASS, '-top-2.25 -right-2.5 border-b-ink border-l-ink')}
      />
      <div
        className={composeClassName(
          PERFORATION_DOTS_CLASS,
          'inset-x-3.5 -top-0.5 h-1 bg-size-[9px_4px] bg-left bg-repeat-x',
        )}
      />
    </div>
  );
}

interface PrizeCouponProps {
  readonly prize: NonNullable<UpcomingConcert['prize']>;
  readonly isLast: boolean;
}

function PrizeCoupon({ prize, isLast }: PrizeCouponProps): JSX.Element {
  return (
    <>
      <HorizontalPerforation />
      <p className={composeClassName('m-0', isLast && 'rounded-b-lg-inset', COUPON_CLASS)}>
        <span className={COUPON_STUB_CLASS}>
          <Icon name={PRIZE_ICON_GLYPH[prize.icon]} className="size-9" />
          <span className="font-display text-ticket-prize font-semibold">{prize.label}</span>
        </span>
      </p>
    </>
  );
}

// @FollowsBlueprint organism-presentational
export function ConcertTicket({ concert, actions }: ConcertTicketProps): JSX.Element {
  const { t } = useTranslation();
  const layout = selectTicketLayout(concert.posterUrl);
  const look = LOOK_BY_LAYOUT[layout];
  const band = <DateBand concert={concert} look={look} />;
  const isMessageAfterCoupon = layout === 'poster' && concert.message !== null;
  const isVenueLast = concert.message === null && concert.prize === null;
  return (
    <article className={TICKET_CLASS}>
      {concert.posterUrl === null ? (
        band
      ) : (
        <div
          className={composeClassName(
            'flex items-center overflow-hidden bg-stage-bg md:w-[47.5%] md:shrink-0',
            OPENING_CLASS,
          )}
        >
          <PreviewImage
            source={concert.posterUrl}
            alternativeText={t('concerts.posterAlt', { venue: concert.venue ?? '' })}
            className={composeClassName(
              POSTER_IMAGE_CLASS,
              POSTER_FIT_CLASS[concert.prize === null ? 'withoutPrize' : 'withPrize'],
            )}
          />
        </div>
      )}
      <div className={DETAILS_CLASS}>
        <VerticalPerforation />
        {concert.posterUrl === null ? null : band}
        <Venue venue={concert.venue} look={look} isLast={isVenueLast} />
        {concert.message === null ? null : (
          <p
            className={composeClassName(
              'm-0 whitespace-pre-line text-body text-ink-soft md:text-ticket-message',
              look.message,
            )}
          >
            {concert.message}
          </p>
        )}
        <div className={ACTIONS_CLASS}>{actions}</div>
        {concert.prize === null ? null : (
          <PrizeCoupon prize={concert.prize} isLast={!isMessageAfterCoupon} />
        )}
      </div>
    </article>
  );
}
