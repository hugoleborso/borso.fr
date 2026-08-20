/** @Feature setlists */

import { useForm } from '@tanstack/react-form';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { ApiError } from '../../lib/api.client';
import { openDialogOnAttach } from '../../lib/modal-dialog.adapter';
import { useCreateSetlist } from '../../lib/queries/setlists.queries';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';

const NAME_MAX = 120;
const LABEL_CLASS = 'text-xs tracking-wider uppercase text-ink-400 font-medium';

interface CreateSetlistDialogProps {
  readonly sessionId: string | null;
  readonly suggestedName: string;
  readonly onClose: () => void;
  readonly onCreated: (setlistId: string) => void;
}

const createSetlistFormSchema = z.object({ name: z.string().trim().max(NAME_MAX) });

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
    <dialog
      ref={openDialogOnAttach}
      onClose={onClose}
      className="m-auto w-[calc(100vw-2rem)] sm:w-[28rem] max-w-[28rem] rounded-lg border border-line bg-bg-elev p-0 backdrop:bg-ink-900/40"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-line">
        <h2 className="font-display italic text-xl text-ink-900 m-0">
          {t('setlist.create.title')}
        </h2>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClose}
          aria-label={t('common.cancel')}
          className="min-w-11"
        >
          ×
        </Button>
      </div>
      <form
        className="flex flex-col gap-2.5 p-4"
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void form.handleSubmit();
        }}
      >
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
              maxLength={NAME_MAX}
            />
          )}
        </form.Field>
        {submitError === null ? null : (
          <p className="text-danger text-sm" role="alert">
            {submitError}
          </p>
        )}
        <div className="flex gap-2 mt-2 justify-end">
          <Button type="button" variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting] as const}>
            {([canSubmit, isSubmitting]) => (
              <Button
                type="submit"
                variant="accent"
                disabled={!canSubmit || isSubmitting || createSetlist.isPending}
              >
                {createSetlist.isPending || isSubmitting
                  ? t('common.loading')
                  : t('setlist.create.submit')}
              </Button>
            )}
          </form.Subscribe>
        </div>
      </form>
    </dialog>
  );
}
