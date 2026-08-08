import { Suspense } from 'react';
import { OpeningsLoadingPanel } from '@/components/molecules/OpeningsLoadingPanel';
import { TopBar } from '@/components/organisms/TopBar';
import { TrainerScreens } from './TrainerScreens';

export function OpeningTrainerRoute() {
  return (
    <div className="app-shell">
      <TopBar />
      <Suspense fallback={<OpeningsLoadingPanel />}>
        <TrainerScreens />
      </Suspense>
    </div>
  );
}
