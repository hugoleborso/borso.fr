import {
  PLAYER_COLORS,
  PLAYER_ICONS,
  type PlayerColor,
  type PlayerIcon,
} from '@domain/player-mark.core';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { COLOR_KEYS, ICON_KEYS } from '@site/lib/translation-keys.core';
import { PlayerMark } from '../atoms/PlayerMark';

export interface MarkPickerProps {
  readonly icon: PlayerIcon;
  readonly color: PlayerColor;
  readonly onIcon: (icon: PlayerIcon) => void;
  readonly onColor: (color: PlayerColor) => void;
}

// @FollowsBlueprint molecule-presentational
export function MarkPicker({ icon, color, onIcon, onColor }: MarkPickerProps) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-5">
      <div
        role="group"
        aria-label={t('picker.icon')}
        className="grid grid-cols-6 gap-2 justify-items-center"
      >
        {PLAYER_ICONS.map((candidate) => (
          <button
            key={candidate}
            type="button"
            aria-label={t(ICON_KEYS[candidate])}
            aria-pressed={candidate === icon}
            onClick={() => {
              onIcon(candidate);
            }}
            className={clsx('cursor-pointer rounded-full', candidate !== icon && 'opacity-40')}
          >
            <PlayerMark icon={candidate} color={candidate === icon ? color : 'sand'} size="large" />
          </button>
        ))}
      </div>
      <div
        role="group"
        aria-label={t('picker.color')}
        className="grid grid-cols-4 gap-3 justify-items-center sm:grid-cols-8"
      >
        {PLAYER_COLORS.map((candidate) => (
          <button
            key={candidate}
            type="button"
            aria-label={t(COLOR_KEYS[candidate])}
            aria-pressed={candidate === color}
            onClick={() => {
              onColor(candidate);
            }}
            className="cursor-pointer rounded-full"
          >
            <PlayerMark
              icon={icon}
              color={candidate}
              size="large"
              emphasis={candidate === color ? 'ringed' : 'plain'}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
