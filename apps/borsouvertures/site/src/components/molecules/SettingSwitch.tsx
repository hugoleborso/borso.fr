import { ToggleSlider } from '@/components/atoms/ToggleSlider';

interface SettingSwitchProps {
  label: string;
  isOn: boolean;
  offLabel: string;
  onLabel: string;
  onToggle: (isOn: boolean) => void;
}

// @FollowsBlueprint molecule-presentational
export function SettingSwitch({ label, isOn, offLabel, onLabel, onToggle }: SettingSwitchProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <span className="font-bold">{label}</span>
      <ToggleSlider
        isOn={isOn}
        onToggle={onToggle}
        leftLabel={offLabel}
        rightLabel={onLabel}
        ariaLabel={label}
      />
    </div>
  );
}
