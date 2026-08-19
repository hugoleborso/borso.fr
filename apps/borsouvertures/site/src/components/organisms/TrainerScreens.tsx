import { use } from 'react';
import { OpeningsLoadFailurePanel } from '@/components/molecules/OpeningsLoadFailurePanel';
import { SelectionScreen } from '@/components/organisms/SelectionScreen';
import { SessionScreen } from '@/components/organisms/SessionScreen';
import type { ComponentByKind } from '@/lib/componentTable.types';
import { readOpeningsRequest } from '@/openings/openingsResource';
import type { Opening } from '@/openings/types';
import { useAppState } from '@/state/appState';
import { selectTrainerScreenKind, type TrainerScreenKind } from './trainerScreen.core';

const SCREEN_BY_KIND: ComponentByKind<TrainerScreenKind, { openings: Opening[] }> = {
  'load-failure': OpeningsLoadFailurePanel,
  selection: SelectionScreen,
  session: SessionScreen,
};

/**
 * Reads the openings dataset with `use`, so the enclosing Suspense boundary
 * owns the loading state and no effect writes a fetch result into state.
 */
// @FollowsBlueprint component-lookup-table
export function TrainerScreens() {
  const load = use(readOpeningsRequest());
  const { view } = useAppState();
  const Screen = SCREEN_BY_KIND[selectTrainerScreenKind(load.status, view)];
  return <Screen openings={load.openings} />;
}
