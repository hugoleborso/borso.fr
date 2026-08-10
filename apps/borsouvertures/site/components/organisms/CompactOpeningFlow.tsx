import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/atoms/Button';
import { EmptySlot } from '@/components/atoms/EmptySlot';
import { LinesPanel } from '@/components/molecules/LinesPanel';
import type { OpeningPanelProps } from '@/components/molecules/openingPanel.types';
import { OpeningsPanel } from '@/components/molecules/OpeningsPanel';
import { VariationsPanel } from '@/components/molecules/VariationsPanel';
import type { ComponentByKind } from '@/lib/componentTable.types';

type SelectorStep = 'opening' | 'variation' | 'line';

// @FollowsBlueprint component-lookup-table
const PANEL_BY_STEP: ComponentByKind<SelectorStep, OpeningPanelProps> = {
  opening: OpeningsPanel,
  variation: VariationsPanel,
  line: LinesPanel,
};

const NEXT_STEP_BY_STEP: Record<SelectorStep, SelectorStep> = {
  opening: 'variation',
  variation: 'line',
  line: 'line',
};

const PREVIOUS_STEP_BY_STEP: Record<SelectorStep, SelectorStep> = {
  opening: 'opening',
  variation: 'opening',
  line: 'variation',
};

interface BackButtonProps {
  label: string;
  onActivate: () => void;
}

const BACK_BUTTON_BY_STEP: ComponentByKind<SelectorStep, BackButtonProps> = {
  opening: EmptySlot,
  variation: Button,
  line: Button,
};

/**
 * On a narrow viewport the three columns become one step at a time, so a card
 * tap moves the flow forward and the back button walks it out again.
 */
// @FollowsBlueprint organism-table-dispatch
export function CompactOpeningFlow(props: OpeningPanelProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState<SelectorStep>('opening');
  const Panel = PANEL_BY_STEP[step];
  const BackButton = BACK_BUTTON_BY_STEP[step];

  return (
    <div className="selector-columns">
      <div className="selector-back">
        <BackButton
          label={t('common.action.back')}
          onActivate={() => setStep(PREVIOUS_STEP_BY_STEP[step])}
        />
      </div>
      <Panel {...props} onAdvance={() => setStep(NEXT_STEP_BY_STEP[step])} />
    </div>
  );
}
