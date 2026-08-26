/** @Feature audience-voting */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useConcertVoteState,
  useOpenRound,
  useRoundHistory,
} from '../../lib/queries/audience.queries';
import { useSongsList } from '../../lib/queries/songs.queries';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { Icon } from '../atoms/Icon';
import { VoteQrCode } from '../atoms/VoteQrCode';
import { VoteCountdown } from '../molecules/VoteCountdown';
import {
  buildVoteAddress,
  selectParticipation,
  selectRoundHistoryLines,
} from './voting-round-panel.core';

export interface VotingRoundPanelProps {
  readonly sessionId: string;
}

// @FollowsBlueprint organism-query-owning
export function VotingRoundPanel({ sessionId }: VotingRoundPanelProps): JSX.Element {
  const { t, i18n } = useTranslation();
  const voteState = useConcertVoteState(sessionId, null);
  const history = useRoundHistory(sessionId);
  const openRound = useOpenRound();
  const songs = useSongsList();

  const round = voteState.data?.state.round ?? null;
  const isRoundOpen = round?.isOpen === true;
  const voteAddress = buildVoteAddress(globalThis.location.origin, sessionId);
  const participation = selectParticipation(
    voteState.data?.state.ballotCount ?? 0,
    voteState.data?.state.capacity ?? null,
  );
  const historyLines = selectRoundHistoryLines(
    history.data?.rounds ?? [],
    songs.data?.songs ?? [],
    i18n.language,
  );

  return (
    <section className="flex flex-col gap-4">
      <h3 className="font-display italic text-2xl text-ink-900 m-0">{t('audience.panelTitle')}</h3>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4 items-start">
        <Card className="flex flex-col gap-3">
          {isRoundOpen ? (
            <VoteCountdown
              openedAtEpochMs={new Date(round.openedAt).getTime()}
              closesAtEpochMs={new Date(round.closesAt).getTime()}
            />
          ) : (
            <p className="text-[13px] text-ink-500 m-0">{t('audience.panelIdle')}</p>
          )}
          <Button
            variant="primary"
            onClick={() => openRound.mutate({ sessionId })}
            disabled={isRoundOpen || openRound.isPending}
          >
            <Icon name="play" size={14} />
            {t('audience.openRound')}
          </Button>
          {openRound.error === null ? null : (
            <p className="text-xs text-danger m-0" role="alert">
              {t('audience.openRoundFailed')}
            </p>
          )}
          <p className="text-[13px] text-ink-500 m-0">
            {participation.sharePercent === null
              ? t('audience.ballotsCast', { ballots: participation.ballotCount })
              : t('audience.ballotsAgainstCapacity', {
                  ballots: participation.ballotCount,
                  capacity: participation.capacity,
                  share: participation.sharePercent,
                })}
          </p>
          <p className="font-mono text-xs text-ink-500 m-0 break-all">{voteAddress}</p>
        </Card>
        <Card variant="sunk" className="flex flex-col items-center gap-2">
          <VoteQrCode value={voteAddress} title={t('audience.qrTitle')} />
          <span className="text-xs uppercase tracking-[0.16em] text-ink-400">
            {t('audience.qrTitle')}
          </span>
        </Card>
      </div>
      <ul className="list-none p-0 m-0 flex flex-col gap-1.5">
        {historyLines.map((line) => (
          <li
            key={line.roundId}
            className="flex items-baseline justify-between gap-3 border-b border-line pb-1.5"
          >
            <span className="font-mono text-xs text-ink-400">{line.openedAtLabel}</span>
            <span className="text-[13px] text-ink-900 text-right">
              {line.winnerTitle ?? t('audience.blankRound')}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
