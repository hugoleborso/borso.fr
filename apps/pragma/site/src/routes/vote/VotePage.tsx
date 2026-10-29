/** @Feature audience-voting */

import { type JSX, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useParams } from 'react-router-dom';
import { Button } from '../../components/atoms/Button';
import { Card } from '../../components/atoms/Card';
import { composeClassName } from '../../components/atoms/class-name.utils';
import { PINNED_HEADER_CLASS } from '../../components/molecules/PageHeader';
import { Sheet } from '../../components/molecules/Sheet';
import { AudienceVoteList } from '../../components/organisms/AudienceVoteList';
import { SuggestSongField } from '../../components/organisms/SuggestSongField';
import { useBallot, useConcertVoteState, useLiveConcert } from '../../lib/queries/audience.queries';
import { resolveShortAddress } from './live-concert.core';

function VoteShell({ children }: { readonly children: JSX.Element }): JSX.Element {
  return (
    <main className="min-h-dvh bg-paper px-4 py-8 sm:px-8 sm:py-12">
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
        <p className="text-ink-soft italic text-meta m-0">{t('common.loading')}</p>
      </VoteShell>
    );
  }
  return (
    <VoteShell>
      <Card className="flex flex-col gap-3">
        <p className="text-ink m-0">{t('audience.noConcertLive')}</p>
        <Button icon="refresh" variant="secondary" onClick={() => void live.refetch()}>
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
  const [isSuggesting, setIsSuggesting] = useState(false);

  return (
    <VoteShell>
      <div className="flex flex-col gap-6">
        <header
          data-page-header
          className={composeClassName(PINNED_HEADER_CLASS, 'mb-0 flex flex-col gap-1 sm:mb-0')}
        >
          <span className="text-label font-medium uppercase tracking-[0.16em] text-ink-soft">
            {t('audience.pageCrumb')}
          </span>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="font-display text-display sm:text-display text-ink m-0">
              {t('audience.pageTitle')}
            </h1>
            <Button icon="plus" variant="secondary" onClick={() => setIsSuggesting(true)}>
              {t('audience.suggestTitle')}
            </Button>
          </div>
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
            <p className="text-ink m-0">{t('audience.noRoundOpen')}</p>
            <Button icon="refresh" variant="secondary" onClick={() => void voteState.refetch()}>
              {t('audience.refresh')}
            </Button>
          </Card>
        )}

        {isSuggesting ? (
          <Sheet
            title={t('audience.suggestTitle')}
            label={t('audience.suggestTitle')}
            onClose={() => setIsSuggesting(false)}
          >
            <SuggestSongField sessionId={sessionId} ballotToken={ballotToken} />
          </Sheet>
        ) : null}
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
