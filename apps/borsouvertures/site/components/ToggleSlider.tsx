interface ToggleSliderProps {
  value: boolean;
  onChange: (value: boolean) => void;
  leftLabel: string;
  rightLabel: string;
  ariaLabel?: string;
}

export function ToggleSlider({
  value,
  onChange,
  leftLabel,
  rightLabel,
  ariaLabel,
}: ToggleSliderProps) {
  return (
    <button
      type="button"
      className={`toggle-slider ${value ? 'on' : ''}`}
      onClick={() => onChange(!value)}
      aria-pressed={value}
      aria-label={ariaLabel ?? `${leftLabel}/${rightLabel} toggle`}
    >
      <span className={`toggle-label ${!value ? 'active' : ''}`}>{leftLabel}</span>
      <span className="toggle-track">
        <span className="toggle-thumb" />
      </span>
      <span className={`toggle-label ${value ? 'active' : ''}`}>{rightLabel}</span>
    </button>
  );
}
