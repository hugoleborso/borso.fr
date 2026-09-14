/** @Feature setlist-voting */

import type { JSX } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { Button } from '../../components/atoms/Button';
import { VoteBudgetBar } from '../../components/molecules/VoteBudgetBar';
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
import { isVotingPageState, selectVotePageState } from './setlist-vote.core';
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

  const isShowingClosing = pageState === 'closing';
  const songList = songs.data?.songs ?? [];
  const songsById = new Map(
    songList.map((song) => [song.id, { id: song.id, title: song.title, artist: song.artist }]),
  );
  const membersById = new Map(
    (members.data?.members ?? []).map((member) => [
      member.id,
      { id: member.id, firstName: member.firstName, color: member.color },
    ]),
  );
  const pointsBySongId = Object.fromEntries(
    songList.map((song) => [
      song.id,
      board.data === undefined ? 0 : readMemberPoints(board.data, memberId, song.id),
    ]),
  );

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
            onClick={() => setVoteStatus.mutate({ status: 'voting', targetSongCount: null })}
          >
            {t('voting.reopen')}
          </Button>
        )}
      </header>

      {isShowingClosing ? (
        <VoteClosePanel
          proposal={proposal.data ?? []}
          songsById={songsById}
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
          <div className="px-4">
            <VoteDeck
              songs={songList}
              remainingPoints={board.data?.budget.remaining ?? 0}
              pointsBySongId={pointsBySongId}
              onExhausted={() => setWasRefused(true)}
              onScore={(songId, points) => {
                setWasRefused(false);
                scoreSong.mutate({ songId, points });
              }}
            />
          </div>
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
