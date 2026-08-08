import { useTranslation } from 'react-i18next';
import { ToggleSlider } from '@/components/atoms/ToggleSlider';
import { setSide } from '@/state/appState';
import type { Side } from '@/state/persistedState.utils';

const SIDE_BY_IS_BLACK: Record<`${boolean}`, Side> = { true: 'black', false: 'white' };

interface SideSelectorProps {
  side: Side;
}

export function SideSelector({ side }: SideSelectorProps) {
  const { t } = useTranslation();
  return (
    <div className="controls-row">
      <span>{t('selection.side.label')}</span>
      <ToggleSlider
        isOn={side === 'black'}
        onToggle={(isBlack) => setSide(SIDE_BY_IS_BLACK[`${isBlack}`])}
        leftLabel={t('selection.side.white')}
        rightLabel={t('selection.side.black')}
        ariaLabel={t('selection.side.aria-label')}
      />
    </div>
  );
}
