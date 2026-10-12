import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { Icon } from '../atoms/Icon';
import { SectionTitle } from '../atoms/SectionTitle';
import { useSignOut } from '../../lib/queries/session.queries';

// @FollowsBlueprint organism-mutation-panel
export function SessionSettings(): JSX.Element {
  const { t } = useTranslation();
  const signOut = useSignOut();
  return (
    <Card>
      <SectionTitle>{t('settings.session.title')}</SectionTitle>
      <Button
        variant="danger"
        className="w-full"
        disabled={signOut.isPending}
        onClick={() => signOut.mutate()}
      >
        <Icon name="sign-out" size={18} />
        {t('settings.sign-out')}
      </Button>
    </Card>
  );
}
