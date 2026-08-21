export const INPUT_CLASS =
  'w-full min-h-11 px-3 py-2.5 rounded-lg border border-line bg-bg font-mono text-[13px] text-ink';

export const FILE_INPUT_CLASS = `${INPUT_CLASS} file:mr-3 file:-ml-1 file:px-2.5 file:py-1 file:rounded-md file:border file:border-line file:bg-bg-elev file:text-[12px] file:font-medium file:text-ink file:cursor-pointer`;

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
      className={INPUT_CLASS}
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
