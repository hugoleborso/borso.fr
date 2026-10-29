/** @Feature auth */

import { PASSKEY_LABEL_MAX_LENGTH } from '@domain/input-limits.core';
import { useForm } from '@tanstack/react-form';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { useRenamePasskey } from '../../lib/queries/me.queries';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { Sheet } from '../molecules/Sheet';

const FIELD_ID = 'passkey-name';

const passkeyNameFormSchema = z.object({
  label: z.string().trim().min(1).max(PASSKEY_LABEL_MAX_LENGTH),
});

export interface PasskeyNameSheetProps {
  readonly passkeyId: string;
  readonly suggestedLabel: string;
  readonly onClose: () => void;
}

// @FollowsBlueprint organism-form
export function PasskeyNameSheet({
  passkeyId,
  suggestedLabel,
  onClose,
}: PasskeyNameSheetProps): JSX.Element {
  const { t } = useTranslation();
  const renamePasskey = useRenamePasskey();

  const form = useForm({
    defaultValues: { label: suggestedLabel },
    validators: { onChange: passkeyNameFormSchema },
    onSubmit: async ({ value }) => {
      await renamePasskey.mutateAsync({ passkeyId, label: value.label.trim() });
      onClose();
    },
  });

  return (
    <Sheet
      title={<label htmlFor={FIELD_ID}>{t('account.passkeyLabel')}</label>}
      label={t('account.passkeyLabel')}
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
              icon="check"
              disabled={!canSubmit || isSubmitting}
            >
              {t('common.save')}
            </Button>
          )}
        </form.Subscribe>
      }
    >
      <form.Field name="label">
        {(field) => (
          <Input
            id={FIELD_ID}
            type="text"
            value={field.state.value}
            onChange={(event) => field.handleChange(event.target.value)}
            onBlur={field.handleBlur}
            maxLength={PASSKEY_LABEL_MAX_LENGTH}
          />
        )}
      </form.Field>
      {renamePasskey.isError ? (
        <p role="alert" className="mt-3 text-meta text-danger">
          {t('account.passkeyRenameFailed')}
        </p>
      ) : null}
    </Sheet>
  );
}
