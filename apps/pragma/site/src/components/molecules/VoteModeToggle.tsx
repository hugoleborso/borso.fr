/** @Feature setlist-voting */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { type VoteMode, selectOtherVoteMode } from '../../routes/setlists/vote-deck.core';
import { Button } from '../atoms/Button';

export interface VoteModeToggleProps {
  readonly mode: VoteMode;
  readonly onChange: (mode: VoteMode) => void;
}

const LABEL_BY_MODE = {
  list: 'voting.switchToDeck',
  deck: 'voting.switchToList',
} as const satisfies Readonly<Record<VoteMode, string>>;

// @FollowsBlueprint molecule-presentational
export function VoteModeToggle({ mode, onChange }: VoteModeToggleProps): JSX.Element {
  const { t } = useTranslation();

  return (
    <div className="px-4">
      <Button type="button" variant="ghost" onClick={() => onChange(selectOtherVoteMode(mode))}>
        {t(LABEL_BY_MODE[mode])}
      </Button>
    </div>
  );
}
