import { useTranslation } from 'react-i18next';
import { type PirateAvatar, SKIN_TONES } from '@domain/pirate-avatar.core';
import { STEPPED_PARTS, stepPiratePart } from '@site/lib/pirate-editor.core';
import { SKIN_HEX } from '@site/lib/pirate-portrait.core';
import { PIRATE_PART_KEYS } from '@site/lib/translation-keys.core';
import { Stepper } from '../atoms/Stepper';

const PREVIOUS = -1;
const NEXT = 1;

export interface PirateEditorProps {
  readonly avatar: PirateAvatar;
  readonly onChange: (avatar: PirateAvatar) => void;
}

// @FollowsBlueprint molecule-presentational
export function PirateEditor({ avatar, onChange }: PirateEditorProps) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-4">
      <div
        role="group"
        aria-label={t('pirate.parts.skin')}
        className="flex items-center justify-between gap-2"
      >
        {SKIN_TONES.map((tone, index) => (
          <button
            key={tone}
            type="button"
            aria-label={t('pirate.skinTone', { number: index + 1 })}
            aria-pressed={tone === avatar.skin}
            onClick={() => {
              onChange({ ...avatar, skin: tone });
            }}
            className="flex size-11 cursor-pointer items-center justify-center rounded-full aria-pressed:ring-2 aria-pressed:ring-accent"
          >
            <svg viewBox="0 0 10 10" className="size-9" aria-hidden="true" focusable="false">
              <circle cx="5" cy="5" r="5" fill={`#${SKIN_HEX[tone]}`} />
            </svg>
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-3">
        {STEPPED_PARTS.map((part) => {
          const partName = t(PIRATE_PART_KEYS[part]);
          return (
            <div key={part} className="flex min-w-0 flex-col items-center gap-1">
              <span className="max-w-full truncate text-xs font-semibold text-muted">
                {partName}
              </span>
              <Stepper
                label={partName}
                steps={[
                  {
                    text: '‹',
                    label: t('pirate.previous', { part: partName }),
                    isDisabled: false,
                    isPressed: undefined,
                    onPress: () => {
                      onChange(stepPiratePart(avatar, part, PREVIOUS));
                    },
                  },
                  {
                    text: '›',
                    label: t('pirate.next', { part: partName }),
                    isDisabled: false,
                    isPressed: undefined,
                    onPress: () => {
                      onChange(stepPiratePart(avatar, part, NEXT));
                    },
                  },
                ]}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
