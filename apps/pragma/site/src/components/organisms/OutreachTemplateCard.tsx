/** @Feature bars */

import { useForm } from '@tanstack/react-form';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { isSubmitDisabled } from '../../lib/form-submit.utils';
import { OUTREACH_PLACEHOLDERS } from '../../routes/bars/outreach-message.core';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { composeClassName } from '../atoms/class-name.utils';
import { inputVariants } from '../atoms/input.variants';

const TEXTAREA_CLASS = composeClassName(inputVariants({ size: 'md' }), 'font-mono resize-y');
const TEMPLATE_ROWS = 8;
const TEMPLATE_MAX_LENGTH = 4_096;

export interface OutreachTemplateCardProps {
  readonly template: string;
  readonly message: string | null;
  readonly onSave: (body: string) => void;
}

// @FollowsBlueprint route-form
export function OutreachTemplateCard(props: OutreachTemplateCardProps): JSX.Element {
  const { t } = useTranslation();
  const form = useForm({
    defaultValues: { body: props.template },
    onSubmit: ({ value }) => {
      props.onSave(value.body);
    },
  });

  return (
    <Card className="mb-5">
      <h3 className="font-display italic text-2xl text-ink-900 m-0 mb-1">
        {t('bars.outreachTemplate')}
      </h3>
      <p className="text-xs text-ink-500 mt-0 mb-3">
        {t('bars.outreachPlaceholdersHint', {
          bar: OUTREACH_PLACEHOLDERS.bar,
          phone: OUTREACH_PLACEHOLDERS.phone,
          email: OUTREACH_PLACEHOLDERS.email,
        })}
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void form.handleSubmit();
        }}
        className="flex flex-col gap-2.5"
      >
        <form.Field name="body">
          {(field) => (
            <textarea
              aria-label={t('bars.outreachTemplate')}
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
              onBlur={field.handleBlur}
              rows={TEMPLATE_ROWS}
              maxLength={TEMPLATE_MAX_LENGTH}
              className={TEXTAREA_CLASS}
            />
          )}
        </form.Field>
        <div className="flex items-center gap-3">
          <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
            {([canSubmit, isSubmitting]) => (
              <Button
                type="submit"
                variant="accent"
                disabled={isSubmitDisabled(canSubmit, isSubmitting)}
              >
                {t('common.save')}
              </Button>
            )}
          </form.Subscribe>
          {props.message === null ? null : (
            <span className="text-sm text-ink-500">{props.message}</span>
          )}
        </div>
      </form>
    </Card>
  );
}
