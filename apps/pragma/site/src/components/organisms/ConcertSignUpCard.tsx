/** @Feature concert-registrations */

import { type AnimationEvent, type JSX, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  type RegisterVariables,
  type UpcomingConcert,
  useRegisterForConcert,
  useRememberedRegistrationCheck,
} from '../../lib/queries/concert-registrations.queries';
import { readStoredRegistration } from '../../lib/registration-token.adapter';
import {
  buildSignUpPayload,
  EMPTY_SIGN_UP,
  isSignUpSheetShown,
  type SignUpFormValues,
  selectErrorKeyAt,
  selectSignUpScreen,
} from '../../routes/concerts/concert-sign-up.core';
import { API_BASE } from '../../lib/api.client';
import {
  buildConcertCalendarUrl,
  formatTicketDate,
} from '../../routes/concerts/concert-ticket.core';
import { Button } from '../atoms/Button';
import { ButtonAnchor } from '../atoms/ButtonAnchor';
import { Icon } from '../atoms/Icon';
import { useIsOnline } from '../molecules/online-status.hook';
import { ConcertSignUpSheet } from './ConcertSignUpSheet';
import { ConcertTicket } from './ConcertTicket';
import { OpeningScreen } from './OpeningScreen';
import { RegistrationFollowUpSheet } from './RegistrationFollowUpSheet';
import { isOpeningExit, selectConnectionNote } from './session-gate.core';

export interface ConcertSignUpCardProps {
  readonly concert: UpcomingConcert;
}

const WIDE_BUTTON_CLASS = 'min-h-14 w-full md:w-auto md:px-8.5';
const REGISTERED_CLASS =
  'm-0 flex min-h-14 flex-[1.3] items-center justify-center gap-2 rounded-pill bg-good-soft ' +
  'font-semibold text-good md:flex-none md:px-8';
const CALENDAR_CLASS =
  'min-h-14 shrink-0 border border-rule-strong bg-paper max-lg:w-14 max-lg:px-0 lg:px-6';
const CALENDAR_LABEL_CLASS = 'max-lg:sr-only';
const FRIEND_CLASS =
  'min-h-14 flex-1 border border-rule-strong bg-paper font-medium md:flex-none md:px-6';

// @FollowsBlueprint organism-query-owning
export function ConcertSignUpCard({ concert }: ConcertSignUpCardProps): JSX.Element {
  const { t, i18n } = useTranslation();
  const isOnline = useIsOnline();
  const signUp = useRegisterForConcert();
  const [storedRegistration] = useState(() => readStoredRegistration(concert.sessionId));
  const rememberedCheck = useRememberedRegistrationCheck(concert.sessionId, storedRegistration);
  const [hasSignedUpHere, setHasSignedUpHere] = useState(false);
  const [isSignUpRequested, setIsSignUpRequested] = useState(false);
  const [draft, setDraft] = useState<SignUpFormValues>(EMPTY_SIGN_UP);
  const [hasOpened, setHasOpened] = useState(false);
  const [hasLeft, setHasLeft] = useState(false);
  const [isFollowUpOpen, setIsFollowUpOpen] = useState(false);
  const screen = selectSignUpScreen({
    status: signUp.status,
    error: signUp.error,
    hasOpened,
    hasLeft,
  });
  const isRemembered = storedRegistration !== null && rememberedCheck.data?.isStanding !== false;
  const isRegistered = isRemembered || hasSignedUpHere;
  const isSheetShown = isSignUpSheetShown(isSignUpRequested, screen);
  const sheetTitle = t('concerts.signUpSheetTitle', {
    venue: concert.venue ?? t('concerts.venueUnknown'),
    date: formatTicketDate(concert.date, i18n.language).shortDate,
  });

  const send = (variables: RegisterVariables): void => {
    setHasOpened(false);
    setHasLeft(false);
    signUp.mutate(variables, {
      onSuccess: () => {
        setHasSignedUpHere(true);
        setIsFollowUpOpen(true);
      },
    });
  };

  const openSignUp = (): void => {
    signUp.reset();
    setDraft(EMPTY_SIGN_UP);
    setIsSignUpRequested(true);
  };

  const submit = (values: SignUpFormValues): void => {
    setDraft(values);
    setIsSignUpRequested(false);
    send({ sessionId: concert.sessionId, ...buildSignUpPayload(values) });
  };

  const closeSignUp = (): void => {
    setIsSignUpRequested(false);
    signUp.reset();
  };

  const retry = (): void => {
    if (signUp.variables !== undefined) send(signUp.variables);
  };

  const calendarLink = (
    <ButtonAnchor
      href={buildConcertCalendarUrl(API_BASE, concert.sessionId)}
      opensInPlace
      variant="quiet"
      size="lg"
      className={CALENDAR_CLASS}
      title={t('concerts.addToCalendar')}
      mark={<Icon name="calendar" size="md" />}
    >
      <span className={CALENDAR_LABEL_CLASS}>{t('concerts.calendarShort')}</span>
    </ButtonAnchor>
  );

  const actions = isRegistered ? (
    <>
      <p className={REGISTERED_CLASS} role="status">
        <Icon name="check" size="md" />
        {t('concerts.registered')}
      </p>
      <Button
        icon="userPlus"
        variant="quiet"
        size="lg"
        className={FRIEND_CLASS}
        aria-label={t('concerts.signUpFriendLabel')}
        onClick={openSignUp}
      >
        {t('concerts.signUpFriend')}
      </Button>
      {calendarLink}
    </>
  ) : (
    <>
      <Button
        icon="check"
        variant="primary"
        size="lg"
        className={WIDE_BUTTON_CLASS}
        onClick={openSignUp}
      >
        {t('concerts.signUp')}
      </Button>
      {calendarLink}
    </>
  );

  return (
    <>
      <ConcertTicket concert={concert} actions={actions} />
      {isSheetShown ? (
        <ConcertSignUpSheet
          sessionId={concert.sessionId}
          title={sheetTitle}
          initialValues={draft}
          emailErrorKey={selectErrorKeyAt(screen.error, 'email')}
          formErrorKey={selectErrorKeyAt(screen.error, 'form')}
          onSubmit={submit}
          onClose={closeSignUp}
        />
      ) : null}
      {screen.overlay === null ? null : (
        <OpeningScreen
          phase={screen.overlay}
          connectionNote={selectConnectionNote(isOnline)}
          onRetry={retry}
          onAnimationStart={() => setHasOpened(true)}
          onAnimationEnd={(event: AnimationEvent<HTMLDivElement>) =>
            setHasLeft(isOpeningExit(event.animationName))
          }
        />
      )}
      {isFollowUpOpen && screen.isAnswerShown && signUp.data !== undefined ? (
        <RegistrationFollowUpSheet
          registration={signUp.data}
          firstName={signUp.variables.firstName}
          onDone={() => setIsFollowUpOpen(false)}
        />
      ) : null}
    </>
  );
}
