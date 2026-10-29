/** @Feature band */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Icon } from '../../components/atoms/Icon';
import { PageHeader } from '../../components/molecules/PageHeader';
import { BAND_DESTINATIONS } from './band-destinations.core';

const ROW_CLASS =
  'flex min-h-11 items-center gap-3 py-3 text-body text-ink no-underline hover:bg-hover ' +
  'focus-visible:outline-3 focus-visible:outline-focus';

// @FollowsBlueprint route-list-page
export function BandPage(): JSX.Element {
  const { t } = useTranslation();

  return (
    <section className="px-4 sm:px-9 py-4 sm:py-7 max-w-[960px]">
      <PageHeader title={t('band.title')} />
      <nav aria-label={t('band.linksLabel')}>
        <ul className="m-0 list-none divide-y divide-rule p-0">
          {BAND_DESTINATIONS.map((destination) => (
            <li key={destination.to}>
              <Link to={destination.to} className={ROW_CLASS}>
                <Icon name={destination.icon} className="text-accent" />
                {t(destination.labelKey)}
                <Icon name="chevR" className="ml-auto text-ink-faint" />
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </section>
  );
}
