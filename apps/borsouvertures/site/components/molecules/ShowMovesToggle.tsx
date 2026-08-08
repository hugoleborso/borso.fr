import { useTranslation } from 'react-i18next';
import { ToggleSlider } from '@/components/atoms/ToggleSlider';

interface ShowMovesToggleProps {
  areMovesShown: boolean;
  onToggle: (areMovesShown: boolean) => void;
}

export function ShowMovesToggle({ areMovesShown, onToggle }: ShowMovesToggleProps) {
  const { t } = useTranslation();
  return (
    <ToggleSlider
      isOn={areMovesShown}
      onToggle={onToggle}
      leftLabel={t('session.show-moves.off')}
      rightLabel={t('session.show-moves.on')}
      ariaLabel={t('session.show-moves.aria-label')}
    />
  );
}
