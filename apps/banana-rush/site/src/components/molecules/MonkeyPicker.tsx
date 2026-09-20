import { MONKEY_AVATARS, type MonkeyAvatar } from '@domain/monkey.core';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { selectMonkeyKey } from '@site/lib/translation-keys.core';
import { MonkeyFace } from '../atoms/MonkeyFace';

export interface MonkeyPickerProps {
  readonly value: MonkeyAvatar;
  readonly taken: readonly string[];
  readonly onChange: (avatar: MonkeyAvatar) => void;
  readonly legend: string;
}

// @FollowsBlueprint molecule-presentational
export function MonkeyPicker({ value, taken, onChange, legend }: MonkeyPickerProps) {
  const { t } = useTranslation();
  return (
    <fieldset>
      <legend className="mb-1 text-xs font-extrabold uppercase tracking-wide text-ink-soft">
        {legend}
      </legend>
      <div className="grid grid-cols-8 gap-1">
        {MONKEY_AVATARS.map((avatar) => {
          const isTaken = taken.includes(avatar);
          const isSelected = avatar === value;
          const monkeyName = t(selectMonkeyKey(avatar));
          const title = isTaken ? t('join.monkeyTaken') : monkeyName;
          return (
            <label
              key={avatar}
              title={title}
              className={clsx(
                'flex h-11 cursor-pointer items-center justify-center rounded-chunk border-[3px] border-ink has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-30 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink',
                isSelected ? 'bg-peel shadow-chunk-sm' : 'bg-cream',
              )}
            >
              <input
                type="radio"
                className="sr-only"
                checked={isSelected}
                disabled={isTaken}
                onChange={() => {
                  onChange(avatar);
                }}
              />
              <MonkeyFace avatar={avatar} className="h-7 w-7" />
              <span className="sr-only">{monkeyName}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
