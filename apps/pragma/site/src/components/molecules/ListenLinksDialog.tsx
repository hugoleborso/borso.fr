/** @Feature songs */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import {
  type ListenSubject,
  type ListenTarget,
  selectListenTargets,
} from '../../lib/listen-links.utils';
import { BrandLogo } from '../atoms/BrandLogo';
import { Sheet } from './Sheet';

export interface ListenLinksDialogProps {
  readonly subject: ListenSubject;
  readonly onClose: () => void;
}

const PROVIDER_LABEL_KEYS = {
  deezer: 'catalog.listenOnDeezer',
  spotify: 'catalog.listenOnSpotify',
} as const;

function targetHintKey(
  target: ListenTarget,
): 'catalog.listenOpensTrack' | 'catalog.listenOpensSearch' {
  return target.isExact ? 'catalog.listenOpensTrack' : 'catalog.listenOpensSearch';
}

// @FollowsBlueprint molecule-presentational
export function ListenLinksDialog({ subject, onClose }: ListenLinksDialogProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <Sheet title={subject.title} label={subject.title} isTitleARecordName onClose={onClose}>
      <div className="flex flex-col gap-3">
        {subject.artist.length > 0 ? (
          <p className="m-0 text-meta text-ink-soft">{subject.artist}</p>
        ) : null}
        <ul className="flex flex-col gap-2 list-none p-0 m-0">
          {selectListenTargets(subject).map((target) => (
            <li key={target.provider}>
              <a
                href={target.address}
                target="_blank"
                rel="noreferrer noopener"
                onClick={onClose}
                className="flex min-h-11 items-center gap-3 rounded-md px-3 py-2.5 text-body text-ink no-underline hover:bg-hover"
              >
                <BrandLogo brand={target.provider} size={20} />
                <span className="flex-1">{t(PROVIDER_LABEL_KEYS[target.provider])}</span>
                <span className="text-meta text-ink-soft">{t(targetHintKey(target))}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </Sheet>
  );
}
