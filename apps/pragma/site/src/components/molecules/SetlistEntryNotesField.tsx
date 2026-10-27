import { SETLIST_ENTRY_NOTES_MAX_LENGTH } from '@domain/input-limits.core';
/** @Feature setlists */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { AutoGrowTextarea } from '../atoms/AutoGrowTextarea';
import { type SetlistEntryForm } from './setlist-entry-form.hook';

const LABEL_CLASS =
  'flex flex-col gap-1 text-label tracking-wider uppercase text-ink-soft font-medium';
const NOTES_ROWS = 2;

interface SetlistEntryNotesFieldProps {
  readonly form: SetlistEntryForm;
  readonly onType: (text: string) => void;
}

// @FollowsBlueprint molecule-presentational
export function SetlistEntryNotesField({ form, onType }: SetlistEntryNotesFieldProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <form.Field name="notes">
      {(field) => (
        <label className={LABEL_CLASS}>
          {t('setlist.notes')}
          <AutoGrowTextarea
            size="sm"
            rows={NOTES_ROWS}
            value={field.state.value}
            onChange={(event) => {
              const next = event.target.value;
              field.handleChange(next);
              onType(next);
            }}
            onBlur={field.handleBlur}
            maxLength={SETLIST_ENTRY_NOTES_MAX_LENGTH}
            className="font-display italic"
          />
        </label>
      )}
    </form.Field>
  );
}
