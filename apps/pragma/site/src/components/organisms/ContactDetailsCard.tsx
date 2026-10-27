/** @Feature auth */

import { type JSX, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSaveContactDetails, useSignedInMember } from '../../lib/queries/me.queries';
import { Card } from '../atoms/Card';
import { ContactDetailsForm } from './ContactDetailsForm';

// @FollowsBlueprint organism-query-owning
export function ContactDetailsCard(): JSX.Element {
  const { t } = useTranslation();
  const member = useSignedInMember();
  const saveContactDetails = useSaveContactDetails();
  const [contactMessage, setContactMessage] = useState<string | null>(null);
  return (
    <Card className="p-4 sm:p-6">
      <h2 className="text-base text-ink-900 m-0 mb-3">{t('account.contactDetails')}</h2>
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
  );
}
