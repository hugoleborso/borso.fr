import { Suspense } from 'react';
import { OpeningsLoadingPanel } from '@/components/molecules/OpeningsLoadingPanel';
import { TopBar } from '@/components/organisms/TopBar';
import { TrainerScreens } from '@/components/organisms/TrainerScreens';

// @FollowsBlueprint organism-shell
export function OpeningTrainerPage() {
  return (
    <div className="flex flex-col min-h-screen gap-4 p-2 roomy:p-6">
      <TopBar />
      <main className="flex flex-col gap-4">
        <Suspense fallback={<OpeningsLoadingPanel />}>
          <TrainerScreens />
        </Suspense>
      </main>
    </div>
  );
}
