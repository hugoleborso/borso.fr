import { CAPO_MAX, CAPO_MIN, KEY_OVERRIDE_MAX_LENGTH } from '@domain/input-limits.core';
/** @Feature setlists */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { composeClassName } from '../atoms/class-name.utils';
import { inputVariants } from '../atoms/input.variants';
import { type SetlistEntryForm } from './setlist-entry-form.hook';

const FIELD_CLASS = composeClassName(
  inputVariants({ size: 'sm' }),
  'w-12 px-1 text-center font-mono',
);
const LABEL_CLASS = 'flex items-center gap-1.5 text-label tracking-wider uppercase text-ink-soft';

interface SetlistEntryKeyCapoFieldsProps {
  readonly form: SetlistEntryForm;
  readonly onKeyType: (text: string) => void;
  readonly onCapoType: (text: string) => void;
}

// @FollowsBlueprint molecule-presentational
export function SetlistEntryKeyCapoFields({
  form,
  onKeyType,
  onCapoType,
}: SetlistEntryKeyCapoFieldsProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <form.Field name="keyOverride">
        {(field) => (
          <label className={LABEL_CLASS}>
            {t('setlist.key')}
            <input
              type="text"
              value={field.state.value}
              onChange={(event) => {
                const next = event.target.value;
                field.handleChange(next);
                onKeyType(next);
              }}
              onBlur={field.handleBlur}
              maxLength={KEY_OVERRIDE_MAX_LENGTH}
              className={FIELD_CLASS}
            />
          </label>
        )}
      </form.Field>
      <form.Field name="capo">
        {(field) => (
          <label className={LABEL_CLASS}>
            {t('setlist.capo')}
            <input
              type="number"
              inputMode="numeric"
              min={CAPO_MIN}
              max={CAPO_MAX}
              value={field.state.value}
              onChange={(event) => {
                const next = event.target.value;
                field.handleChange(next);
                onCapoType(next);
              }}
              onBlur={field.handleBlur}
              className={FIELD_CLASS}
            />
          </label>
        )}
      </form.Field>
    </div>
  );
}
