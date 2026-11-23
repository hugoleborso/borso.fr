import { useTranslation } from 'react-i18next';
import type { StepDirection, StepView } from '@site/lib/ability-stepper.core';
import { formatCount } from '@site/lib/count-stepper.core';
import { Stepper } from '../atoms/Stepper';

export interface CountStepperProps {
  readonly label: string;
  readonly count: number | null;
  readonly steps: readonly StepView[];
  readonly onStep: (direction: StepDirection) => void;
}

// @FollowsBlueprint molecule-presentational
export function CountStepper({ label, count, steps, onStep }: CountStepperProps) {
  const { t } = useTranslation();
  return (
    <Stepper
      label={label}
      value={formatCount(count)}
      className="ml-auto"
      steps={steps.map((step) => ({
        text: step.text,
        label: t(step.labelKey),
        isDisabled: step.isDisabled,
        isPressed: step.isPressed,
        onPress: () => {
          onStep(step.direction);
        },
      }))}
    />
  );
}
