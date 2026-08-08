import { useTranslation } from 'react-i18next';
import { BoardStyleSelect } from '@/components/molecules/BoardStyleSelect';
import { LanguageSwitcher } from '@/components/molecules/LanguageSwitcher';
import { ModeToggle } from '@/components/molecules/ModeToggle';
import { useAppState } from '@/state/appState';

export function TopBar() {
  const { t } = useTranslation();
  const { mode, boardStyle } = useAppState();
  return (
    <header className="panel controls-row topbar">
      <div className="topbar-left">
        <div className="brand-title">{t('top-bar.brand')}</div>
        <ModeToggle mode={mode} />
      </div>
      <div className="controls-row">
        <BoardStyleSelect boardStyle={boardStyle} />
        <LanguageSwitcher />
      </div>
    </header>
  );
}
