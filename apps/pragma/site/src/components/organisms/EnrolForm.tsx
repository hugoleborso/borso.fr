/** @Feature auth */

import { useForm } from '@tanstack/react-form';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import type { EnrolmentOffer } from '../../lib/queries/auth.queries';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { PasswordField } from '../molecules/PasswordField';

const PASSWORD_MIN_LENGTH = 8;

export interface EnrolFormValues {
  readonly memberId: string;
  readonly username: string;
  readonly password: string;
  readonly sharedPassword: string;
}

export interface EnrolFormProps {
  readonly offers: readonly EnrolmentOffer[];
  readonly serverError: string | null;
  readonly onSubmit: (values: EnrolFormValues) => Promise<void>;
}

// @FollowsBlueprint route-form
export function EnrolForm({ offers, serverError, onSubmit }: EnrolFormProps): JSX.Element {
  const { t } = useTranslation();
  const form = useForm({
    defaultValues: { memberId: '', username: '', password: '', sharedPassword: '' },
    onSubmit: async ({ value }) => {
      await onSubmit({ ...value, username: value.username.trim().toLowerCase() });
    },
  });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
      className="flex flex-col gap-3"
    >
      <label
        htmlFor="enrol-member"
        className="text-xs tracking-wider uppercase text-ink-400 font-medium"
      >
        {t('auth.enrolMember')}
      </label>
      <form.Field name="memberId">
        {(field) => (
          <select
            id="enrol-member"
            value={field.state.value}
            onChange={(event) => {
              field.handleChange(event.target.value);
              const picked = offers.find((offer) => offer.memberId === event.target.value);
              form.setFieldValue('username', picked?.suggestedUsername ?? '');
            }}
            required
            className="min-h-11 rounded-lg border border-line bg-surface px-3 text-ink-900"
          >
            <option value="">—</option>
            {offers.map((offer) => (
              <option key={offer.memberId} value={offer.memberId}>
                {offer.firstName}
              </option>
            ))}
          </select>
        )}
      </form.Field>

      <label
        htmlFor="enrol-username"
        className="text-xs tracking-wider uppercase text-ink-400 font-medium"
      >
        {t('auth.usernameLabel')}
      </label>
      <form.Field name="username">
        {(field) => (
          <Input
            id="enrol-username"
            type="text"
            value={field.state.value}
            onChange={(event) => field.handleChange(event.target.value)}
            onBlur={field.handleBlur}
            autoComplete="username"
            required
          />
        )}
      </form.Field>

      <label
        htmlFor="enrol-shared"
        className="text-xs tracking-wider uppercase text-ink-400 font-medium"
      >
        {t('auth.sharedPasswordLabel')}
      </label>
      <form.Field name="sharedPassword">
        {(field) => (
          <PasswordField
            id="enrol-shared"
            value={field.state.value}
            onChange={(event) => field.handleChange(event.target.value)}
            onBlur={field.handleBlur}
            autoComplete="off"
            required
            minLength={PASSWORD_MIN_LENGTH}
          />
        )}
      </form.Field>

      <label
        htmlFor="enrol-password"
        className="text-xs tracking-wider uppercase text-ink-400 font-medium"
      >
        {t('auth.passwordLabel')}
      </label>
      <form.Field name="password">
        {(field) => (
          <PasswordField
            id="enrol-password"
            value={field.state.value}
            onChange={(event) => field.handleChange(event.target.value)}
            onBlur={field.handleBlur}
            autoComplete="new-password"
            required
            minLength={PASSWORD_MIN_LENGTH}
          />
        )}
      </form.Field>

      <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
        {([canSubmit, isSubmitting]) => (
          <Button
            type="submit"
            variant="accent"
            disabled={!canSubmit || isSubmitting}
            className="mt-2"
          >
            {t('auth.enrolSubmit')}
          </Button>
        )}
      </form.Subscribe>
      {serverError === null ? null : (
        <p className="text-danger text-sm" role="alert">
          {serverError}
        </p>
      )}
    </form>
  );
}
