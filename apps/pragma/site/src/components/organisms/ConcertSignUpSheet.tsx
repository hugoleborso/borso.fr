/** @Feature concert-registrations */

import { useForm } from '@tanstack/react-form';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import {
  EMAIL_INPUT_MAX_LENGTH,
  FIRST_NAME_INPUT_MAX_LENGTH,
  type SignUpErrorKey,
  type SignUpFormValues,
  signUpFormSchema,
} from '../../routes/concerts/concert-sign-up.core';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { LabelledField } from '../atoms/LabelledField';
import { Sheet } from '../molecules/Sheet';

export interface ConcertSignUpSheetProps {
  readonly sessionId: string;
  readonly title: string;
  readonly initialValues: SignUpFormValues;
  readonly emailErrorKey: SignUpErrorKey | null;
  readonly formErrorKey: SignUpErrorKey | null;
  readonly onSubmit: (values: SignUpFormValues) => void;
  readonly onClose: () => void;
}

const ERROR_CLASS = 'm-0 text-meta text-danger';

// @FollowsBlueprint molecule-dialog-form
export function ConcertSignUpSheet({
  sessionId,
  title,
  initialValues,
  emailErrorKey,
  formErrorKey,
  onSubmit,
  onClose,
}: ConcertSignUpSheetProps): JSX.Element {
  const { t } = useTranslation();
  const form = useForm({
    defaultValues: initialValues,
    validators: { onChange: signUpFormSchema },
    onSubmit: ({ value }) => onSubmit(value),
  });
  const firstNameId = `first-name-${sessionId}`;
  const emailId = `email-${sessionId}`;
  const emailErrorId = `email-error-${sessionId}`;

  return (
    <Sheet
      title={<span className="font-semibold text-heading">{title}</span>}
      label={title}
      isTitleARecordName
      onClose={onClose}
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
      footer={
        <div className="flex w-full flex-col gap-2">
          <form.Subscribe selector={(state) => state.canSubmit}>
            {(canSubmit) => (
              <Button
                type="submit"
                icon="check"
                variant="primary"
                size="lg"
                className="min-h-14 w-full"
                disabled={!canSubmit}
              >
                {t('concerts.validate')}
              </Button>
            )}
          </form.Subscribe>
          {formErrorKey === null ? null : (
            <p className={ERROR_CLASS} role="alert">
              {t(formErrorKey)}
            </p>
          )}
        </div>
      }
    >
      <div className="flex flex-col gap-4 pt-2">
        <LabelledField id={firstNameId} label={t('concerts.firstName')}>
          <form.Field name="firstName">
            {(field) => (
              <Input
                id={firstNameId}
                type="text"
                autoComplete="given-name"
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
                onBlur={field.handleBlur}
                required
                maxLength={FIRST_NAME_INPUT_MAX_LENGTH}
              />
            )}
          </form.Field>
        </LabelledField>
        <LabelledField id={emailId} label={t('concerts.email')}>
          <form.Field name="email">
            {(field) => (
              <Input
                id={emailId}
                type="email"
                inputMode="email"
                autoComplete="email"
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
                onBlur={field.handleBlur}
                required
                maxLength={EMAIL_INPUT_MAX_LENGTH}
                aria-invalid={emailErrorKey !== null}
                aria-describedby={emailErrorKey === null ? undefined : emailErrorId}
              />
            )}
          </form.Field>
          {emailErrorKey === null ? null : (
            <p id={emailErrorId} className={ERROR_CLASS} role="alert">
              {t(emailErrorKey)}
            </p>
          )}
        </LabelledField>
      </div>
    </Sheet>
  );
}
