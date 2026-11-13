import { Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { Panel } from '@/components/atoms/Panel';
import { ModeToggle } from '@/components/molecules/ModeToggle';
import { OpeningsLoadingPanel } from '@/components/molecules/OpeningsLoadingPanel';
import { useAppState } from '@/state/appState';
import { TrainerScreens } from './TrainerScreens';

// @FollowsBlueprint organism-presentational
export function ExploreScreen() {
  const { t } = useTranslation();
  const { mode } = useAppState();
  return (
    <div className="flex flex-col gap-4">
      <Panel title={t('explore.title')}>
        <p>{t('explore.description')}</p>
        <div>
          <ModeToggle mode={mode} />
        </div>
      </Panel>
      <Suspense fallback={<OpeningsLoadingPanel />}>
        <TrainerScreens />
      </Suspense>
    </div>
  );
}
