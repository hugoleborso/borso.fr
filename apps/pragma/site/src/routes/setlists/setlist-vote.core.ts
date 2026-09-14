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
