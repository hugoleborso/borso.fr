/** @Feature compositions */

import { SONG_TEXT_FIELD_MAX_LENGTH } from '@domain/input-limits.core';
import type { JSX } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { BottomActions } from '../../components/atoms/BottomActions';
import { Button } from '../../components/atoms/Button';
import { HintText } from '../../components/atoms/HintText';
import { PageHeader } from '../../components/molecules/PageHeader';
import { CompositionList } from '../../components/organisms/CompositionList';
import { NameSheet } from '../../components/organisms/NameSheet';
import {
  type CompositionRecord,
  useCompositions,
  useCreateComposition,
} from '../../lib/queries/compositions.queries';
import { COMPOSITION_NUMBER_SLOT, selectNextCompositionNumber } from './compositions-page.core';

const NO_COMPOSITIONS: readonly CompositionRecord[] = [];

// @FollowsBlueprint route-list-page
export function CompositionsPage(): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const list = useCompositions();
  const create = useCreateComposition();
  const [isCreating, setIsCreating] = useState(false);

  const compositions = list.data?.compositions ?? NO_COMPOSITIONS;
  const nextTitle = t('compos.defaultTitle', {
    number: selectNextCompositionNumber(
      compositions.map((composition) => composition.title),
      t('compos.defaultTitle', { number: COMPOSITION_NUMBER_SLOT }),
    ),
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
      <CompositionList compositions={compositions} />
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
