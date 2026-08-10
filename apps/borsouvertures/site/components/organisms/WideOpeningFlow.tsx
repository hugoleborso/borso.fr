import { LinesPanel } from '@/components/molecules/LinesPanel';
import type { OpeningPanelProps } from '@/components/molecules/openingPanel.types';
import { OpeningsPanel } from '@/components/molecules/OpeningsPanel';
import { VariationsPanel } from '@/components/molecules/VariationsPanel';

/** Nothing to advance to on a wide viewport: all three columns are on screen. */
function stayOnTheSameStep(): void {
  // Intentionally empty.
}

// @FollowsBlueprint organism-presentational
export function WideOpeningFlow(props: OpeningPanelProps) {
  return (
    <div className="selector-columns">
      <OpeningsPanel {...props} onAdvance={stayOnTheSameStep} />
      <VariationsPanel {...props} onAdvance={stayOnTheSameStep} />
      <LinesPanel {...props} onAdvance={stayOnTheSameStep} />
    </div>
  );
}
