/** @Feature setlists */

import { type Lineup, resolveLineup } from '@domain/lineup.core';
import { useMembersList } from '../../lib/queries/members.queries';
import { useTransitionComment } from '../../lib/queries/transitions.queries';
import {
  buildSceneHeadline,
  type SceneEntryInput,
  type SceneSongInput,
} from './setlist-scene.core';
import {
  buildSceneTransition,
  type SceneTransition,
  type SceneTransitionInstrumentInput,
} from './scene-transition.core';

interface TransitionEntryInput extends SceneEntryInput {
  readonly lineupOverride?: Lineup | null;
}

interface TransitionSongInput extends SceneSongInput {
  readonly id: string;
  readonly defaultLineup: Lineup;
}

export interface SceneTransitionPreviewInput {
  readonly song: TransitionSongInput | undefined;
  readonly nextEntry: TransitionEntryInput | undefined;
  readonly songsById: Readonly<Record<string, TransitionSongInput | undefined>>;
  readonly currentLineup: Lineup;
  readonly instruments: readonly SceneTransitionInstrumentInput[];
}

export interface SceneTransitionPreviewContent {
  readonly nextTitle: string;
  readonly nextTonality: string | null;
  readonly transition: SceneTransition;
  readonly note: string;
}

const NO_MEMBERS: readonly never[] = [];

// @FollowsBlueprint query-module
export function useSceneTransitionPreview(
  input: SceneTransitionPreviewInput,
): SceneTransitionPreviewContent | null {
  const membersQuery = useMembersList();
  const { song, nextEntry } = input;
  const nextSong = nextEntry === undefined ? undefined : input.songsById[nextEntry.songId];
  const commentQuery = useTransitionComment(
    song?.id ?? '',
    nextSong?.id ?? '',
    song !== undefined && nextSong !== undefined,
  );
  if (nextEntry === undefined || nextSong === undefined) return null;
  const headline = buildSceneHeadline(nextEntry, nextSong);
  return {
    nextTitle: nextSong.title,
    nextTonality: headline.tonalityLabel,
    transition: buildSceneTransition({
      currentLineup: input.currentLineup,
      nextLineup: resolveLineup(nextSong.defaultLineup, nextEntry.lineupOverride ?? null),
      members: membersQuery.data?.members ?? NO_MEMBERS,
      instruments: input.instruments,
    }),
    note: commentQuery.data?.comment.comment ?? '',
  };
}
