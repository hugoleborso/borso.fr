/** @Feature setlists */

import { MEMBER_FILTER_PARAM } from '../../lib/next-concert.core';

export const SETLIST_VIEWS = ['songs', 'lineup', 'my-part'] as const;

export type SetlistView = (typeof SETLIST_VIEWS)[number];

export const SETLIST_VIEW_PARAM = 'view';

export interface SetlistViewInput {
  readonly requestedView: string | null;
  readonly requestedMemberId: string | null;
  readonly signedInMemberId: string | null;
}

export interface SetlistViewChoice {
  readonly view: SetlistView;
  readonly memberId: string | null;
}

function isSetlistView(candidate: string | null): candidate is SetlistView {
  return SETLIST_VIEWS.some((view) => view === candidate);
}

// @FollowsBlueprint core-view-intent
export function selectSetlistView(input: SetlistViewInput): SetlistViewChoice {
  const fallbackView = input.requestedMemberId === null ? 'songs' : 'my-part';
  const view = isSetlistView(input.requestedView) ? input.requestedView : fallbackView;
  if (view !== 'my-part') return { view, memberId: null };
  return { view, memberId: input.requestedMemberId ?? input.signedInMemberId };
}

export function buildSetlistViewParams(
  view: SetlistView,
  memberId: string | null,
): Readonly<Record<string, string>> {
  if (view === 'songs') return {};
  if (view === 'lineup' || memberId === null) return { [SETLIST_VIEW_PARAM]: view };
  return { [SETLIST_VIEW_PARAM]: view, [MEMBER_FILTER_PARAM]: memberId };
}

const VIEW_EVENT_VALUE: Readonly<Record<SetlistView, string>> = {
  songs: 'songs',
  lineup: 'lineup',
  'my-part': 'my_part',
};

export function describeSetlistViewForEvent(view: SetlistView): string {
  return VIEW_EVENT_VALUE[view];
}
