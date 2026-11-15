/** @Feature band */

import { type JSX, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../atoms/Icon';
import { IconButton } from '../atoms/IconButton';
import { ConfirmDialog } from '../molecules/ConfirmDialog';
import {
  type BandLinkRecord,
  useAddBandLink,
  useBandLinks,
  useDeleteBandLink,
} from '../../lib/queries/band-links.queries';
import type { BandLinkFormValues } from './band-link-form.core';
import { readAddressHost } from './band-link-form.core';
import { BandLinkFormSheet } from './BandLinkFormSheet';

const ROW_LINK_CLASS =
  'flex min-h-11 min-w-0 flex-1 items-center gap-3 py-3 text-body text-ink no-underline ' +
  'hover:bg-hover focus-visible:outline-3 focus-visible:outline-focus';
const NO_LINKS: readonly BandLinkRecord[] = [];

// @FollowsBlueprint organism-query-owning
export function BandLinksSection(): JSX.Element {
  const { t } = useTranslation();
  const list = useBandLinks();
  const add = useAddBandLink();
  const remove = useDeleteBandLink();
  const [isAdding, setIsAdding] = useState(false);
  const [linkToDelete, setLinkToDelete] = useState<BandLinkRecord | null>(null);
  const bandLinks = list.data?.bandLinks ?? NO_LINKS;
  const hasFailed = list.isError || remove.isError;

  const saveLink = async (values: BandLinkFormValues): Promise<void> => {
    await add.mutateAsync({ id: crypto.randomUUID(), ...values });
    setIsAdding(false);
  };

  return (
    <section className="mt-6 sm:mt-8" aria-labelledby="band-links-title">
      <div className="flex items-center justify-between gap-3">
        <h2 id="band-links-title" className="m-0 font-sans text-heading text-ink">
          {t('bandLinks.title')}
        </h2>
        <IconButton
          icon="plus"
          variant="secondary"
          label={t('bandLinks.add')}
          onClick={() => setIsAdding(true)}
        />
      </div>
      {hasFailed ? (
        <p className="m-0 text-meta text-danger" role="alert">
          {t('bandLinks.failed')}
        </p>
      ) : null}
      <ul className="m-0 list-none divide-y divide-rule p-0" aria-label={t('bandLinks.title')}>
        {bandLinks.map((bandLink) => (
          <li key={bandLink.id} className="flex items-center gap-2">
            <a
              href={bandLink.url}
              target="_blank"
              rel="noopener noreferrer"
              className={ROW_LINK_CLASS}
            >
              <Icon name="link" className="text-accent" />
              <span className="flex min-w-0 flex-col">
                <span className="truncate">{bandLink.label}</span>
                <span className="truncate text-meta text-ink-soft">
                  {readAddressHost(bandLink.url)}
                </span>
              </span>
              <Icon name="external" className="ml-auto shrink-0 text-ink-faint" />
            </a>
            <IconButton
              icon="trash"
              variant="danger"
              label={t('bandLinks.delete')}
              onClick={() => setLinkToDelete(bandLink)}
            />
          </li>
        ))}
      </ul>
      {isAdding ? <BandLinkFormSheet onSave={saveLink} onClose={() => setIsAdding(false)} /> : null}
      {linkToDelete === null ? null : (
        <ConfirmDialog
          question={t('bandLinks.deleteConfirm', { label: linkToDelete.label })}
          confirmLabel={t('bandLinks.delete')}
          onConfirm={() => {
            remove.mutate({ id: linkToDelete.id });
            setLinkToDelete(null);
          }}
          onCancel={() => setLinkToDelete(null)}
        />
      )}
    </section>
  );
}
