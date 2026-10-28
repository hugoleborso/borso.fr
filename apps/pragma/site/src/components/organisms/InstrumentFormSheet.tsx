/** @Feature instruments */

import { INSTRUMENT_NAME_MAX_LENGTH } from '@domain/input-limits.core';
import {
  INSTRUMENT_FAMILIES,
  type InstrumentFamily,
  type InstrumentIcon,
} from '@domain/instrument.core';
import { useForm } from '@tanstack/react-form';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import {
  INSTRUMENT_FAMILY_LABEL_KEY,
  INSTRUMENT_ICON_LABEL_KEY,
} from '../../routes/instruments/instruments-page.core';
import { Button } from '../atoms/Button';
import { Chip } from '../atoms/Chip';
import { Icon, type IconName } from '../atoms/Icon';
import { Input } from '../atoms/Input';
import { InstrumentIconPicker } from '../molecules/InstrumentIconPicker';
import { Sheet } from '../molecules/Sheet';

export interface InstrumentFormValues {
  readonly name: string;
  readonly family: InstrumentFamily;
  readonly icon: InstrumentIcon;
}

export interface InstrumentFormSheetProps {
  readonly isNew: boolean;
  readonly initialValues: InstrumentFormValues;
  readonly onSave: (values: InstrumentFormValues) => Promise<void>;
  readonly onClose: () => void;
}

const INSTRUMENT_FAMILY_ICON = {
  harmonic: 'instr',
  percussive: 'bolt',
  vocal: 'mic',
  other: 'more',
} as const satisfies Readonly<Record<InstrumentFamily, IconName>>;
const INSTRUMENT_NAME_MIN_LENGTH = 1;
const LABEL_CLASS = 'text-label tracking-wider uppercase text-ink-soft font-medium';

// @FollowsBlueprint organism-form
export function InstrumentFormSheet({
  isNew,
  initialValues,
  onSave,
  onClose,
}: InstrumentFormSheetProps): JSX.Element {
  const { t } = useTranslation();
  const form = useForm({
    defaultValues: initialValues,
    onSubmit: async ({ value }) => {
      const trimmedName = value.name.trim();
      if (trimmedName.length === 0) return;
      await onSave({ ...value, name: trimmedName });
    },
  });
  const title = isNew ? t('instruments.newTitle') : t('instruments.editTitle');

  return (
    <Sheet
      title={title}
      label={title}
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
              {t('common.save')}
            </Button>
          )}
        </form.Subscribe>
      }
    >
      <div className="flex flex-col gap-2.5">
        <label className={LABEL_CLASS} htmlFor="instrument-name">
          {t('instruments.name')}
        </label>
        <form.Field name="name">
          {(field) => (
            <Input
              id="instrument-name"
              data-sheet-focus
              type="text"
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
              onBlur={field.handleBlur}
              required
              minLength={INSTRUMENT_NAME_MIN_LENGTH}
              maxLength={INSTRUMENT_NAME_MAX_LENGTH}
            />
          )}
        </form.Field>
        <span className={LABEL_CLASS}>{t('instruments.icon')}</span>
        <form.Field name="icon">
          {(field) => (
            <InstrumentIconPicker
              value={field.state.value}
              labelOf={(icon) => t(INSTRUMENT_ICON_LABEL_KEY[icon])}
              onPick={(icon) => field.handleChange(icon)}
            />
          )}
        </form.Field>
        <span className={LABEL_CLASS}>{t('instruments.family')}</span>
        <form.Field name="family">
          {(field) => (
            <div
              className="flex flex-wrap gap-1.5"
              role="group"
              aria-label={t('instruments.family')}
            >
              {INSTRUMENT_FAMILIES.map((family) => (
                <Chip
                  key={family}
                  pressed={field.state.value === family}
                  onPress={() => field.handleChange(family)}
                >
                  <Icon name={INSTRUMENT_FAMILY_ICON[family]} size="sm" />
                  {t(INSTRUMENT_FAMILY_LABEL_KEY[family])}
                </Chip>
              ))}
            </div>
          )}
        </form.Field>
      </div>
    </Sheet>
  );
}
