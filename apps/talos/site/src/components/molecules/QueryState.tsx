import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../atoms/Button';
import { Notice } from '../atoms/Notice';
import { Spinner } from '../atoms/Spinner';

export interface QueryStateProps {
  readonly isPending: boolean;
  readonly onRetry: () => void;
}

// @FollowsBlueprint molecule-presentational
export function QueryState({ isPending, onRetry }: QueryStateProps): JSX.Element {
  const { t } = useTranslation();
  return isPending ? (
    <div className="py-6 flex justify-center">
      <Spinner label={t('common.loading')} />
    </div>
  ) : (
    <div className="flex flex-col gap-2 items-start">
      <Notice tone="danger">{t('common.error')}</Notice>
      <Button size="sm" onClick={onRetry}>
        {t('common.retry')}
      </Button>
    </div>
  );
}
