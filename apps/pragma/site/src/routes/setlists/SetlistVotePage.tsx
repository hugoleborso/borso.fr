/** @Feature setlist-voting */

import type { JSX } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { Button } from '../../components/atoms/Button';
import { TargetSongCountField } from '../../components/molecules/TargetSongCountField';
import { DeckProgressBar } from '../../components/molecules/DeckProgressBar';
import { VoteBudgetBar } from '../../components/molecules/VoteBudgetBar';
import { VoteModeToggle } from '../../components/molecules/VoteModeToggle';
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
  DEFAULT_TARGET_SONG_COUNT,
  indexMembersById,
  indexSongsById,
  isVotingPageState,
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

// @FollowsBlueprint organism-query-owning
export function SetlistVotePage(): JSX.Element {
  const { t } = useTranslation();
  const { setlistId = '' } = useParams<{ setlistId: string }>();
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

  return (
    <section className="flex flex-col gap-4 pb-8">
      <header className="px-4 pt-4 flex items-baseline justify-between gap-3">
        <h1 className="font-display italic text-[28px] leading-none text-ink-900 m-0">
          {selectSetlistDisplayName(setlist.data?.setlist.name ?? '', t('voting.untitled'))}
        </h1>
        {isVoting ? (
          <Button type="button" variant="ghost" onClick={() => setIsClosingOpen(true)}>
            {t('voting.openClosing')}
          </Button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            disabled={setVoteStatus.isPending}
            onClick={() => setVoteStatus.mutate({ status: 'voting', targetSongCount })}
          >
            {t('voting.openVote')}
          </Button>
        )}
      </header>

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
          onClose={(songIds) => {
            closeVote.mutate(
              { songIds },
              {
                onSuccess: () => {
                  setIsClosingOpen(false);
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
          <VoteModeToggle mode={voteMode} onChange={setVoteMode} />
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
    </section>
  );
}
