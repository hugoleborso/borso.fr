import clsx from 'clsx';
import { Button } from './Button';

export interface StepperStep {
  readonly text: string;
  readonly label: string;
  readonly isDisabled: boolean;
  readonly isPressed: boolean | undefined;
  readonly onPress: () => void;
}

export interface StepperProps {
  readonly steps: readonly StepperStep[];
  readonly label?: string;
  readonly value?: string;
  readonly className?: string;
}

const VALUE_SLOT = 1;

function renderStep(step: StepperStep) {
  return (
    <Button
      key={step.text}
      variant="raised"
      size="step"
      aria-label={step.label}
      aria-pressed={step.isPressed}
      disabled={step.isDisabled}
      onClick={step.onPress}
    >
      {step.text}
    </Button>
  );
}

// @FollowsBlueprint atom-plain
export function Stepper({ steps, label, value, className }: StepperProps) {
  return (
    <div
      role={label === undefined ? undefined : 'group'}
      aria-label={label}
      className={clsx('flex shrink-0 items-center gap-2', className)}
    >
      {steps.slice(0, VALUE_SLOT).map(renderStep)}
      {value === undefined ? null : (
        <output className="min-w-9 text-center text-3xl font-extrabold tabular-nums">
          {value}
        </output>
      )}
      {steps.slice(VALUE_SLOT).map(renderStep)}
    </div>
  );
}
