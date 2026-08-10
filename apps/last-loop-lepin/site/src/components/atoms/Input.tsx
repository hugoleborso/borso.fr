export type InputKind = 'text' | 'password' | 'number' | 'datetime-local';

interface InputProps {
  readonly id: string;
  readonly value: string;
  readonly onValueChange: (value: string) => void;
  readonly type?: InputKind;
  readonly required?: boolean;
  readonly minimumLength?: number;
  readonly minimum?: number;
  readonly maximum?: number;
  readonly step?: number;
  readonly readOnly?: boolean;
  readonly disabled?: boolean;
  readonly autoComplete?: string;
  readonly onBlur?: () => void;
}

// @FollowsBlueprint atom-plain
export function Input({
  id,
  value,
  onValueChange,
  type = 'text',
  required = false,
  minimumLength,
  minimum,
  maximum,
  step,
  readOnly = false,
  disabled = false,
  autoComplete,
  onBlur,
}: InputProps) {
  return (
    <input
      id={id}
      className="input"
      type={type}
      value={value}
      onChange={(event) => {
        onValueChange(event.target.value);
      }}
      onBlur={onBlur}
      required={required}
      minLength={minimumLength}
      min={minimum}
      max={maximum}
      step={step}
      readOnly={readOnly}
      disabled={disabled}
      autoComplete={autoComplete}
    />
  );
}
