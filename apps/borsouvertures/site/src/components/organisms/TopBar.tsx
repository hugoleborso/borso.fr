import { useTranslation } from 'react-i18next';
import { Button } from '@/components/atoms/Button';
import { BoardStyleSelect } from '@/components/molecules/BoardStyleSelect';
import { LanguageSwitcher } from '@/components/molecules/LanguageSwitcher';
import { openScreen } from '@/navigation/navigation.store';
import { useAppState } from '@/state/appState';

// @FollowsBlueprint organism-presentational
export function TopBar() {
  const { t } = useTranslation();
  const { boardStyle } = useAppState();
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl border border-panel-line bg-panel backdrop-blur-[6px]">
      <div className="flex flex-wrap items-center gap-3 min-w-0">
        <h1 className="text-[1rem] font-bold roomy:text-[1.2rem]">{t('top-bar.brand')}</h1>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <BoardStyleSelect boardStyle={boardStyle} />
        <LanguageSwitcher />
        <Button label={t('credits.link')} onActivate={() => openScreen({ kind: 'credits' })} />
      </div>
    </header>
  );
}
