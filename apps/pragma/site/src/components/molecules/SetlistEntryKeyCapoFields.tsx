/** @Feature setlists */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import type { SetlistEntryPatch } from '../../lib/queries/setlist-entries.queries';
import {
  CAPO_MAX,
  CAPO_MIN,
  KEY_OVERRIDE_MAX,
  type SetlistEntryForm,
} from './setlist-entry-form.hook';

const FIELD_CLASS =
  'min-h-11 w-12 rounded-md border border-line bg-bg-elev px-1 text-center font-mono text-base text-ink-900 outline-none transition-colors focus:border-ink-700';
const LABEL_CLASS = 'flex items-center gap-1.5 text-[11px] tracking-wider uppercase text-ink-400';

interface SetlistEntryKeyCapoFieldsProps {
  readonly form: SetlistEntryForm;
  readonly onPatch: (patch: SetlistEntryPatch) => void;
}

// @FollowsBlueprint molecule-presentational
export function SetlistEntryKeyCapoFields({
  form,
  onPatch,
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
              inputMode="numeric"
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
    </div>
  );
}
