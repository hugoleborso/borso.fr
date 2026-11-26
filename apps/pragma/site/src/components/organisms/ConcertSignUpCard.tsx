/** @Feature concert-registrations */

import { useForm } from '@tanstack/react-form';
import { type AnimationEvent, type JSX, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatSessionDateTime } from '../../lib/formatters.utils';
import {
  type RegisterVariables,
  type UpcomingConcert,
  useRegisterForConcert,
} from '../../lib/queries/concert-registrations.queries';
import {
  readStoredRegistration,
  type StoredRegistration,
} from '../../lib/registration-token.adapter';
import {
  buildSignUpPayload,
  EMAIL_INPUT_MAX_LENGTH,
  FIRST_NAME_INPUT_MAX_LENGTH,
  type SignUpErrorKey,
  type SignUpFormValues,
  selectErrorKeyAt,
  selectSignUpCardView,
  selectSignUpScreen,
  signUpFormSchema,
} from '../../routes/concerts/concert-sign-up.core';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { Icon } from '../atoms/Icon';
import { Input } from '../atoms/Input';
import { LabelledField } from '../atoms/LabelledField';
import { PreviewImage } from '../atoms/PreviewImage';
import { useIsOnline } from '../molecules/online-status.hook';
import { OpeningScreen } from './OpeningScreen';
import { RegistrationFollowUpSheet } from './RegistrationFollowUpSheet';
import { isOpeningExit, selectConnectionNote } from './session-gate.core';

export interface ConcertSignUpCardProps {
  readonly concert: UpcomingConcert;
}

const ERROR_CLASS = 'm-0 text-meta text-danger';

interface SignUpFormProps {
  readonly sessionId: string;
  readonly isSending: boolean;
  readonly emailErrorKey: SignUpErrorKey | null;
  readonly formErrorKey: SignUpErrorKey | null;
  readonly onSubmit: (values: SignUpFormValues) => void;
}

// @FollowsBlueprint route-form
function SignUpForm({
  sessionId,
  isSending,
  emailErrorKey,
  formErrorKey,
  onSubmit,
}: SignUpFormProps): JSX.Element {
  const { t } = useTranslation();
  const defaultValues: SignUpFormValues = { firstName: '', email: '' };
  const form = useForm({
    defaultValues,
    validators: { onChange: signUpFormSchema },
    onSubmit: ({ value }) => onSubmit(value),
  });
  const firstNameId = `first-name-${sessionId}`;
  const emailId = `email-${sessionId}`;
  const emailErrorId = `email-error-${sessionId}`;

  return (
    <form
      noValidate
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <LabelledField id={firstNameId} label={t('concerts.firstName')}>
          <form.Field name="firstName">
            {(field) => (
              <Input
                id={firstNameId}
                type="text"
                autoComplete="given-name"
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
                onBlur={field.handleBlur}
                required
                maxLength={FIRST_NAME_INPUT_MAX_LENGTH}
              />
            )}
          </form.Field>
        </LabelledField>
        <LabelledField id={emailId} label={t('concerts.email')}>
          <form.Field name="email">
            {(field) => (
              <Input
                id={emailId}
                type="email"
                inputMode="email"
                autoComplete="email"
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
                onBlur={field.handleBlur}
                required
                maxLength={EMAIL_INPUT_MAX_LENGTH}
                aria-invalid={emailErrorKey !== null}
                aria-describedby={emailErrorKey === null ? undefined : emailErrorId}
              />
            )}
          </form.Field>
          {emailErrorKey === null ? null : (
            <p id={emailErrorId} className={ERROR_CLASS} role="alert">
              {t(emailErrorKey)}
            </p>
          )}
        </LabelledField>
      </div>
      <form.Subscribe selector={(state) => state.canSubmit}>
        {(canSubmit) => (
          <Button
            type="submit"
            icon="check"
            variant="primary"
            size="lg"
            className="w-full sm:w-auto sm:self-start"
            disabled={!canSubmit || isSending}
          >
            {t('concerts.signUp')}
          </Button>
        )}
      </form.Subscribe>
      {formErrorKey === null ? null : (
        <p className={ERROR_CLASS} role="alert">
          {t(formErrorKey)}
        </p>
      )}
    </form>
  );
}

// @FollowsBlueprint organism-query-owning
export function ConcertSignUpCard({ concert }: ConcertSignUpCardProps): JSX.Element {
  const { t, i18n } = useTranslation();
  const isOnline = useIsOnline();
  const signUp = useRegisterForConcert();
  const [remembered] = useState<StoredRegistration | null>(() =>
    readStoredRegistration(concert.sessionId),
  );
  const [hasOpened, setHasOpened] = useState(false);
  const [hasLeft, setHasLeft] = useState(false);
  const [isFollowUpOpen, setIsFollowUpOpen] = useState(false);
  const [hasAnsweredFollowUp, setHasAnsweredFollowUp] = useState(false);
  const registration = signUp.data ?? remembered;
  const screen = selectSignUpScreen({
    status: signUp.status,
    error: signUp.error,
    hasOpened,
    hasLeft,
  });
  const view = selectSignUpCardView(registration !== null, hasAnsweredFollowUp);
  const emailErrorKey = selectErrorKeyAt(screen.error, 'email');
  const formErrorKey = selectErrorKeyAt(screen.error, 'form');

  const send = (variables: RegisterVariables): void => {
    setHasOpened(false);
    setHasLeft(false);
    signUp.mutate(variables, { onSuccess: () => setIsFollowUpOpen(true) });
  };

  const submit = (values: SignUpFormValues): void => {
    send({ sessionId: concert.sessionId, ...buildSignUpPayload(values) });
  };

  const retry = (): void => {
    if (signUp.variables !== undefined) send(signUp.variables);
  };

  const closeFollowUp = (): void => {
    setIsFollowUpOpen(false);
    setHasAnsweredFollowUp(true);
  };

  const VIEW_BY_STATE = {
    form: (
      <SignUpForm
        sessionId={concert.sessionId}
        isSending={signUp.isPending}
        emailErrorKey={emailErrorKey}
        formErrorKey={formErrorKey}
        onSubmit={submit}
      />
    ),
    registered: (
      <p className="m-0 flex items-center gap-2 font-medium text-ink" role="status">
        <Icon name="check" className="text-good" />
        {t('concerts.registered')}
      </p>
    ),
    thanked: (
      <p className="m-0 flex items-center gap-2 font-medium text-ink" role="status">
        <Icon name="check" className="text-good" />
        {t('concerts.thanks')}
      </p>
    ),
  } as const;

  return (
    <Card className="flex flex-col gap-4 overflow-hidden p-0">
      {concert.posterUrl === null ? null : (
        <PreviewImage
          source={concert.posterUrl}
          alternativeText={t('concerts.posterAlt', { venue: concert.venue ?? '' })}
          className="block h-auto w-full object-cover"
        />
      )}
      <div className="flex flex-col gap-4 px-4 pt-4 pb-5 sm:px-6 sm:pt-5 sm:pb-6">
        <header className="flex flex-col gap-1">
          <p className="m-0 flex items-center gap-2 text-label font-medium uppercase tracking-[0.16em] text-accent-strong">
            <Icon name="calendar" size="sm" />
            {formatSessionDateTime(concert.date, i18n.language)}
          </p>
          <h2 className="m-0 font-display text-title text-ink">
            {concert.venue ?? t('concerts.venueUnknown')}
          </h2>
        </header>
        {concert.message === null ? null : (
          <p className="m-0 whitespace-pre-line text-body text-ink">{concert.message}</p>
        )}
        {VIEW_BY_STATE[view]}
      </div>
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
      {isFollowUpOpen && screen.isAnswerShown && registration !== null ? (
        <RegistrationFollowUpSheet registration={registration} onDone={closeFollowUp} />
      ) : null}
    </Card>
  );
}
