/** @Feature bars */

import { OUTREACH_TEMPLATE_MAX_LENGTH } from '@domain/input-limits.core';
import { useForm } from '@tanstack/react-form';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { isSubmitDisabled } from '../../lib/form-submit.utils';
import { OUTREACH_PLACEHOLDERS } from '../../routes/bars/outreach-message.core';
import { AutoGrowTextarea } from '../atoms/AutoGrowTextarea';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { Icon } from '../atoms/Icon';

const TEMPLATE_ROWS = 8;

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
      <details className="group">
        <summary className="flex items-center justify-between gap-2 min-h-11 cursor-pointer list-none">
          <h3 className="font-display text-title text-ink m-0">{t('bars.outreachTemplate')}</h3>
          <Icon name="chevD" size="sm" className="transition-transform group-open:rotate-180" />
        </summary>
        <p className="text-meta text-ink-soft mt-0 mb-3">
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
              <AutoGrowTextarea
                aria-label={t('bars.outreachTemplate')}
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
                onBlur={field.handleBlur}
                rows={TEMPLATE_ROWS}
                maxLength={OUTREACH_TEMPLATE_MAX_LENGTH}
              />
            )}
          </form.Field>
          <div className="flex items-center gap-3">
            <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
              {([canSubmit, isSubmitting]) => (
                <Button
                  icon="check"
                  type="submit"
                  variant="primary"
                  disabled={isSubmitDisabled(canSubmit, isSubmitting)}
                >
                  {t('bars.outreachTemplateSave')}
                </Button>
              )}
            </form.Subscribe>
            {props.message === null ? null : (
              <span className="text-meta text-ink-soft">{props.message}</span>
            )}
          </div>
        </form>
      </details>
    </Card>
  );
}
