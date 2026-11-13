import { Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { ModeToggle } from '@/components/molecules/ModeToggle';
import { OpeningsLoadingPanel } from '@/components/molecules/OpeningsLoadingPanel';
import { useAppState } from '@/state/appState';
import { TrainerScreens } from './TrainerScreens';

// @FollowsBlueprint organism-presentational
export function ExploreScreen() {
  const { t } = useTranslation();
  const { mode } = useAppState();
  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex items-center justify-between gap-3 pt-3 border-t-[3px] border-ink">
        <h2 className="text-xl font-bold leading-tight tracking-[-0.01em]">{t('explore.title')}</h2>
        <ModeToggle mode={mode} />
      </div>
      <Suspense fallback={<OpeningsLoadingPanel />}>
        <TrainerScreens />
      </Suspense>
    </div>
  );
}
