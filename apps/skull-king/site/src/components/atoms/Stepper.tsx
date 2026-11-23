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
}

// @FollowsBlueprint atom-plain
export function Stepper({ steps }: StepperProps) {
  return (
    <div className="ml-auto flex gap-2">
      {steps.map((step) => (
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
      ))}
    </div>
  );
}
