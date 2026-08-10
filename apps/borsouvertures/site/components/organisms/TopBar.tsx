import { useTranslation } from 'react-i18next';
import { BoardStyleSelect } from '@/components/molecules/BoardStyleSelect';
import { LanguageSwitcher } from '@/components/molecules/LanguageSwitcher';
import { ModeToggle } from '@/components/molecules/ModeToggle';
import { useAppState } from '@/state/appState';

// @FollowsBlueprint organism-presentational
export function TopBar() {
  const { t } = useTranslation();
  const { mode, boardStyle } = useAppState();
  return (
    <header className="panel controls-row topbar">
      <div className="topbar-left">
        <h1 className="brand-title">{t('top-bar.brand')}</h1>
        <ModeToggle mode={mode} />
      </div>
      <div className="controls-row">
        <BoardStyleSelect boardStyle={boardStyle} />
        <LanguageSwitcher />
      </div>
    </header>
  );
}
