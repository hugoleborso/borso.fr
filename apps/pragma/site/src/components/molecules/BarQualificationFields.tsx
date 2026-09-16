/** @Feature bars */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AVAILABLE_SUPPORT_KEY,
  AVAILABLE_SUPPORTS,
  type AvailableSupport,
  CONCERT_MOOD_KEY,
  CONCERT_MOODS,
  type ConcertMood,
  parseConcertMood,
  toggleSupport,
} from '../../routes/bars/bar-form.core';
import { inputVariants } from '../atoms/input.variants';

const FIELD_LABEL_CLASS = 'text-xs tracking-wider uppercase text-ink-400 font-medium';
const SELECT_CLASS = inputVariants({ size: 'md' });
const CHECKBOX_LABEL_CLASS =
  'inline-flex items-center gap-2 min-h-11 text-sm text-ink-700 cursor-pointer';

export interface ConcertMoodFieldProps {
  readonly value: ConcertMood | '';
  readonly onChange: (mood: ConcertMood | '') => void;
  readonly onBlur: () => void;
}

// @FollowsBlueprint molecule-presentational
export function ConcertMoodField({ value, onChange, onBlur }: ConcertMoodFieldProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <>
      <label className={FIELD_LABEL_CLASS} htmlFor="bar-mood">
        {t('bars.mood')}
      </label>
      <select
        id="bar-mood"
        value={value}
        onChange={(event) => {
          const mood = parseConcertMood(event.target.value);
          if (mood === null) throw new TypeError('unknown concert mood');
          onChange(mood);
        }}
        onBlur={onBlur}
        className={SELECT_CLASS}
      >
        <option value="">{t('bars.moodUnknown')}</option>
        {CONCERT_MOODS.map((mood) => (
          <option key={mood} value={mood}>
            {t(CONCERT_MOOD_KEY[mood])}
          </option>
        ))}
      </select>
    </>
  );
}

export interface AvailableSupportFieldProps {
  readonly value: readonly AvailableSupport[];
  readonly onChange: (supports: AvailableSupport[]) => void;
  readonly onBlur: () => void;
}

// @FollowsBlueprint molecule-presentational
export function AvailableSupportField({
  value,
  onChange,
  onBlur,
}: AvailableSupportFieldProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <>
      <span className={FIELD_LABEL_CLASS}>{t('bars.support')}</span>
      <div className="flex flex-col gap-1.5" role="group" aria-label={t('bars.support')}>
        {AVAILABLE_SUPPORTS.map((support) => (
          <label key={support} className={CHECKBOX_LABEL_CLASS}>
            <input
              type="checkbox"
              checked={value.includes(support)}
              onChange={() => onChange(toggleSupport(value, support))}
              onBlur={onBlur}
              className="size-4 accent-accent"
            />
            {t(AVAILABLE_SUPPORT_KEY[support])}
          </label>
        ))}
        <span className="text-xs text-ink-400">{t('bars.supportNoneHint')}</span>
      </div>
    </>
  );
}
