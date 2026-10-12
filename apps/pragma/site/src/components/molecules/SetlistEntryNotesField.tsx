/** @Feature setlists */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { AutoGrowTextarea } from '../atoms/AutoGrowTextarea';
import type { SetlistEntryPatch } from '../../lib/queries/setlist-entries.queries';
import { NOTES_MAX, type SetlistEntryForm } from './setlist-entry-form.hook';

const LABEL_CLASS = 'flex flex-col gap-1 text-xs tracking-wider uppercase text-ink-400 font-medium';
const NOTES_ROWS = 2;

interface SetlistEntryNotesFieldProps {
  readonly form: SetlistEntryForm;
  readonly onPatch: (patch: SetlistEntryPatch) => void;
}

// @FollowsBlueprint molecule-presentational
export function SetlistEntryNotesField({
  form,
  onPatch,
}: SetlistEntryNotesFieldProps): JSX.Element {
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
              onPatch({ notes: next });
            }}
            onBlur={field.handleBlur}
            maxLength={NOTES_MAX}
            className="font-mono"
          />
        </label>
      )}
    </form.Field>
  );
}
