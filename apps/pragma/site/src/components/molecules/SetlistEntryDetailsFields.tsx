/**
 * The three per-entry overrides a setlist row hides behind its "more" toggle:
 * key override, capo, and notes.
 *
 * Like every other field on the row, a change here reaches the parent through
 * `onPatch` as it is typed; the form is never submitted.
 * @Feature setlists
 */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { AutoGrowTextarea } from '../atoms/AutoGrowTextarea';
import { composeClassName } from '../atoms/class-name.utils';
import { inputVariants } from '../atoms/input.variants';
import type { SetlistEntryPatch } from '../../lib/queries/setlists.queries';
import {
  CAPO_MAX,
  CAPO_MIN,
  KEY_OVERRIDE_MAX,
  NOTES_MAX,
  type SetlistEntryForm,
} from './setlist-entry-form.hook';

const FIELD_CLASS = composeClassName(inputVariants({ size: 'sm' }), 'font-mono');
const LABEL_CLASS = 'flex flex-col gap-1 text-xs tracking-wider uppercase text-ink-400 font-medium';
const NOTES_ROWS = 2;

interface SetlistEntryDetailsFieldsProps {
  readonly form: SetlistEntryForm;
  readonly onPatch: (patch: SetlistEntryPatch) => void;
}

// @FollowsBlueprint molecule-presentational
export function SetlistEntryDetailsFields({
  form,
  onPatch,
}: SetlistEntryDetailsFieldsProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
      <form.Field name="keyOverride">
        {(field) => (
          <label className={LABEL_CLASS}>
            {t('setlist.keyOverride')}
            <input
              type="text"
              value={field.state.value}
              onChange={(event) => {
                const next = event.target.value;
                field.handleChange(next);
                onPatch({ keyOverride: next.length === 0 ? null : next });
              }}
              onBlur={field.handleBlur}
              maxLength={KEY_OVERRIDE_MAX}
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
              min={CAPO_MIN}
              max={CAPO_MAX}
              value={field.state.value}
              onChange={(event) => {
                const next = event.target.value;
                field.handleChange(next);
                onPatch({ capo: next === '' ? null : Number(next) });
              }}
              onBlur={field.handleBlur}
              className={FIELD_CLASS}
            />
          </label>
        )}
      </form.Field>
      <form.Field name="notes">
        {(field) => (
          <label className={composeClassName(LABEL_CLASS, 'sm:col-span-3')}>
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
    </div>
  );
}
