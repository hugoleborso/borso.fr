import {
  AVAILABLE_SUPPORTS,
  type AvailableSupport,
  BAR_STATUSES,
  type BarStatus,
  CONCERT_MOODS,
  type ConcertMood,
} from '@domain/bar-profile.core';
/** @Feature bars */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AVAILABLE_SUPPORT_KEY,
  BAR_STATUS_KEY,
  CONCERT_MOOD_KEY,
  parseBarStatus,
  parseConcertMood,
  toggleSupport,
} from '../../routes/bars/bar-form.core';
import { inputVariants } from '../atoms/input.variants';

const FIELD_LABEL_CLASS = 'text-label tracking-wider uppercase text-ink-soft font-medium';
const SELECT_CLASS = inputVariants({ size: 'md' });
const CHECKBOX_LABEL_CLASS =
  'inline-flex items-center gap-2 min-h-11 text-meta text-ink cursor-pointer';

export interface BarOwnerOption {
  readonly id: string;
  readonly firstName: string;
}

export interface BarStatusFieldProps {
  readonly value: BarStatus;
  readonly onChange: (status: BarStatus) => void;
  readonly onBlur: () => void;
}

// @FollowsBlueprint molecule-presentational
export function BarStatusField({ value, onChange, onBlur }: BarStatusFieldProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <>
      <label className={FIELD_LABEL_CLASS} htmlFor="bar-status">
        {t('bars.status')}
      </label>
      <select
        id="bar-status"
        value={value}
        onChange={(event) => {
          const status = parseBarStatus(event.target.value);
          if (status === null) throw new TypeError('unknown bar status');
          onChange(status);
        }}
        onBlur={onBlur}
        className={SELECT_CLASS}
      >
        {BAR_STATUSES.map((status) => (
          <option key={status} value={status}>
            {t(BAR_STATUS_KEY[status])}
          </option>
        ))}
      </select>
    </>
  );
}

export interface BarOwnerFieldProps {
  readonly owners: readonly BarOwnerOption[];
  readonly value: string;
  readonly onChange: (ownerMemberId: string) => void;
  readonly onBlur: () => void;
}

// @FollowsBlueprint molecule-presentational
export function BarOwnerField({
  owners,
  value,
  onChange,
  onBlur,
}: BarOwnerFieldProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <>
      <label className={FIELD_LABEL_CLASS} htmlFor="bar-owner">
        {t('bars.owner')}
      </label>
      <select
        id="bar-owner"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        className={SELECT_CLASS}
      >
        <option value="">{t('bars.ownerNone')}</option>
        {owners.map((owner) => (
          <option key={owner.id} value={owner.id}>
            {owner.firstName}
          </option>
        ))}
      </select>
    </>
  );
}

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
      <div className="flex flex-wrap gap-x-4" role="group" aria-label={t('bars.support')}>
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
      </div>
    </>
  );
}
