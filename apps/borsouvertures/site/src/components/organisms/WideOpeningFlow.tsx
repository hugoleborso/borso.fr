import { LinesPanel } from '@/components/molecules/LinesPanel';
import type { OpeningPanelProps } from '@/components/molecules/openingPanel.types';
import { OpeningsPanel } from '@/components/molecules/OpeningsPanel';
import { VariationsPanel } from '@/components/molecules/VariationsPanel';

function stayOnTheSameStep(): void {
  return undefined;
}

// @FollowsBlueprint organism-presentational
export function WideOpeningFlow(props: OpeningPanelProps) {
  return (
    <div className="grid grid-cols-1 gap-3 triple:grid-cols-3">
      <OpeningsPanel {...props} onAdvance={stayOnTheSameStep} />
      <VariationsPanel {...props} onAdvance={stayOnTheSameStep} />
      <LinesPanel {...props} onAdvance={stayOnTheSameStep} />
    </div>
  );
}
