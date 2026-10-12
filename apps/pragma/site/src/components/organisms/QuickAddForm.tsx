import { useForm } from '@tanstack/react-form';
import type { JSX } from 'react';
import { z } from 'zod';
import { Button } from '../atoms/Button';
import { Icon } from '../atoms/Icon';
import { Input } from '../atoms/Input';

const TEXT_MAX = 200;

export interface QuickAddFormProps {
  readonly inputId: string;
  readonly label: string;
  readonly submitLabel: string;
  readonly onAdd: (text: string) => Promise<void>;
}

const quickAddSchema = z.object({ text: z.string().trim().min(1).max(TEXT_MAX) });

// @FollowsBlueprint organism-form
export function QuickAddForm({
  inputId,
  label,
  submitLabel,
  onAdd,
}: QuickAddFormProps): JSX.Element {
  const form = useForm({
    defaultValues: { text: '' },
    validators: { onChange: quickAddSchema },
    onSubmit: async ({ value, formApi }) => {
      await onAdd(value.text.trim());
      formApi.reset();
    },
  });

  return (
    <form
      className="flex items-center gap-2 mb-4"
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <label htmlFor={inputId} className="sr-only">
        {label}
      </label>
      <form.Field name="text">
        {(field) => (
          <Input
            id={inputId}
            type="text"
            value={field.state.value}
            onChange={(event) => field.handleChange(event.target.value)}
            onBlur={field.handleBlur}
            placeholder={label}
            maxLength={TEXT_MAX}
            className="flex-1 min-w-0"
          />
        )}
      </form.Field>
      <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting] as const}>
        {([canSubmit, isSubmitting]) => (
          <Button type="submit" variant="accent" disabled={!canSubmit || isSubmitting}>
            <Icon name="plus" size={14} />
            {submitLabel}
          </Button>
        )}
      </form.Subscribe>
    </form>
  );
}
