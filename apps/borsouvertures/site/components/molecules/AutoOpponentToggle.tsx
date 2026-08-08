import { useTranslation } from 'react-i18next';
import { ToggleSlider } from '@/components/atoms/ToggleSlider';

interface AutoOpponentToggleProps {
  isAutoOpponentEnabled: boolean;
  onToggle: (isAutoOpponentEnabled: boolean) => void;
}

export function AutoOpponentToggle({ isAutoOpponentEnabled, onToggle }: AutoOpponentToggleProps) {
  const { t } = useTranslation();
  return (
    <ToggleSlider
      isOn={isAutoOpponentEnabled}
      onToggle={onToggle}
      leftLabel={t('selection.auto-opponent.off')}
      rightLabel={t('selection.auto-opponent.on')}
      ariaLabel={t('selection.auto-opponent.aria-label')}
    />
  );
}
