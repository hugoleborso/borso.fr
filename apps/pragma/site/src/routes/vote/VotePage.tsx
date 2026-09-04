/** @Feature audience-voting */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useParams } from 'react-router-dom';
import { Button } from '../../components/atoms/Button';
import { Card } from '../../components/atoms/Card';
import { AudienceVoteList } from '../../components/organisms/AudienceVoteList';
import { SuggestSongField } from '../../components/organisms/SuggestSongField';
import { useBallot, useConcertVoteState, useLiveConcert } from '../../lib/queries/audience.queries';
import { resolveShortAddress } from './live-concert.core';

function VoteShell({ children }: { readonly children: JSX.Element }): JSX.Element {
  return (
    <main className="min-h-dvh bg-bg px-4 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto w-full max-w-2xl flex flex-col gap-6">{children}</div>
    </main>
  );
}

function LiveConcertGate(): JSX.Element {
  const { t } = useTranslation();
  const live = useLiveConcert(true);
  const resolution = resolveShortAddress({
    isResolving: live.isPending,
    liveSessionId: live.data?.sessionId,
  });
  if (resolution.kind === 'redirect') return <Navigate to={resolution.path} replace />;
  if (resolution.kind === 'resolving') {
    return (
      <VoteShell>
        <p className="text-ink-400 italic text-sm m-0">{t('common.loading')}</p>
      </VoteShell>
    );
  }
  return (
    <VoteShell>
      <Card className="flex flex-col gap-3">
        <p className="text-ink-700 m-0">{t('audience.noConcertLive')}</p>
        <Button variant="default" onClick={() => void live.refetch()}>
          {t('audience.refresh')}
        </Button>
      </Card>
    </VoteShell>
  );
}

function ConcertVoteScreen({ sessionId }: { readonly sessionId: string }): JSX.Element {
  const { t } = useTranslation();
  const ballot = useBallot(sessionId);
  const ballotToken = ballot.data?.ballotToken ?? null;
  const voteState = useConcertVoteState(sessionId, ballotToken, ballot.isSuccess);
  const round = voteState.data?.state.round ?? null;
  const isRoundOpen = round?.isOpen === true;

  return (
    <VoteShell>
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-[0.16em] text-ink-400">
            {t('audience.pageCrumb')}
          </span>
          <h1 className="font-display italic text-3xl sm:text-4xl text-ink-900 m-0">
            {t('audience.pageTitle')}
          </h1>
        </header>

        {isRoundOpen ? (
          <AudienceVoteList
            sessionId={sessionId}
            ballotToken={ballotToken}
            round={round}
            pool={voteState.data?.state.pool ?? []}
            ownVotes={voteState.data?.state.ownVotes ?? []}
          />
        ) : (
          <Card className="flex flex-col gap-3">
            <p className="text-ink-700 m-0">{t('audience.noRoundOpen')}</p>
            <Button variant="default" onClick={() => void voteState.refetch()}>
              {t('audience.refresh')}
            </Button>
          </Card>
        )}

        <SuggestSongField sessionId={sessionId} ballotToken={ballotToken} />
      </div>
    </VoteShell>
  );
}

// @FollowsBlueprint route-detail-page
export function VotePage(): JSX.Element {
  const { sessionId } = useParams<{ sessionId: string }>();
  if (sessionId === undefined) return <LiveConcertGate />;
  return <ConcertVoteScreen sessionId={sessionId} />;
}
