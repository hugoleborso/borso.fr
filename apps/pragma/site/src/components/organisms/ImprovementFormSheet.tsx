/** @Feature improvements */

import { IMPROVEMENT_TITLE_MAX_LENGTH } from '@domain/input-limits.core';
import { useForm } from '@tanstack/react-form';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import {
  IMPROVEMENT_STATUSES,
  type ImprovementStatus,
  readStatus,
  selectStatusLabelKey,
} from '../../routes/improvements/improvements-page.core';
import { AutoGrowTextarea } from '../atoms/AutoGrowTextarea';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { inputVariants } from '../atoms/input.variants';
import { Sheet } from '../molecules/Sheet';

export interface ImprovementFormValues {
  readonly title: string;
  readonly details: string;
  readonly status: ImprovementStatus;
}

export interface ImprovementFormSheetProps {
  readonly isNew: boolean;
  readonly initialValues: ImprovementFormValues;
  readonly onSave: (values: ImprovementFormValues) => Promise<void>;
  readonly onClose: () => void;
}

const FIELD_CLASS = 'flex flex-col gap-1 text-meta text-ink-soft';

// @FollowsBlueprint organism-form
export function ImprovementFormSheet({
  isNew,
  initialValues,
  onSave,
  onClose,
}: ImprovementFormSheetProps): JSX.Element {
  const { t } = useTranslation();
  const form = useForm({
    defaultValues: initialValues,
    onSubmit: async ({ value }) => {
      const title = value.title.trim();
      if (title.length === 0) return;
      await onSave({ ...value, title });
    },
  });
  const sheetTitle = isNew ? t('improvements.newTitle') : t('improvements.editTitle');

  return (
    <Sheet
      title={sheetTitle}
      label={sheetTitle}
      onClose={onClose}
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
      footer={
        <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
          {([canSubmit, isSubmitting]) => (
            <Button
              icon="check"
              type="submit"
              variant="primary"
              size="lg"
              disabled={!canSubmit || isSubmitting}
            >
              {isNew ? t('common.add') : t('common.save')}
            </Button>
          )}
        </form.Subscribe>
      }
    >
      <div className="flex flex-col gap-3">
        <form.Field name="title">
          {(field) => (
            <label className={FIELD_CLASS}>
              {t('improvements.titleField')}
              <Input
                data-sheet-focus
                value={field.state.value}
                maxLength={IMPROVEMENT_TITLE_MAX_LENGTH}
                onChange={(event) => field.handleChange(event.target.value)}
              />
            </label>
          )}
        </form.Field>
        <form.Field name="details">
          {(field) => (
            <label className={FIELD_CLASS}>
              {t('improvements.detailsField')}
              <AutoGrowTextarea
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
              />
            </label>
          )}
        </form.Field>
        <form.Field name="status">
          {(field) => (
            <label className={FIELD_CLASS}>
              {t('improvements.statusField')}
              <select
                value={field.state.value}
                onChange={(event) => field.handleChange(readStatus(event.target.value))}
                className={inputVariants({ size: 'md' })}
              >
                {IMPROVEMENT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {t(selectStatusLabelKey(status))}
                  </option>
                ))}
              </select>
            </label>
          )}
        </form.Field>
      </div>
    </Sheet>
  );
}
