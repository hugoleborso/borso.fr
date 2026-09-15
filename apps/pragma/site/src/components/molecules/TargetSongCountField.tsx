/** @Feature setlist-voting */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { readTargetSongCount } from '../../routes/setlists/vote-proposal.core';

export interface TargetSongCountFieldProps {
  readonly value: number;
  readonly isPending: boolean;
  readonly isVoting: boolean;
  readonly onChange: (value: number) => void;
  readonly onCommit: () => void;
}

const TARGET_SONG_COUNT_MIN = 1;
const TARGET_SONG_COUNT_MAX = 60;

// @FollowsBlueprint molecule-field
export function TargetSongCountField(props: TargetSongCountFieldProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="flex items-end gap-2 px-4">
      <div className="flex-1 max-w-[220px]">
        <label htmlFor="vote-target" className="text-xs tracking-wider uppercase text-ink-400">
          {t('voting.targetSongCount')}
        </label>
        <Input
          id="vote-target"
          type="number"
          inputMode="numeric"
          min={TARGET_SONG_COUNT_MIN}
          max={TARGET_SONG_COUNT_MAX}
          value={props.value}
          onChange={(event) => props.onChange(readTargetSongCount(event.target.value, props.value))}
        />
      </div>
      {props.isVoting ? (
        <Button type="button" variant="ghost" disabled={props.isPending} onClick={props.onCommit}>
          {t('voting.applyTarget')}
        </Button>
      ) : null}
    </div>
  );
}
