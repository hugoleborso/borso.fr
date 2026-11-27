/** @Feature concert-registrations */

import { CONCERT_PRIZE_ICONS, type ConcertPrizeIcon } from '@domain/concert-prize.core';
import { useForm } from '@tanstack/react-form';
import { type JSX, useState } from 'react';
import { Button as PressableButton, FileTrigger } from 'react-aria-components';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import {
  useConcertAnnouncement,
  useSaveConcertAnnouncement,
} from '../../lib/queries/concert-registrations.queries';
import {
  findPosterFileRefusal,
  normaliseMessage,
  POSTER_FILE_TYPES,
  type PosterRefusalKey,
  PRIZE_LABEL_MAX_LENGTH,
  PUBLIC_MESSAGE_MAX_LENGTH,
  selectPublicPageSaveErrorKey,
} from '../../routes/concerts/concert-public-page.core';
import { AutoGrowTextarea } from '../atoms/AutoGrowTextarea';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { composeClassName } from '../atoms/class-name.utils';
import { Icon } from '../atoms/Icon';
import { Input } from '../atoms/Input';
import { FIELD_LABEL_CLASS } from '../atoms/LabelledField';
import { PreviewImage } from '../atoms/PreviewImage';
import { PrizeIconChoice } from '../molecules/PrizeIconChoice';
import { ConcertRegistrationsCard } from './ConcertRegistrationsCard';
import { VisitorQrCodeAction } from './VisitorQrCodeAction';

const MESSAGE_ROWS = 3;
const POSTER_TRIGGER_CLASS =
  'inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-pill border-0 bg-sunk px-4 ' +
  'text-body text-ink hover:bg-hover disabled:cursor-not-allowed disabled:text-ink-soft ' +
  'data-focus-visible:outline-3 data-focus-visible:outline-focus';
const PANEL_CARD_CLASS = 'flex flex-col gap-3.5 p-4';
const announcementFormSchema = z.object({
  prizeLabel: z.string().max(PRIZE_LABEL_MAX_LENGTH),
  prizeIcon: z.enum(CONCERT_PRIZE_ICONS),
  message: z.string().max(PUBLIC_MESSAGE_MAX_LENGTH),
});

export interface ConcertPublicPagePanelProps {
  readonly sessionId: string;
}

interface AnnouncementValues {
  readonly prizeLabel: string;
  readonly prizeIcon: ConcertPrizeIcon;
  readonly message: string;
}

interface AnnouncementFormProps {
  readonly initialValues: AnnouncementValues;
  readonly isSaving: boolean;
  readonly onSave: (values: AnnouncementValues) => void;
}

// @FollowsBlueprint route-form
function AnnouncementForm({ initialValues, isSaving, onSave }: AnnouncementFormProps): JSX.Element {
  const { t } = useTranslation();
  const form = useForm({
    defaultValues: initialValues,
    validators: { onChange: announcementFormSchema },
    onSubmit: ({ value }) => onSave(value),
  });
  return (
    <form
      className="flex flex-col gap-2.5"
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <label className={FIELD_LABEL_CLASS} htmlFor="concert-prize-label">
        {t('sessions.prizeLabel')}
      </label>
      <form.Field name="prizeLabel">
        {(field) => (
          <Input
            id="concert-prize-label"
            type="text"
            value={field.state.value}
            maxLength={PRIZE_LABEL_MAX_LENGTH}
            placeholder={t('sessions.prizeLabelPlaceholder')}
            onChange={(event) => field.handleChange(event.target.value)}
            onBlur={field.handleBlur}
          />
        )}
      </form.Field>
      <form.Field name="prizeIcon">
        {(field) => <PrizeIconChoice value={field.state.value} onChange={field.handleChange} />}
      </form.Field>
      <label
        className={composeClassName(FIELD_LABEL_CLASS, 'mt-1.5')}
        htmlFor="concert-public-message"
      >
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

// @FollowsBlueprint organism-query-owning
export function ConcertPublicPagePanel({ sessionId }: ConcertPublicPagePanelProps): JSX.Element {
  const { t } = useTranslation();
  const announcement = useConcertAnnouncement(sessionId);
  const save = useSaveConcertAnnouncement();
  const [posterRefusal, setPosterRefusal] = useState<PosterRefusalKey | null>(null);
  const posterUrl = announcement.data?.posterUrl ?? null;
  const saveErrorKey = selectPublicPageSaveErrorKey(save.error);

  const choosePoster = (files: FileList | null): void => {
    const file = files?.[0];
    if (file === undefined) return;
    const refusalKey = findPosterFileRefusal(file.type, file.size);
    setPosterRefusal(refusalKey);
    if (refusalKey !== null) return;
    save.mutate({ sessionId, poster: file });
  };

  const removePoster = (): void => {
    setPosterRefusal(null);
    save.mutate({ sessionId, poster: null });
  };

  const saveAnnouncement = (values: AnnouncementValues): void => {
    save.mutate({
      sessionId,
      prizeLabel: normaliseMessage(values.prizeLabel),
      prizeIcon: values.prizeIcon,
      message: normaliseMessage(values.message),
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <VisitorQrCodeAction className="self-start" />
      <Card className={PANEL_CARD_CLASS}>
        <span className={FIELD_LABEL_CLASS}>{t('sessions.poster')}</span>
        <div className="flex items-start gap-3.5">
          {posterUrl === null ? null : (
            <PreviewImage
              source={posterUrl}
              alternativeText={t('sessions.posterCurrent')}
              className="block h-auto w-30 shrink-0 rounded-md"
            />
          )}
          <div className="flex flex-auto flex-col gap-2.5">
            <FileTrigger acceptedFileTypes={[...POSTER_FILE_TYPES]} onSelect={choosePoster}>
              <PressableButton isDisabled={save.isPending} className={POSTER_TRIGGER_CLASS}>
                <Icon name="upload" size="md" />
                {t(posterUrl === null ? 'sessions.posterAdd' : 'sessions.posterReplace')}
              </PressableButton>
            </FileTrigger>
            {posterUrl === null ? null : (
              <Button
                icon="trash"
                variant="quiet"
                className="w-full border border-rule text-danger"
                disabled={save.isPending}
                onClick={removePoster}
              >
                {t('sessions.posterRemove')}
              </Button>
            )}
            <p className="m-0 text-label font-normal text-ink-faint">{t('sessions.posterTypes')}</p>
          </div>
        </div>
        {posterRefusal === null ? null : (
          <p className="m-0 text-meta text-danger" role="alert">
            {t(posterRefusal)}
          </p>
        )}
      </Card>

      <Card className={PANEL_CARD_CLASS}>
        {announcement.data === undefined ? null : (
          <AnnouncementForm
            initialValues={{
              prizeLabel: announcement.data.prizeLabel ?? '',
              prizeIcon: announcement.data.prizeIcon,
              message: announcement.data.message ?? '',
            }}
            isSaving={save.isPending}
            onSave={saveAnnouncement}
          />
        )}
        {saveErrorKey === null ? null : (
          <p className="m-0 text-meta text-danger" role="alert">
            {t(saveErrorKey)}
          </p>
        )}
      </Card>

      <ConcertRegistrationsCard sessionId={sessionId} />
    </div>
  );
}
