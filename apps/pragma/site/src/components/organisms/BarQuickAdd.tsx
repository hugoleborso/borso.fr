/** @Feature bars */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { useCreateBar } from '../../lib/queries/bars.queries';
import { QuickAddForm } from './QuickAddForm';

export interface BarQuickAddProps {
  readonly onError: (error: Error) => void;
}

// @FollowsBlueprint organism-query-owning
export function BarQuickAdd({ onError }: BarQuickAddProps): JSX.Element {
  const { t } = useTranslation();
  const createBar = useCreateBar();
  return (
    <QuickAddForm
      inputId="bar-quick-add"
      label={t('bars.quickAddLabel')}
      submitLabel={t('bars.quickAddSubmit')}
      onAdd={async (name) => {
        await createBar.mutateAsync({ name, status: 'lead' }, { onError });
      }}
    />
  );
}
