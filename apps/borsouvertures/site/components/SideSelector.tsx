import { ToggleSlider } from '@/components/ToggleSlider';
import type { Side } from '@/state/useAppState';

interface SideSelectorProps {
  value: Side;
  onChange: (side: Side) => void;
}

export function SideSelector({ value, onChange }: SideSelectorProps) {
  return (
    <div className="controls-row">
      <span>Train as:</span>
      <ToggleSlider
        value={value === 'black'}
        onChange={(isBlack) => onChange(isBlack ? 'black' : 'white')}
        leftLabel="White"
        rightLabel="Black"
        ariaLabel="Choose side"
      />
    </div>
  );
}
