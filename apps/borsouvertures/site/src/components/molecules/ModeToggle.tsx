import { useTranslation } from 'react-i18next';
import { ToggleSlider } from '@/components/atoms/ToggleSlider';
import { isPlayScopeResetRequired } from '@/openings/sessionStart.core';
import { resetPlayScopeAndSelection, setMode } from '@/state/appState';
import type { Mode } from '@/state/persistedState.utils';

// @FollowsBlueprint component-lookup-table
const MODE_BY_IS_PLAY: Record<`${boolean}`, Mode> = { true: 'play', false: 'learn' };

function keepPlayScope(): void {
  return undefined;
}

const SCOPE_CHANGE_BY_REQUIREMENT: Record<`${boolean}`, () => void> = {
  true: resetPlayScopeAndSelection,
  false: keepPlayScope,
};

interface ModeToggleProps {
  mode: Mode;
}

// @FollowsBlueprint molecule-presentational
export function ModeToggle({ mode }: ModeToggleProps) {
  const { t } = useTranslation();

  function selectMode(isPlayChosen: boolean): void {
    const nextMode = MODE_BY_IS_PLAY[`${isPlayChosen}`];
    SCOPE_CHANGE_BY_REQUIREMENT[`${isPlayScopeResetRequired(mode, nextMode)}`]();
    setMode(nextMode);
  }

  return (
    <ToggleSlider
      isOn={mode === 'play'}
      onToggle={selectMode}
      leftLabel={t('top-bar.mode.learn')}
      rightLabel={t('top-bar.mode.play')}
      ariaLabel={t('top-bar.mode.aria-label')}
    />
  );
}
