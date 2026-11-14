/** @Feature compositions */

import { SONG_TEXT_FIELD_MAX_LENGTH } from '@domain/input-limits.core';
import type { JSX } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { Badge } from '../../components/atoms/Badge';
import { BottomActions } from '../../components/atoms/BottomActions';
import { Button } from '../../components/atoms/Button';
import { HintText } from '../../components/atoms/HintText';
import { Icon } from '../../components/atoms/Icon';
import { PageHeader } from '../../components/molecules/PageHeader';
import { NameSheet } from '../../components/organisms/NameSheet';
import {
  type CompositionRecord,
  useCompositions,
  useCreateComposition,
} from '../../lib/queries/compositions.queries';
import { selectNextCompositionNumber } from './compositions-page.core';

const NO_COMPOSITIONS: readonly CompositionRecord[] = [];

const ROW_CLASS =
  'flex min-h-11 items-center gap-3 rounded-md border border-rule bg-leaf px-3 py-2 text-ink ' +
  'no-underline transition-colors hover:border-rule-strong focus-visible:outline-3 focus-visible:outline-focus';

// @FollowsBlueprint route-list-page
export function CompositionsPage(): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const list = useCompositions();
  const create = useCreateComposition();
  const [isCreating, setIsCreating] = useState(false);

  const compositions = list.data?.compositions ?? NO_COMPOSITIONS;
  const nextTitle = t('compos.defaultTitle', {
    number: selectNextCompositionNumber(compositions),
  });

  const createComposition = (title: string): void => {
    const id = crypto.randomUUID();
    setIsCreating(false);
    create.mutate({ id, title }, { onSuccess: () => void navigate(`/compos/${id}/sketch`) });
  };

  return (
    <section className="px-4 sm:px-9 py-4 sm:py-7 pb-20 max-w-[960px]">
      <PageHeader back={{ to: '/band', label: t('band.title') }} title={t('compos.title')} />
      {create.isError ? (
        <HintText tone="danger" role="alert">
          {t('compos.createFailed')}
        </HintText>
      ) : null}
      {list.isLoading ? <HintText tone="muted">{t('common.loading')}</HintText> : null}
      {list.isLoading || compositions.length > 0 ? null : (
        <HintText tone="muted">{t('compos.empty')}</HintText>
      )}
      <ul className="m-0 flex list-none flex-col gap-1.5 p-0" aria-label={t('compos.title')}>
        {compositions.map((composition) => (
          <li key={composition.id}>
            <Link to={`/compos/${composition.id}/sketch`} className={ROW_CLASS}>
              <span className="min-w-0 flex-1 truncate text-body">{composition.title}</span>
              {composition.songId === null ? null : (
                <Badge tone="accent">{t('compos.inCatalogue')}</Badge>
              )}
              <Icon name="compos" size="sm" />
            </Link>
          </li>
        ))}
      </ul>
      {isCreating ? (
        <NameSheet
          sheetTitle={t('compos.new')}
          fieldLabel={t('compos.titleField')}
          maxLength={SONG_TEXT_FIELD_MAX_LENGTH}
          initialName={nextTitle}
          isNew
          deleteLabel={t('compos.delete')}
          onSave={createComposition}
          onDelete={() => setIsCreating(false)}
          onClose={() => setIsCreating(false)}
        />
      ) : null}
      <BottomActions>
        <Button variant="primary" size="lg" icon="plus" onClick={() => setIsCreating(true)}>
          {t('compos.new')}
        </Button>
      </BottomActions>
    </section>
  );
}
