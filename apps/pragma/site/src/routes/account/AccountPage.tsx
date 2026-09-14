/** @Feature auth */

import { useForm } from '@tanstack/react-form';
import type { JSX } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/atoms/Button';
import { Card } from '../../components/atoms/Card';
import { Input } from '../../components/atoms/Input';
import { ApiError } from '../../lib/api.client';
import { isPasskeySupported } from '../../lib/passkey.adapter';
import {
  useChangePassword,
  usePasskeys,
  useRegisterPasskey,
  useRemovePasskey,
  useSignedInMember,
} from '../../lib/queries/me.queries';
import { selectLoginErrorMessageKey } from '../login.core';

const DEVICE_LABEL_MAX_LENGTH = 64;

// @FollowsBlueprint route-form
export function AccountPage(): JSX.Element {
  const { t } = useTranslation();
  const member = useSignedInMember();
  const passkeys = usePasskeys();
  const changePassword = useChangePassword();
  const registerPasskey = useRegisterPasskey();
  const removePasskey = useRemovePasskey();
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [deviceLabel, setDeviceLabel] = useState<string>('');
  const hasPasskeySupport = isPasskeySupported();

  const form = useForm({
    defaultValues: { currentPassword: '', newPassword: '' },
    onSubmit: async ({ value }) => {
      setPasswordError(null);
      setPasswordMessage(null);
      try {
        await changePassword.mutateAsync(value);
        setPasswordMessage(t('account.passwordChanged'));
        form.reset();
      } catch (error) {
        const status = error instanceof ApiError ? error.status : null;
        setPasswordError(t(selectLoginErrorMessageKey(status)));
      }
    },
  });

  return (
    <section className="flex flex-col gap-4 p-4 sm:p-6 max-w-[640px]">
      <h1 className="font-display italic text-[32px] leading-none text-ink-900 m-0">
        {t('account.title')}
      </h1>
      <Card className="p-4 sm:p-6">
        <p className="text-xs tracking-wider uppercase text-ink-400">{t('account.signedInAs')}</p>
        <p className="text-lg text-ink-900 m-0">
          {member.data?.firstName ?? '—'} ({member.data?.username ?? '—'})
        </p>
      </Card>

      <Card className="p-4 sm:p-6">
        <h2 className="text-base text-ink-900 m-0 mb-3">{t('account.changePassword')}</h2>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            void form.handleSubmit();
          }}
          className="flex flex-col gap-3"
        >
          <label htmlFor="account-current" className="text-xs uppercase text-ink-400">
            {t('account.currentPassword')}
          </label>
          <form.Field name="currentPassword">
            {(field) => (
              <Input
                id="account-current"
                type="password"
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
                autoComplete="current-password"
                required
                minLength={8}
              />
            )}
          </form.Field>
          <label htmlFor="account-new" className="text-xs uppercase text-ink-400">
            {t('account.newPassword')}
          </label>
          <form.Field name="newPassword">
            {(field) => (
              <Input
                id="account-new"
                type="password"
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
                autoComplete="new-password"
                required
                minLength={8}
              />
            )}
          </form.Field>
          <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
            {([canSubmit, isSubmitting]) => (
              <Button type="submit" variant="accent" disabled={!canSubmit || isSubmitting}>
                {t('account.changePassword')}
              </Button>
            )}
          </form.Subscribe>
          {passwordMessage === null ? null : (
            <p className="text-sm text-ink-700" role="status">
              {passwordMessage}
            </p>
          )}
          {passwordError === null ? null : (
            <p className="text-danger text-sm" role="alert">
              {passwordError}
            </p>
          )}
        </form>
      </Card>

      <Card className="p-4 sm:p-6">
        <h2 className="text-base text-ink-900 m-0 mb-3">{t('account.passkeys')}</h2>
        {(passkeys.data ?? []).length === 0 ? (
          <p className="text-sm text-ink-500">{t('account.passkeysEmpty')}</p>
        ) : (
          <ul className="list-none p-0 m-0 flex flex-col gap-2">
            {(passkeys.data ?? []).map((passkey) => (
              <li key={passkey.id} className="flex items-center justify-between gap-3">
                <span className="text-ink-900">{passkey.label}</span>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => removePasskey.mutate({ passkeyId: passkey.id })}
                >
                  {t('account.removePasskey')}
                </Button>
              </li>
            ))}
          </ul>
        )}
        {hasPasskeySupport ? (
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label htmlFor="passkey-label" className="text-xs uppercase text-ink-400">
                {t('account.passkeyLabel')}
              </label>
              <Input
                id="passkey-label"
                type="text"
                value={deviceLabel}
                maxLength={DEVICE_LABEL_MAX_LENGTH}
                onChange={(event) => setDeviceLabel(event.target.value)}
              />
            </div>
            <Button
              type="button"
              variant="accent"
              disabled={deviceLabel.trim().length === 0 || registerPasskey.isPending}
              onClick={() => {
                registerPasskey.mutate(
                  { label: deviceLabel.trim() },
                  { onSuccess: () => setDeviceLabel('') },
                );
              }}
            >
              {t('account.addPasskey')}
            </Button>
          </div>
        ) : (
          <p className="mt-4 text-sm text-ink-500">{t('account.passkeyUnsupported')}</p>
        )}
      </Card>
    </section>
  );
}
