/** @Feature auth */

import type { JSX } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../../components/atoms/Card';
import { ContactDetailsForm } from '../../components/organisms/ContactDetailsForm';
import { PasskeyList } from '../../components/organisms/PasskeyList';
import { PasswordChangeForm } from '../../components/organisms/PasswordChangeForm';
import { ApiError } from '../../lib/api.client';
import { isPasskeySupported } from '../../lib/passkey.adapter';
import {
  useChangePassword,
  usePasskeys,
  useRegisterPasskey,
  useRemovePasskey,
  useSaveContactDetails,
  useSignedInMember,
} from '../../lib/queries/me.queries';
import { selectLoginErrorMessageKey } from '../login.core';

// @FollowsBlueprint route-detail-page
export function AccountPage(): JSX.Element {
  const { t } = useTranslation();
  const member = useSignedInMember();
  const passkeys = usePasskeys();
  const changePassword = useChangePassword();
  const registerPasskey = useRegisterPasskey();
  const removePasskey = useRemovePasskey();
  const saveContactDetails = useSaveContactDetails();
  const [contactMessage, setContactMessage] = useState<string | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

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
        <h2 className="text-base text-ink-900 m-0 mb-3">{t('account.contactDetails')}</h2>
        <p className="text-xs text-ink-500 mt-0 mb-3">{t('account.contactDetailsHint')}</p>
        <ContactDetailsForm
          key={`${member.data?.phone ?? ''}-${member.data?.email ?? ''}`}
          initial={{ phone: member.data?.phone ?? '', email: member.data?.email ?? '' }}
          message={contactMessage}
          onSubmit={async (values) => {
            setContactMessage(null);
            await saveContactDetails.mutateAsync({
              phone: values.phone.length === 0 ? null : values.phone,
              email: values.email.length === 0 ? null : values.email,
            });
            setContactMessage(t('account.contactDetailsSaved'));
          }}
        />
      </Card>

      <Card className="p-4 sm:p-6">
        <h2 className="text-base text-ink-900 m-0 mb-3">{t('account.changePassword')}</h2>
        <PasswordChangeForm
          message={passwordMessage}
          serverError={passwordError}
          onSubmit={async (values) => {
            setPasswordError(null);
            setPasswordMessage(null);
            try {
              await changePassword.mutateAsync(values);
              setPasswordMessage(t('account.passwordChanged'));
            } catch (error) {
              const status = error instanceof ApiError ? error.status : null;
              setPasswordError(t(selectLoginErrorMessageKey(status)));
            }
          }}
        />
      </Card>

      <Card className="p-4 sm:p-6">
        <h2 className="text-base text-ink-900 m-0 mb-3">{t('account.passkeys')}</h2>
        <PasskeyList
          passkeys={passkeys.data ?? []}
          canAdd={isPasskeySupported()}
          isAdding={registerPasskey.isPending}
          onAdd={(label) => registerPasskey.mutate({ label })}
          onRemove={(passkeyId) => removePasskey.mutate({ passkeyId })}
        />
      </Card>
    </section>
  );
}
