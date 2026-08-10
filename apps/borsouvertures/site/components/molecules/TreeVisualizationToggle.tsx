import { useTranslation } from 'react-i18next';
import { ToggleSlider } from '@/components/atoms/ToggleSlider';
import type { TreeVisualization } from '@/openings/sessionStart.core';
import { setTreeVisualizationMode } from '@/state/appState';

const VISUALIZATION_BY_USES_BUTTONS: Record<`${boolean}`, TreeVisualization> = {
  true: 'buttons',
  false: 'arrows',
};

interface TreeVisualizationToggleProps {
  visualization: TreeVisualization;
}

export function TreeVisualizationToggle({ visualization }: TreeVisualizationToggleProps) {
  const { t } = useTranslation();
  return (
    <ToggleSlider
      isOn={visualization === 'buttons'}
      onToggle={(usesButtons) =>
        setTreeVisualizationMode(VISUALIZATION_BY_USES_BUTTONS[`${usesButtons}`])
      }
      leftLabel={t('session.tree-visualization.arrows')}
      rightLabel={t('session.tree-visualization.buttons')}
      ariaLabel={t('session.tree-visualization.aria-label')}
    />
  );
}
