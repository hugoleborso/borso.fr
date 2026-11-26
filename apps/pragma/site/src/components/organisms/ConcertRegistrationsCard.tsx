/** @Feature concert-registrations */

import { type JSX, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  type ConcertRegistrationEntry,
  useConcertRegistrations,
  useRemoveConcertRegistration,
} from '../../lib/queries/concert-registrations.queries';
import { pickDrawWinners } from '../../routes/concerts/concert-public-page.core';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { FIELD_LABEL_CLASS } from '../atoms/LabelledField';
import { ConfirmDialog } from '../molecules/ConfirmDialog';

const SECTION_TITLE_CLASS = 'm-0 font-display text-heading text-ink';

export interface ConcertRegistrationsCardProps {
  readonly sessionId: string;
}

interface RegistrationRowProps {
  readonly registration: ConcertRegistrationEntry;
  readonly onRemove: (registration: ConcertRegistrationEntry) => void;
}

function RegistrationRow({ registration, onRemove }: RegistrationRowProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <li className="flex items-start gap-2 border-t border-rule py-2 first:border-t-0">
      <div className="flex min-w-0 flex-auto flex-col gap-0.5">
        <RegistrationDetails registration={registration} />
      </div>
      <Button
        icon="trash"
        variant="quiet"
        className="shrink-0 text-danger"
        aria-label={t('sessions.registrationRemoveLabel', { name: registration.firstName })}
        onClick={() => onRemove(registration)}
      >
        {t('sessions.registrationRemove')}
      </Button>
    </li>
  );
}

interface RegistrationDetailsProps {
  readonly registration: ConcertRegistrationEntry;
}

function RegistrationDetails({ registration }: RegistrationDetailsProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <>
      <span className="font-medium text-ink">{registration.firstName}</span>
      <span className="break-all text-meta text-ink-soft">{registration.email}</span>
      {registration.comingFor === null ? null : (
        <span className="text-meta text-ink-soft">
          {t('sessions.comingFor', { name: registration.comingFor.firstName })}
        </span>
      )}
      {registration.wishedSong === null ? null : (
        <span className="text-meta text-ink-soft">
          {t('sessions.wishedSong', {
            title: registration.wishedSong.title,
            artist: registration.wishedSong.artist,
          })}
        </span>
      )}
    </>
  );
}

// @FollowsBlueprint organism-query-owning
export function ConcertRegistrationsCard({
  sessionId,
}: ConcertRegistrationsCardProps): JSX.Element {
  const { t } = useTranslation();
  const registrations = useConcertRegistrations(sessionId);
  const remove = useRemoveConcertRegistration();
  const [registrationToRemove, setRegistrationToRemove] = useState<ConcertRegistrationEntry | null>(
    null,
  );
  const [winners, setWinners] = useState<readonly ConcertRegistrationEntry[] | null>(null);
  const registeredPeople = registrations.data?.registrations ?? [];

  const confirmRemoval = (registration: ConcertRegistrationEntry): void => {
    remove.mutate({ sessionId, registrationId: registration.id });
    setRegistrationToRemove(null);
  };

  const draw = (): void => {
    setWinners(pickDrawWinners(registeredPeople, Math.random));
  };

  return (
    <>
      <Card className="flex flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className={SECTION_TITLE_CLASS}>
            {t('sessions.registrationsTitle', { count: registeredPeople.length })}
          </h3>
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="text-meta text-accent-strong underline-offset-4 hover:underline"
          >
            {t('sessions.publicPageOpen')}
          </a>
        </div>
        <Button
          icon="bolt"
          variant="secondary"
          className="self-start"
          disabled={registeredPeople.length === 0}
          onClick={draw}
        >
          {t('sessions.drawWinners')}
        </Button>
        {winners === null ? null : (
          <div className="flex flex-col gap-1 rounded-md bg-accent-soft px-3 py-2" role="status">
            <span className={FIELD_LABEL_CLASS}>{t('sessions.winnersTitle')}</span>
            <span className="font-medium text-ink">
              {winners.map((winner) => `${winner.firstName} (${winner.email})`).join(', ')}
            </span>
          </div>
        )}
        {remove.isError ? (
          <p className="m-0 text-meta text-danger" role="alert">
            {t('sessions.registrationRemoveFailed')}
          </p>
        ) : null}
        {registeredPeople.length === 0 ? (
          <p className="m-0 text-meta text-ink-soft">{t('sessions.registrationsEmpty')}</p>
        ) : (
          <ul className="m-0 flex list-none flex-col p-0">
            {registeredPeople.map((registration) => (
              <RegistrationRow
                key={registration.id}
                registration={registration}
                onRemove={setRegistrationToRemove}
              />
            ))}
          </ul>
        )}
      </Card>
      {registrationToRemove === null ? null : (
        <ConfirmDialog
          question={t('sessions.registrationRemoveConfirm', {
            name: registrationToRemove.firstName,
            email: registrationToRemove.email,
          })}
          confirmLabel={t('sessions.registrationRemove')}
          onConfirm={() => confirmRemoval(registrationToRemove)}
          onCancel={() => setRegistrationToRemove(null)}
        />
      )}
    </>
  );
}
