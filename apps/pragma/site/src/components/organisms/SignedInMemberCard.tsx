/** @Feature auth */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { useSignedInMember } from '../../lib/queries/me.queries';
import { Card } from '../atoms/Card';

// @FollowsBlueprint organism-query-owning
export function SignedInMemberCard(): JSX.Element {
  const { t } = useTranslation();
  const member = useSignedInMember();
  return (
    <Card className="p-4 sm:p-6">
      <p className="text-label tracking-wider uppercase text-ink-soft">{t('account.signedInAs')}</p>
      <p className="text-title text-ink m-0">
        {member.data?.firstName ?? '—'} ({member.data?.username ?? '—'})
      </p>
    </Card>
  );
}
