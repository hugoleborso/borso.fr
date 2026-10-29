/** @Feature setlists */

import { SETLIST_NAME_MAX_LENGTH } from '@domain/input-limits.core';
import { useForm } from '@tanstack/react-form';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { ApiError } from '../../lib/api.client';
import { useCreateSetlist } from '../../lib/queries/setlists.queries';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { Sheet } from '../molecules/Sheet';

const LABEL_CLASS = 'text-label tracking-wider uppercase text-ink-soft';

interface CreateSetlistDialogProps {
  readonly sessionId: string | null;
  readonly suggestedName: string;
  readonly onClose: () => void;
  readonly onCreated: (setlistId: string) => void;
}

const createSetlistFormSchema = z.object({ name: z.string().trim().max(SETLIST_NAME_MAX_LENGTH) });

// @FollowsBlueprint organism-form
export function CreateSetlistDialog({
  sessionId,
  suggestedName,
  onClose,
  onCreated,
}: CreateSetlistDialogProps): JSX.Element {
  const { t } = useTranslation();
  const createSetlist = useCreateSetlist();

  const form = useForm({
    defaultValues: { name: suggestedName },
    validators: { onChange: createSetlistFormSchema },
    onSubmit: async ({ value }) => {
      const created = await createSetlist.mutateAsync({ name: value.name.trim(), sessionId });
      onCreated(created.setlist.id);
      onClose();
    },
  });

  const submitError = createSetlist.error instanceof ApiError ? t('setlist.failure.create') : null;

  return (
    <Sheet
      title={t('setlist.create.title')}
      label={t('setlist.create.title')}
      isDismissible={false}
      onClose={onClose}
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
      footer={
        <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting] as const}>
          {([canSubmit, isSubmitting]) => (
            <Button
              type="submit"
              variant="primary"
              icon="plus"
              disabled={!canSubmit || isSubmitting || createSetlist.isPending}
            >
              {createSetlist.isPending || isSubmitting
                ? t('common.loading')
                : t('setlist.create.submit')}
            </Button>
          )}
        </form.Subscribe>
      }
    >
      <div className="flex flex-col gap-2.5">
        <label className={LABEL_CLASS} htmlFor="create-setlist-name">
          {t('setlist.create.nameLabel')}
        </label>
        <form.Field name="name">
          {(field) => (
            <Input
              id="create-setlist-name"
              type="text"
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
              onBlur={field.handleBlur}
              placeholder={t('setlist.create.namePlaceholder')}
              maxLength={SETLIST_NAME_MAX_LENGTH}
            />
          )}
        </form.Field>
        {submitError === null ? null : (
          <p className="text-meta text-danger" role="alert">
            {submitError}
          </p>
        )}
      </div>
    </Sheet>
  );
}
