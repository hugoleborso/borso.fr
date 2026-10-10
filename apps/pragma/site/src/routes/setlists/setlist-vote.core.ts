/** @Feature setlist-voting */

export type VotePageState = 'loading' | 'voting' | 'closing' | 'locked';

export interface VotePageInputs {
  readonly hasBoard: boolean;
  readonly status: 'voting' | 'locked';
  readonly isClosingOpen: boolean;
}

// @FollowsBlueprint core-decision
export function selectVotePageState(inputs: VotePageInputs): VotePageState {
  if (!inputs.hasBoard) return 'loading';
  if (inputs.isClosingOpen && inputs.status === 'voting') return 'closing';
  return inputs.status === 'voting' ? 'voting' : 'locked';
}

export function isVotingPageState(
  status: 'voting' | 'locked',
  isClosingOpen: boolean,
  hasBoard: boolean,
): boolean {
  return selectVotePageState({ hasBoard, status, isClosingOpen }) === 'voting';
}

export type VoteHeaderAction = 'back-to-vote' | 'close-vote' | 'open-vote';

const HEADER_ACTION_BY_STATE = {
  loading: 'open-vote',
  voting: 'close-vote',
  closing: 'back-to-vote',
  locked: 'open-vote',
} as const satisfies Readonly<Record<VotePageState, VoteHeaderAction>>;

export function selectVoteHeaderAction(state: VotePageState): VoteHeaderAction {
  return HEADER_ACTION_BY_STATE[state];
}

export type CloseIntent = 'review-proposal' | 'lock-unchanged';

export function selectCloseIntent(scoredSongCount: number): CloseIntent {
  return scoredSongCount > 0 ? 'review-proposal' : 'lock-unchanged';
}

export interface VotePageSong {
  readonly id: string;
  readonly title: string;
  readonly artist: string;
}

export interface VotePageMember {
  readonly id: string;
  readonly firstName: string;
  readonly color: string;
}

export function indexSongsById(songs: readonly VotePageSong[]): ReadonlyMap<string, VotePageSong> {
  return new Map(songs.map((song) => [song.id, song]));
}

export function indexMembersById(
  members: readonly VotePageMember[],
): ReadonlyMap<string, VotePageMember> {
  return new Map(members.map((member) => [member.id, member]));
}

export function projectPointsBySongId(
  songs: readonly { readonly id: string }[],
  readPoints: (songId: string) => number,
): Record<string, number> {
  return Object.fromEntries(songs.map((song) => [song.id, readPoints(song.id)]));
}
