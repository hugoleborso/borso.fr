import { Suspense, use, useMemo } from 'react';
import { OpeningsLoadFailurePanel } from '@/components/molecules/OpeningsLoadFailurePanel';
import { OpeningsLoadingPanel } from '@/components/molecules/OpeningsLoadingPanel';
import { flattenExplorerLines } from '@/explorer/explorer.core';
import type { ComponentByKind } from '@/lib/componentTable.types';
import { readOpeningsRequest } from '@/openings/openingsResource';
import type { OpeningsLoadStatus } from '@/openings/openingsLoad.utils';
import type { Opening } from '@/openings/types';
import { OpenExplorer } from './OpenExplorer';

function LoadedExplorer({ openings }: { openings: Opening[] }) {
  const lines = useMemo(() => flattenExplorerLines(openings), [openings]);
  return <OpenExplorer lines={lines} />;
}

const EXPLORER_BY_STATUS: ComponentByKind<OpeningsLoadStatus, { openings: Opening[] }> = {
  loaded: LoadedExplorer,
  failed: OpeningsLoadFailurePanel,
};

function ExplorerForLoad() {
  const load = use(readOpeningsRequest());
  const Explorer = EXPLORER_BY_STATUS[load.status];
  return <Explorer openings={load.openings} />;
}

// @FollowsBlueprint component-lookup-table
export function ExploreScreen() {
  return (
    <Suspense fallback={<OpeningsLoadingPanel />}>
      <ExplorerForLoad />
    </Suspense>
  );
}
