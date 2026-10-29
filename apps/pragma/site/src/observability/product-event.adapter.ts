/**
 * @DependsOnExternal sentry
 */

import * as Sentry from '@sentry/react';

export type ProductEventName =
  | 'setlist_view_changed'
  | 'entry_note_saved'
  | 'entry_note_save_superseded'
  | 'transition_comment_saved'
  | 'setlist_songs_added'
  | 'setlist_order_opened'
  | 'practice_mode_started'
  | 'practice_mode_ended'
  | 'chord_chart_added';

export type ProductEventAttributes = Readonly<Record<string, string | number | boolean>>;

const ONE_OCCURRENCE = 1;

// @FollowsBlueprint adapter-external-service
export function recordProductEvent(
  name: ProductEventName,
  attributes: ProductEventAttributes = {},
): void {
  Sentry.metrics.count(name, ONE_OCCURRENCE, { attributes });
}
