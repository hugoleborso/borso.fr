import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../atoms/Card';
import { Icon } from '../atoms/Icon';

// @FollowsBlueprint molecule-presentational
export function InstallHint(): JSX.Element {
  const { t } = useTranslation();
  return (
    <Card padding="none">
      <ol
        aria-label={t('today.install.title')}
        className="m-0 px-4 py-3 list-none flex items-center justify-center gap-3 text-patina"
      >
        <li className="flex items-center">
          <Icon name="share" size={22} />
          <span className="sr-only">{t('today.install.step-share')}</span>
        </li>
        <li aria-hidden="true" className="text-ink-faint">
          <Icon name="chevron" size={16} />
        </li>
        <li className="flex items-center">
          <Icon name="square-plus" size={22} />
          <span className="sr-only">{t('today.install.step-add')}</span>
        </li>
        <li aria-hidden="true" className="text-ink-faint">
          <Icon name="chevron" size={16} />
        </li>
        <li className="flex items-center">
          <img src="/icons/icon-192.png" alt="" width={22} height={22} className="rounded-sm" />
          <span className="sr-only">{t('today.install.step-open')}</span>
        </li>
      </ol>
    </Card>
  );
}
