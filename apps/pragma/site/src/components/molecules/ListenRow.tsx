/** @Feature songs */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import type { SongListenLink, SongListenProvider } from '../../lib/listen-links.utils';
import { BrandLogo } from '../atoms/BrandLogo';
import { ButtonAnchor } from '../atoms/ButtonAnchor';
import { Icon } from '../atoms/Icon';

export interface ListenRowProps {
  readonly links: readonly SongListenLink[];
}

const PROVIDER_LABEL_KEY = {
  deezer: 'catalog.listenDeezer',
  spotify: 'catalog.listenSpotify',
  youtube: 'catalog.listenYoutube',
  other: 'catalog.listenOther',
} as const satisfies Readonly<Record<SongListenProvider, string>>;

function ProviderMark({ provider }: { readonly provider: SongListenProvider }): JSX.Element {
  if (provider === 'other') return <Icon name="external" size="sm" />;
  return <BrandLogo brand={provider} size={18} />;
}

// @FollowsBlueprint molecule-presentational
export function ListenRow({ links }: ListenRowProps): JSX.Element | null {
  const { t } = useTranslation();
  if (links.length === 0) return null;
  return (
    <ul aria-label={t('catalog.listenTitle')} className="m-0 flex list-none flex-wrap gap-2 p-0">
      {links.map((link) => (
        <li key={link.address}>
          <ButtonAnchor
            href={link.address}
            variant="secondary"
            size="sm"
            mark={<ProviderMark provider={link.provider} />}
          >
            {t(PROVIDER_LABEL_KEY[link.provider])}
          </ButtonAnchor>
        </li>
      ))}
    </ul>
  );
}
