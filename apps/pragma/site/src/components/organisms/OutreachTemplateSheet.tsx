/** @Feature bars */

import { OUTREACH_TEMPLATE_MAX_LENGTH } from '@domain/input-limits.core';
import { useForm } from '@tanstack/react-form';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { isSubmitDisabled } from '../../lib/form-submit.utils';
import { OUTREACH_PLACEHOLDERS } from '../../routes/bars/outreach-message.core';
import { AutoGrowTextarea } from '../atoms/AutoGrowTextarea';
import { Button } from '../atoms/Button';
import { Sheet } from '../molecules/Sheet';

export interface OutreachTemplateSheetProps {
  readonly template: string;
  readonly message: string | null;
  readonly onSave: (body: string) => void;
  readonly onClose: () => void;
}

// @FollowsBlueprint route-form
export function OutreachTemplateSheet(props: OutreachTemplateSheetProps): JSX.Element {
  const { t } = useTranslation();
  const form = useForm({
    defaultValues: { body: props.template },
    onSubmit: ({ value }) => {
      props.onSave(value.body);
    },
  });

  const title = t('bars.outreachTemplate');

  return (
    <Sheet
      title={title}
      label={title}
      size="full"
      onClose={props.onClose}
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
      footer={
        <>
          {props.message === null ? null : (
            <span className="text-meta text-ink-soft">{props.message}</span>
          )}
          <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
            {([canSubmit, isSubmitting]) => (
              <Button
                icon="check"
                type="submit"
                variant="primary"
                size="lg"
                disabled={isSubmitDisabled(canSubmit, isSubmitting)}
              >
                {t('bars.outreachTemplateSave')}
              </Button>
            )}
          </form.Subscribe>
        </>
      }
    >
      <div className="flex min-h-full flex-col">
        <p className="text-meta text-ink-soft mt-0 mb-3">
          {t('bars.outreachPlaceholdersHint', {
            bar: OUTREACH_PLACEHOLDERS.bar,
            phone: OUTREACH_PLACEHOLDERS.phone,
            email: OUTREACH_PLACEHOLDERS.email,
          })}
        </p>
        <form.Field name="body">
          {(field) => (
            <AutoGrowTextarea
              data-sheet-focus
              aria-label={title}
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
              onBlur={field.handleBlur}
              maxLength={OUTREACH_TEMPLATE_MAX_LENGTH}
              className="shrink-0 grow"
            />
          )}
        </form.Field>
      </div>
    </Sheet>
  );
}
