import type { OpeningsLoadStatus } from '@/openings/openingsLoad.utils';
import type { View } from '@/state/persistedState.utils';

export type TrainerScreenKind = 'load-failure' | 'selection' | 'session';

const SCREEN_KIND_BY_VIEW: Record<View, TrainerScreenKind> = {
  select: 'selection',
  session: 'session',
};

/** A failed dataset load outranks the stored view: there is nothing to train on. */
// @FollowsBlueprint core-view-intent
export function selectTrainerScreenKind(status: OpeningsLoadStatus, view: View): TrainerScreenKind {
  if (status === 'failed') return 'load-failure';
  return SCREEN_KIND_BY_VIEW[view];
}
