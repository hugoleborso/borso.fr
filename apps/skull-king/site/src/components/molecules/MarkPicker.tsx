import type { PirateAvatar } from '@domain/pirate-avatar.core';
import { PLAYER_COLORS, type PlayerColor } from '@domain/player-mark.core';
import { useTranslation } from 'react-i18next';
import { COLOR_KEYS } from '@site/lib/translation-keys.core';
import { PlayerMark } from '../atoms/PlayerMark';

export interface MarkPickerProps {
  readonly avatar: PirateAvatar;
  readonly color: PlayerColor;
  readonly onColor: (color: PlayerColor) => void;
}

// @FollowsBlueprint molecule-presentational
export function MarkPicker({ avatar, color, onColor }: MarkPickerProps) {
  const { t } = useTranslation();
  return (
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
            avatar={avatar}
            color={candidate}
            size="large"
            emphasis={candidate === color ? 'ringed' : 'plain'}
          />
        </button>
      ))}
    </div>
  );
}
