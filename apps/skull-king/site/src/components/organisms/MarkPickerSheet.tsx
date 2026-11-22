import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PLAYER_NAME_MAX_LENGTH } from '@domain/player-mark.core';
import { type RosterPlayer, selectRename } from '@site/lib/roster.core';
import { Button } from '../atoms/Button';
import { Glyph } from '../atoms/Glyph';
import { PlayerMark } from '../atoms/PlayerMark';
import { Sheet } from '../atoms/Sheet';
import { TextInput } from '../atoms/TextInput';
import { MarkPicker } from '../molecules/MarkPicker';

export interface MarkPickerSheetProps {
  readonly player: RosterPlayer;
  readonly onChange: (player: RosterPlayer) => void;
  readonly onRemove: (() => void) | null;
  readonly onClaim: (() => void) | null;
  readonly onClose: () => void;
}

// @FollowsBlueprint organism-presentational
export function MarkPickerSheet({
  player,
  onChange,
  onRemove,
  onClaim,
  onClose,
}: MarkPickerSheetProps) {
  const { t } = useTranslation();
  const [draftName, setDraftName] = useState(player.name);

  const commitName = () => {
    const name = selectRename(draftName, player.name);
    if (name !== null) onChange({ ...player, name });
  };

  return (
    <Sheet
      label={t('home.editPlayer', { name: player.name })}
      onClose={() => {
        commitName();
        onClose();
      }}
    >
      <div className="flex items-center gap-4">
        <PlayerMark icon={player.icon} color={player.color} size="hero" />
        <label className="flex min-w-0 flex-1">
          <span className="sr-only">{t('picker.name')}</span>
          <TextInput
            value={draftName}
            maxLength={PLAYER_NAME_MAX_LENGTH}
            onChange={(event) => {
              setDraftName(event.target.value);
            }}
            onBlur={commitName}
            className="w-full font-display text-3xl font-normal"
          />
        </label>
      </div>
      <MarkPicker
        icon={player.icon}
        color={player.color}
        onIcon={(icon) => {
          onChange({ ...player, icon });
        }}
        onColor={(color) => {
          onChange({ ...player, color });
        }}
      />
      <div className="flex gap-3">
        {onRemove === null ? null : (
          <Button
            variant="surface"
            aria-label={t('picker.remove', { name: player.name })}
            className="size-14 text-missed bg-surface-2"
            onClick={onRemove}
          >
            <Glyph name="trash" />
          </Button>
        )}
        {onClaim === null ? null : (
          <Button
            variant="surface"
            aria-label={t('account.claimSeat')}
            className="size-14 bg-surface-2"
            onClick={() => {
              onClaim();
              onClose();
            }}
          >
            <Glyph name="person" />
          </Button>
        )}
        <Button
          variant="primary"
          aria-label={t('common.done')}
          className="h-14 flex-1"
          onClick={() => {
            commitName();
            onClose();
          }}
        >
          <Glyph name="check" className="size-6" strokeWidth={3} />
        </Button>
      </div>
    </Sheet>
  );
}
