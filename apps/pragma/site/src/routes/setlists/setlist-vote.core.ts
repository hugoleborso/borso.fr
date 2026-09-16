/** @Feature setlist-voting */

export const DEFAULT_TARGET_SONG_COUNT = 15;

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
