/** @Feature songs */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { openDismissibleDialogOnAttach } from '../../lib/modal-dialog.adapter';
import {
  type ListenSubject,
  type ListenTarget,
  selectListenTargets,
} from '../../lib/listen-links.utils';
import { Button } from '../atoms/Button';
import { Icon } from '../atoms/Icon';

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
    <dialog
      ref={openDismissibleDialogOnAttach}
      onClose={onClose}
      className="m-auto w-[calc(100vw-2rem)] sm:w-[26rem] max-w-[26rem] rounded-lg border border-line bg-bg-elev p-0 backdrop:bg-ink-900/40"
    >
      <div className="p-4 flex flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-sm font-medium text-ink-900 m-0">{subject.title}</h2>
          {subject.artist.length > 0 ? (
            <p className="text-xs text-ink-500 m-0">{subject.artist}</p>
          ) : null}
        </div>
        <ul className="flex flex-col gap-2 list-none p-0 m-0">
          {selectListenTargets(subject).map((target) => (
            <li key={target.provider}>
              <a
                href={target.address}
                target="_blank"
                rel="noreferrer noopener"
                onClick={onClose}
                className="flex items-center gap-3 rounded-md border border-line px-3 py-2.5 text-sm text-ink-900 hover:border-line-strong hover:bg-bg"
              >
                <Icon name={target.provider} />
                <span className="flex-1">{t(PROVIDER_LABEL_KEYS[target.provider])}</span>
                <span className="text-xs text-ink-400">{t(targetHintKey(target))}</span>
              </a>
            </li>
          ))}
        </ul>
        <div className="flex justify-end">
          <Button type="button" variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
