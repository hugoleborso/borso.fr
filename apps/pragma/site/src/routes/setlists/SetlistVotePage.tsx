import { DEFAULT_TARGET_SONG_COUNT } from '@domain/setlist-vote.core';
/** @Feature setlist-voting */

import type { JSX } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { BottomActions } from '../../components/atoms/BottomActions';
import { Button } from '../../components/atoms/Button';
import { IconButton } from '../../components/atoms/IconButton';
import { PageHeader } from '../../components/molecules/PageHeader';
import { TargetSongCountField } from '../../components/molecules/TargetSongCountField';
import { DeckProgressBar } from '../../components/molecules/DeckProgressBar';
import { VoteBudgetBar } from '../../components/molecules/VoteBudgetBar';
import { SectionTabs } from '../../components/molecules/SectionTabs';
import { VoteCatalog } from '../../components/organisms/VoteCatalog';
import { VoteClosePanel } from '../../components/organisms/VoteClosePanel';
import { VoteDeck } from '../../components/organisms/VoteDeck';
import { VoteTally } from '../../components/organisms/VoteTally';
import { useMembersList } from '../../lib/queries/members.queries';
import { useSignedInMember } from '../../lib/queries/me.queries';
import { useSetlist } from '../../lib/queries/setlists.queries';
import { useSongsList } from '../../lib/queries/songs.queries';
import {
  useCloseVote,
  useClosingProposal,
  useScoreSong,
  useSetVoteStatus,
  useVoteBoard,
} from '../../lib/queries/voting.queries';
import { readMemberPoints } from '../../lib/queries/voting.utils';
import {
  indexMembersById,
  indexSongsById,
  isVotingPageState,
  selectCloseIntent,
  selectVoteHeaderAction,
  projectPointsBySongId,
  selectVotePageState,
} from './setlist-vote.core';
import {
  DEFAULT_VOTE_MODE,
  isDeckMode,
  selectScoredSongs,
  selectShuffledDeck,
  type VoteMode,
} from './vote-deck.core';
import { selectSetlistDisplayName } from '../../lib/setlist-name.utils';
import { useNavigateTo } from '../../lib/navigation.hook';

// @FollowsBlueprint organism-query-owning
export function SetlistVotePage(): JSX.Element {
  const { t } = useTranslation();
  const { setlistId = '' } = useParams<{ setlistId: string }>();
  const navigateTo = useNavigateTo();
  const signedInMember = useSignedInMember();
  const memberId = signedInMember.data?.memberId ?? '';
  const board = useVoteBoard(setlistId);
  const setlist = useSetlist(setlistId);
  const songs = useSongsList();
  const members = useMembersList();
  const scoreSong = useScoreSong(setlistId, memberId);
  const setVoteStatus = useSetVoteStatus(setlistId);
  const closeVote = useCloseVote(setlistId);
  const [isClosingOpen, setIsClosingOpen] = useState<boolean>(false);
  const [wasRefused, setWasRefused] = useState<boolean>(false);
  const [typedTarget, setTypedTarget] = useState<number | null>(null);
  const [cardIndex, setCardIndex] = useState<number>(0);
  const [voteMode, setVoteMode] = useState<VoteMode>(DEFAULT_VOTE_MODE);
  const [deckSeed] = useState<string>(() => crypto.randomUUID());
  const proposal = useClosingProposal(setlistId, isClosingOpen);

  const isVoting = isVotingPageState(
    board.data?.status ?? 'locked',
    isClosingOpen,
    board.data !== undefined,
  );
  const pageState = selectVotePageState({
    hasBoard: board.data !== undefined,
    status: board.data?.status ?? 'locked',
    isClosingOpen,
  });

  const targetSongCount = typedTarget ?? board.data?.targetSongCount ?? DEFAULT_TARGET_SONG_COUNT;
  const isDeck = isDeckMode(voteMode);
  const isShowingClosing = pageState === 'closing' && proposal.data !== undefined;
  const proposedSongIds = (proposal.data ?? []).map((tally) => tally.songId).join(',');
  const songList = songs.data?.songs ?? [];
  const deckSongs = selectShuffledDeck(songList, deckSeed);
  const boardData = board.data;
  const songsById = indexSongsById(songList);
  const membersById = indexMembersById(members.data?.members ?? []);
  const pointsBySongId = projectPointsBySongId(songList, (songId) =>
    boardData === undefined ? 0 : readMemberPoints(boardData, memberId, songId),
  );
  const scoredSongs = selectScoredSongs(songList, pointsBySongId);
  const closeOrReview = {
    'review-proposal': () => setIsClosingOpen(true),
    'lock-unchanged': () =>
      setVoteStatus.mutate(
        { status: 'locked', targetSongCount },
        { onSuccess: () => navigateTo(`/setlists/${setlistId}`) },
      ),
  } as const;

  const closeVoteButton = (
    <Button
      icon="check"
      type="button"
      variant="primary"
      disabled={setVoteStatus.isPending}
      onClick={() => closeOrReview[selectCloseIntent(board.data?.tallies.length ?? 0)]()}
    >
      {t('voting.openClosing')}
    </Button>
  );
  const openVoteButton = (
    <Button
      icon="vote"
      type="button"
      variant="primary"
      disabled={setVoteStatus.isPending}
      onClick={() => setVoteStatus.mutate({ status: 'voting', targetSongCount })}
    >
      {t('voting.openVote')}
    </Button>
  );
  const stripActionByKind = {
    'back-to-vote': null,
    'close-vote': closeVoteButton,
    'open-vote': openVoteButton,
  } as const;
  const headerExtraByKind = {
    'back-to-vote': (
      <IconButton
        icon="close"
        label={t('voting.backToVote')}
        onClick={() => setIsClosingOpen(false)}
      />
    ),
    'close-vote': null,
    'open-vote': null,
  } as const;
  const headerAction = selectVoteHeaderAction(pageState);
  const stripAction = stripActionByKind[headerAction];
  const displayedName = selectSetlistDisplayName(
    setlist.data?.setlist.name ?? '',
    t('voting.untitled'),
  );

  return (
    <section className="flex flex-col gap-4 pb-8">
      <PageHeader
        className="mx-0 mb-0 sm:mx-0 sm:mb-0"
        back={{ to: `/setlists/${setlistId}`, label: displayedName }}
        title={t('voting.pageTitle')}
        actions={headerExtraByKind[headerAction]}
      />
      <div className="flex flex-col gap-1 px-4">
        <p className="m-0 text-meta text-ink-soft">{t('voting.howItRunsScore')}</p>
        <p className="m-0 text-meta text-ink-soft">{t('voting.howItRunsClose')}</p>
      </div>

      <TargetSongCountField
        value={targetSongCount}
        isPending={setVoteStatus.isPending}
        onChange={setTypedTarget}
        onCommit={() => setVoteStatus.mutate({ status: 'voting', targetSongCount })}
        isVoting={isVoting}
      />

      {isShowingClosing ? (
        <VoteClosePanel
          key={proposedSongIds}
          proposal={proposal.data}
          songsById={songsById}
          addableSongs={songList}
          targetSongCount={board.data?.targetSongCount ?? 0}
          isClosing={closeVote.isPending}
          onCancel={() => setIsClosingOpen(false)}
          onClose={(songIds) => {
            closeVote.mutate(
              { songIds },
              {
                onSuccess: () => {
                  navigateTo(`/setlists/${setlistId}`);
                },
              },
            );
          }}
        />
      ) : null}

      {isVoting ? (
        <>
          <VoteBudgetBar
            total={board.data?.budget.total ?? 0}
            remaining={board.data?.budget.remaining ?? 0}
            isExhausted={wasRefused}
          />
          <SectionTabs
            label={t('voting.modeLabel')}
            tabs={[
              { value: 'list', label: t('voting.modeList'), icon: 'catalog' },
              { value: 'deck', label: t('voting.modeDeck'), icon: 'vote' },
            ]}
            value={voteMode}
            onChange={setVoteMode}
            className="mx-4"
          />
          {isDeck ? (
            <>
              <DeckProgressBar deckLength={deckSongs.length} cardIndex={cardIndex} />
              <div className="px-4">
                <VoteDeck
                  songs={deckSongs}
                  lastScoredAt={board.data?.lastScoredAt ?? null}
                  remainingPoints={board.data?.budget.remaining ?? 0}
                  pointsBySongId={pointsBySongId}
                  cardIndex={cardIndex}
                  onAdvance={setCardIndex}
                  onExhausted={() => setWasRefused(true)}
                  onScore={(songId, points) => {
                    setWasRefused(false);
                    scoreSong.mutate({ songId, points });
                  }}
                />
              </div>
              <VoteCatalog
                songs={scoredSongs}
                lastScoredAt={board.data?.lastScoredAt ?? null}
                remainingPoints={board.data?.budget.remaining ?? 0}
                pointsBySongId={pointsBySongId}
                onExhausted={() => setWasRefused(true)}
                onScore={(songId, points) => {
                  setWasRefused(false);
                  scoreSong.mutate({ songId, points });
                }}
              />
            </>
          ) : (
            <VoteCatalog
              songs={songList}
              lastScoredAt={board.data?.lastScoredAt ?? null}
              remainingPoints={board.data?.budget.remaining ?? 0}
              pointsBySongId={pointsBySongId}
              onExhausted={() => setWasRefused(true)}
              onScore={(songId, points) => {
                setWasRefused(false);
                scoreSong.mutate({ songId, points });
              }}
            />
          )}
        </>
      ) : null}

      <VoteTally
        tallies={board.data?.tallies ?? []}
        songsById={songsById}
        membersById={membersById}
      />
      {stripAction === null ? null : <BottomActions>{stripAction}</BottomActions>}
    </section>
  );
}
