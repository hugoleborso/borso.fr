/** @Feature audience-voting */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useConcertVoteState,
  useOpenRound,
  useRoundHistory,
} from '../../lib/queries/audience.queries';
import type { PoolEntryView } from '../../lib/queries/audience.utils';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { StandingSongRow } from '../molecules/StandingSongRow';
import { VoteCountdown } from '../molecules/VoteCountdown';
import {
  buildShortVoteAddress,
  buildVoteAddress,
  hasAnyRoundOpened,
  type RoundHistoryLine,
  type RoundOutcome,
  selectParticipation,
  selectRoundHistoryLines,
} from './voting-round-panel.core';

export interface VotingRoundPanelProps {
  readonly sessionId: string;
  readonly openRoundVariant?: 'primary' | 'secondary';
}

// @FollowsBlueprint organism-query-owning
export function VotingRoundPanel({
  sessionId,
  openRoundVariant = 'primary',
}: VotingRoundPanelProps): JSX.Element {
  const { t, i18n } = useTranslation();
  const voteState = useConcertVoteState(sessionId, null);
  const history = useRoundHistory(sessionId);
  const openRound = useOpenRound();

  const round = voteState.data?.state.round ?? null;
  const isRoundOpen = round?.isOpen === true;
  const voteAddress = buildVoteAddress(globalThis.location.origin, sessionId);
  const shortVoteAddress = buildShortVoteAddress(globalThis.location.origin);
  const participation = selectParticipation(
    voteState.data?.state.ballotCount ?? 0,
    voteState.data?.state.capacity ?? null,
  );
  const historyLines = selectRoundHistoryLines(history.data?.rounds ?? [], i18n.language);
  const standing = voteState.data?.state.pool ?? [];
  const isResultShown = hasAnyRoundOpened(round, history.data?.rounds.length ?? 0);

  const OUTCOME_LABEL: Record<RoundOutcome['kind'], (outcome: RoundOutcome) => string> = {
    running: () => t('audience.roundRunning'),
    blank: () => t('audience.blankRound'),
    'won-unnamed': () => t('audience.winnerUnnamed'),
    won: (outcome) => (outcome.kind === 'won' ? outcome.title : ''),
  };

  return (
    <section className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 items-start">
        <Card className="flex flex-col gap-3">
          {isRoundOpen ? (
            <VoteCountdown
              openedAtEpochMs={new Date(round.openedAt).getTime()}
              closesAtEpochMs={new Date(round.closesAt).getTime()}
            />
          ) : (
            <p className="text-meta text-ink-soft m-0">{t('audience.panelIdle')}</p>
          )}
          <Button
            variant={openRoundVariant}
            onClick={() => openRound.mutate({ sessionId })}
            disabled={isRoundOpen || openRound.isPending}
            icon="play"
          >
            {t('audience.openRound')}
          </Button>
          {openRound.error === null ? null : (
            <p className="text-meta text-danger m-0" role="alert">
              {t('audience.openRoundFailed')}
            </p>
          )}
          {isResultShown ? (
            <p className="text-meta text-ink-soft m-0">
              {participation.sharePercent === null
                ? t('audience.ballotsCast', { ballots: participation.ballotCount })
                : t('audience.ballotsAgainstCapacity', {
                    ballots: participation.ballotCount,
                    capacity: participation.capacity,
                    share: participation.sharePercent,
                  })}
            </p>
          ) : null}
          <p className="text-meta text-ink-soft m-0">
            {t('audience.sayThisAddress')}{' '}
            <span className="font-mono text-ink">{shortVoteAddress}</span>
          </p>
          <p className="font-mono text-meta text-ink-soft m-0 break-all">{voteAddress}</p>
        </Card>
      </div>
      {isResultShown ? (
        <VoteResults standing={standing} historyLines={historyLines} outcomeLabel={OUTCOME_LABEL} />
      ) : null}
    </section>
  );
}

interface VoteResultsProps {
  readonly standing: readonly PoolEntryView[];
  readonly historyLines: readonly RoundHistoryLine[];
  readonly outcomeLabel: Readonly<Record<RoundOutcome['kind'], (outcome: RoundOutcome) => string>>;
}

function VoteResults({ standing, historyLines, outcomeLabel }: VoteResultsProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <>
      <div className="flex flex-col gap-2">
        <h4 className="font-display text-title text-ink m-0">{t('audience.standingTitle')}</h4>
        {standing.length === 0 ? (
          <p className="text-meta text-ink-soft m-0">{t('audience.standingEmpty')}</p>
        ) : (
          <ul className="list-none p-0 m-0 flex flex-col gap-1.5">
            {standing.map((entry) => (
              <li key={entry.songId}>
                <StandingSongRow
                  title={entry.title}
                  artist={entry.artist}
                  status={entry.status}
                  voteCount={entry.voteCount}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
      <ul className="list-none p-0 m-0 flex flex-col gap-1.5">
        {historyLines.map((line) => (
          <li
            key={line.roundId}
            className="flex items-baseline justify-between gap-3 border-b border-rule pb-1.5"
          >
            <span className="font-mono text-meta text-ink-soft">{line.openedAtLabel}</span>
            <span className="text-meta text-ink text-right">
              {outcomeLabel[line.outcome.kind](line.outcome)}
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}
