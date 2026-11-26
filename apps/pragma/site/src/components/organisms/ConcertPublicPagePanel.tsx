/** @Feature concert-registrations */

import { useForm } from '@tanstack/react-form';
import { type JSX, useState } from 'react';
import { Button as PressableButton, FileTrigger } from 'react-aria-components';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import {
  type ConcertRegistrationEntry,
  useConcertAnnouncement,
  useConcertRegistrations,
  useSaveConcertAnnouncement,
} from '../../lib/queries/concert-registrations.queries';
import {
  checkPoster,
  normaliseMessage,
  pickDrawWinners,
  POSTER_CONTENT_TYPES,
  type PosterRefusalKey,
  PUBLIC_MESSAGE_MAX_LENGTH,
} from '../../routes/concerts/concert-public-page.core';
import { AutoGrowTextarea } from '../atoms/AutoGrowTextarea';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { Icon } from '../atoms/Icon';
import { FIELD_LABEL_CLASS } from '../atoms/LabelledField';
import { PreviewImage } from '../atoms/PreviewImage';

const MESSAGE_ROWS = 4;
const POSTER_TRIGGER_CLASS =
  'inline-flex min-h-11 cursor-pointer items-center gap-2 self-start rounded-pill border-0 bg-glass px-4 ' +
  'text-body font-medium text-ink hover:bg-hover disabled:cursor-not-allowed disabled:text-ink-soft ' +
  'data-focus-visible:outline-3 data-focus-visible:outline-focus [&_svg]:text-accent';
const SECTION_TITLE_CLASS = 'm-0 font-display text-heading text-ink';
const messageFormSchema = z.object({ message: z.string().max(PUBLIC_MESSAGE_MAX_LENGTH) });

export interface ConcertPublicPagePanelProps {
  readonly sessionId: string;
}

interface MessageFormProps {
  readonly initialMessage: string;
  readonly isSaving: boolean;
  readonly onSave: (message: string) => void;
}

// @FollowsBlueprint route-form
function PublicMessageForm({ initialMessage, isSaving, onSave }: MessageFormProps): JSX.Element {
  const { t } = useTranslation();
  const form = useForm({
    defaultValues: { message: initialMessage },
    validators: { onChange: messageFormSchema },
    onSubmit: ({ value }) => onSave(value.message),
  });
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <label className={FIELD_LABEL_CLASS} htmlFor="concert-public-message">
        {t('sessions.publicMessage')}
      </label>
      <form.Field name="message">
        {(field) => (
          <AutoGrowTextarea
            id="concert-public-message"
            rows={MESSAGE_ROWS}
            value={field.state.value}
            maxLength={PUBLIC_MESSAGE_MAX_LENGTH}
            onChange={(event) => field.handleChange(event.target.value)}
            onBlur={field.handleBlur}
          />
        )}
      </form.Field>
      <form.Subscribe selector={(state) => state.canSubmit}>
        {(canSubmit) => (
          <Button
            type="submit"
            icon="check"
            variant="secondary"
            className="self-start"
            disabled={!canSubmit || isSaving}
          >
            {t('common.save')}
          </Button>
        )}
      </form.Subscribe>
    </form>
  );
}

interface RegistrationRowProps {
  readonly registration: ConcertRegistrationEntry;
}

function RegistrationRow({ registration }: RegistrationRowProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <li className="flex flex-col gap-0.5 border-t border-rule py-2 first:border-t-0">
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
    </li>
  );
}

// @FollowsBlueprint organism-query-owning
export function ConcertPublicPagePanel({ sessionId }: ConcertPublicPagePanelProps): JSX.Element {
  const { t } = useTranslation();
  const announcement = useConcertAnnouncement(sessionId);
  const registrations = useConcertRegistrations(sessionId);
  const save = useSaveConcertAnnouncement();
  const [posterRefusal, setPosterRefusal] = useState<PosterRefusalKey | null>(null);
  const [winners, setWinners] = useState<readonly ConcertRegistrationEntry[] | null>(null);
  const registeredPeople = registrations.data?.registrations ?? [];
  const posterUrl = announcement.data?.posterUrl ?? null;

  const choosePoster = (files: FileList | null): void => {
    const file = files?.[0];
    if (file === undefined) return;
    const { contentType, refusalKey } = checkPoster(file.type, file.size);
    setPosterRefusal(refusalKey);
    if (contentType === null) return;
    save.mutate({ sessionId, poster: { file, contentType } });
  };

  const saveMessage = (message: string): void => {
    save.mutate({ sessionId, message: normaliseMessage(message) });
  };

  const draw = (): void => {
    setWinners(pickDrawWinners(registeredPeople, Math.random));
  };

  return (
    <Card className="flex flex-col gap-5">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h2 className={SECTION_TITLE_CLASS}>{t('sessions.publicPageTitle')}</h2>
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="text-meta text-accent-strong underline-offset-4 hover:underline"
        >
          {t('sessions.publicPageOpen')}
        </a>
      </header>

      <section className="flex flex-col gap-3">
        <span className={FIELD_LABEL_CLASS}>{t('sessions.poster')}</span>
        {posterUrl === null ? null : (
          <PreviewImage
            source={posterUrl}
            alternativeText={t('sessions.poster')}
            className="block h-auto w-full max-w-xs rounded-md"
          />
        )}
        <FileTrigger acceptedFileTypes={[...POSTER_CONTENT_TYPES]} onSelect={choosePoster}>
          <PressableButton isDisabled={save.isPending} className={POSTER_TRIGGER_CLASS}>
            <Icon name="image" />
            {t(posterUrl === null ? 'sessions.posterAdd' : 'sessions.posterChange')}
          </PressableButton>
        </FileTrigger>
        {posterRefusal === null ? null : (
          <p className="m-0 text-meta text-danger" role="alert">
            {t(posterRefusal)}
          </p>
        )}
      </section>

      {announcement.data === undefined ? null : (
        <PublicMessageForm
          initialMessage={announcement.data.message ?? ''}
          isSaving={save.isPending}
          onSave={saveMessage}
        />
      )}
      {save.isError ? (
        <p className="m-0 text-meta text-danger" role="alert">
          {t('sessions.publicPageSaveFailed')}
        </p>
      ) : null}

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className={SECTION_TITLE_CLASS}>
            {t('sessions.registrationsTitle', { count: registeredPeople.length })}
          </h3>
          <Button
            icon="bolt"
            variant="secondary"
            disabled={registeredPeople.length === 0}
            onClick={draw}
          >
            {t('sessions.drawWinners')}
          </Button>
        </div>
        {winners === null ? null : (
          <div className="flex flex-col gap-1 rounded-md bg-accent-soft px-3 py-2" role="status">
            <span className={FIELD_LABEL_CLASS}>{t('sessions.winnersTitle')}</span>
            <span className="font-medium text-ink">
              {winners.map((winner) => `${winner.firstName} (${winner.email})`).join(', ')}
            </span>
          </div>
        )}
        {registeredPeople.length === 0 ? (
          <p className="m-0 text-meta text-ink-soft">{t('sessions.registrationsEmpty')}</p>
        ) : (
          <ul className="m-0 flex list-none flex-col p-0">
            {registeredPeople.map((registration) => (
              <RegistrationRow key={registration.id} registration={registration} />
            ))}
          </ul>
        )}
      </section>
    </Card>
  );
}
