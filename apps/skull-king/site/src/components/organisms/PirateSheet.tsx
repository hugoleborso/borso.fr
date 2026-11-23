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
import { PirateEditor } from '../molecules/PirateEditor';

export interface PirateSheetProps {
  readonly player: RosterPlayer;
  readonly onChange: (player: RosterPlayer) => void;
  readonly onRemove: (() => void) | null;
  readonly onClaim: (() => void) | null;
  readonly onClose: () => void;
}

// @FollowsBlueprint organism-presentational
export function PirateSheet({ player, onChange, onRemove, onClaim, onClose }: PirateSheetProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(player);
  const [draftName, setDraftName] = useState(player.name);

  const change = (next: RosterPlayer) => {
    setDraft(next);
    onChange(next);
  };

  const commitName = () => {
    const name = selectRename(draftName, draft.name);
    if (name !== null) change({ ...draft, name });
  };

  return (
    <Sheet
      label={t('pirate.title')}
      onClose={() => {
        commitName();
        onClose();
      }}
    >
      <div className="sticky -top-4 z-10 -mx-4 -mt-4 flex items-center gap-4 border-b border-outline bg-panel px-4 pt-4 pb-3">
        <PlayerMark avatar={draft.avatar} color={draft.color} size="hero" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h2 className="m-0 text-xs font-semibold tracking-widest text-muted uppercase">
            {t('pirate.title')}
          </h2>
          <label className="flex min-w-0">
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
      </div>
      <MarkPicker
        avatar={draft.avatar}
        color={draft.color}
        onColor={(color) => {
          change({ ...draft, color });
        }}
      />
      <PirateEditor
        avatar={draft.avatar}
        onChange={(avatar) => {
          change({ ...draft, avatar });
        }}
      />
      <div className="flex gap-3">
        {onRemove === null ? null : (
          <Button
            variant="danger"
            aria-label={t('picker.remove', { name: draft.name })}
            onClick={onRemove}
          >
            <Glyph name="trash" />
          </Button>
        )}
        {onClaim === null ? null : (
          <Button
            variant="raised"
            aria-label={t('account.claimSeat')}
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
          className="flex-1"
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
