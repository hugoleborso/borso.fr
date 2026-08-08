import { Input, type InputKind } from '../atoms/Input';
import { Label } from '../atoms/Label';

interface FormFieldProps {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly onValueChange: (value: string) => void;
  readonly onBlur?: () => void;
  readonly type?: InputKind;
  readonly required?: boolean;
  readonly minimumLength?: number;
  readonly minimum?: number;
  readonly maximum?: number;
  readonly step?: number;
  readonly readOnly?: boolean;
  readonly disabled?: boolean;
  readonly autoComplete?: string;
  readonly style?: React.CSSProperties;
}

export function FormField({
  id,
  label,
  value,
  onValueChange,
  onBlur,
  type,
  required,
  minimumLength,
  minimum,
  maximum,
  step,
  readOnly,
  disabled,
  autoComplete,
  style,
}: FormFieldProps) {
  return (
    <div className="field" style={style}>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        onValueChange={onValueChange}
        onBlur={onBlur}
        type={type}
        required={required}
        minimumLength={minimumLength}
        minimum={minimum}
        maximum={maximum}
        step={step}
        readOnly={readOnly}
        disabled={disabled}
        autoComplete={autoComplete}
      />
    </div>
  );
}
