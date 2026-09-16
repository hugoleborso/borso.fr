/** @Feature setlist-voting */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { type VoteMode, VOTE_MODES } from '../../routes/setlists/vote-deck.core';
import { SegmentButton } from '../atoms/SegmentButton';

export interface VoteModeToggleProps {
  readonly mode: VoteMode;
  readonly onChange: (mode: VoteMode) => void;
}

const LABEL_BY_MODE = {
  list: 'voting.modeList',
  deck: 'voting.modeDeck',
} as const satisfies Readonly<Record<VoteMode, string>>;

// @FollowsBlueprint molecule-presentational
export function VoteModeToggle({ mode, onChange }: VoteModeToggleProps): JSX.Element {
  const { t } = useTranslation();

  return (
    <div
      role="group"
      aria-label={t('voting.modeLabel')}
      className="mx-4 inline-flex rounded-full border border-line bg-surface p-1 self-start"
    >
      {VOTE_MODES.map((candidate) => (
        <SegmentButton
          key={candidate}
          isSelected={candidate === mode}
          onSelect={() => onChange(candidate)}
        >
          {t(LABEL_BY_MODE[candidate])}
        </SegmentButton>
      ))}
    </div>
  );
}
