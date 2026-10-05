import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../atoms/Card';
import { Icon } from '../atoms/Icon';

// @FollowsBlueprint molecule-presentational
export function InstallHint(): JSX.Element {
  const { t } = useTranslation();
  return (
    <Card>
      <p className="m-0 text-heading text-ink">{t('today.install.title')}</p>
      <p className="m-0 mt-1 text-body-sm text-ink-soft">{t('today.install.body')}</p>
      <ol className="m-0 mt-3 p-0 list-none flex flex-col gap-2 text-body-sm text-ink">
        <li className="flex items-center gap-3">
          <Icon name="share" size={20} className="text-patina" />
          {t('today.install.step-share')}
        </li>
        <li className="flex items-center gap-3">
          <Icon name="square-plus" size={20} className="text-patina" />
          {t('today.install.step-add')}
        </li>
        <li className="flex items-center gap-3">
          <img src="/icons/icon-192.png" alt="" width={20} height={20} className="rounded-sm" />
          {t('today.install.step-open')}
        </li>
      </ol>
    </Card>
  );
}
