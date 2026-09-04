/** @Feature audience-voting */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../atoms/Card';
import { PoolSongRow } from '../molecules/PoolSongRow';
import { VoteCountdown } from '../molecules/VoteCountdown';
import { useCastVote, useRetractVote } from '../../lib/queries/audience.queries';

export interface AudienceVoteListRound {
  readonly id: string;
  readonly openedAt: string;
  readonly closesAt: string;
  readonly isOpen: boolean;
}

export interface AudienceVotePoolEntry {
  readonly songId: string;
  readonly title: string;
  readonly artist: string;
  readonly status: string;
  readonly voteCount: number;
}

export interface AudienceVoteListProps {
  readonly sessionId: string;
  readonly ballotToken: string | null;
  readonly round: AudienceVoteListRound;
  readonly pool: readonly AudienceVotePoolEntry[];
  readonly ownVotes: readonly string[];
}

// @FollowsBlueprint organism-mutation-panel
export function AudienceVoteList({
  sessionId,
  ballotToken,
  round,
  pool,
  ownVotes,
}: AudienceVoteListProps): JSX.Element {
  const { t } = useTranslation();
  const castVote = useCastVote();
  const retractVote = useRetractVote();

  const toggleVote = (songId: string, isChosen: boolean): void => {
    if (ballotToken === null) return;
    const variables = { sessionId, roundId: round.id, songId, ballotToken };
    if (isChosen) {
      retractVote.mutate(variables);
      return;
    }
    castVote.mutate(variables);
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <VoteCountdown
          openedAtEpochMs={new Date(round.openedAt).getTime()}
          closesAtEpochMs={new Date(round.closesAt).getTime()}
        />
      </Card>
      <p className="text-[13px] text-ink-500 m-0">{t('audience.tapToVote')}</p>
      <ul className="list-none p-0 m-0 flex flex-col gap-2">
        {pool.map((entry) => {
          const isChosen = ownVotes.includes(entry.songId);
          return (
            <li key={entry.songId}>
              <PoolSongRow
                title={entry.title}
                artist={entry.artist}
                status={entry.status}
                voteCount={entry.voteCount}
                isChosenByThisBallot={isChosen}
                isDisabled={ballotToken === null || !round.isOpen}
                onToggle={() => toggleVote(entry.songId, isChosen)}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
