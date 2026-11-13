/** @Feature inspirations */

import type { JSX } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BottomActions } from '../../components/atoms/BottomActions';
import { Button } from '../../components/atoms/Button';
import { HintText } from '../../components/atoms/HintText';
import { ConfirmDialog } from '../../components/molecules/ConfirmDialog';
import { InspirationCard } from '../../components/molecules/InspirationCard';
import { PageHeader } from '../../components/molecules/PageHeader';
import { InspirationForm } from '../../components/organisms/InspirationForm';
import {
  type InspirationFormValues,
  startInspirationForm,
} from '../../components/organisms/inspiration-form.core';
import type { InspirationFieldsShape } from '../../lib/queries/inspiration-cache.core';
import {
  type InspirationRefusal,
  readInspirationRefusal,
} from '../../lib/queries/inspiration-refusal.core';
import {
  type InspirationRecord,
  useCreateInspiration,
  useDeleteInspiration,
  useInspirationsList,
  useUpdateInspiration,
} from '../../lib/queries/inspirations.queries';
import { useSignedInMember } from '../../lib/queries/me.queries';
import { projectInspirationCard, selectDeletionRefusalMessage } from './inspirations-page.core';

interface EditedInspiration {
  readonly inspirationId: string | null;
  readonly values: InspirationFormValues;
}

const NO_INSPIRATIONS: readonly InspirationRecord[] = [];
const NEW_INSPIRATION: EditedInspiration = {
  inspirationId: null,
  values: startInspirationForm(null),
};

// @FollowsBlueprint route-list-page
export function InspirationsPage(): JSX.Element {
  const { t } = useTranslation();
  const list = useInspirationsList();
  const signedInMember = useSignedInMember();
  const create = useCreateInspiration();
  const update = useUpdateInspiration();
  const remove = useDeleteInspiration();
  const [edited, setEdited] = useState<EditedInspiration | null>(null);
  const [pendingDeletionId, setPendingDeletionId] = useState<string | null>(null);
  const [deletionRefusal, setDeletionRefusal] = useState<InspirationRefusal | null>(null);

  const inspirations = list.data?.inspirations ?? NO_INSPIRATIONS;
  const deletionMessage =
    deletionRefusal === null ? null : selectDeletionRefusalMessage(deletionRefusal);

  const saveInspiration = async (fields: InspirationFieldsShape): Promise<void> => {
    const inspirationId = edited?.inspirationId ?? null;
    if (inspirationId === null) {
      await create.mutateAsync({
        inspiration: { id: crypto.randomUUID(), ...fields },
        author: signedInMember.data ?? null,
      });
    } else {
      await update.mutateAsync({ id: inspirationId, changes: fields });
    }
    setEdited(null);
  };

  const editInspiration = (inspiration: InspirationRecord): void => {
    setEdited({ inspirationId: inspiration.id, values: startInspirationForm(inspiration) });
  };

  const deleteInspiration = (inspirationId: string): void => {
    setDeletionRefusal(null);
    remove.mutate(
      { id: inspirationId },
      { onError: (error) => setDeletionRefusal(readInspirationRefusal(error)) },
    );
  };

  return (
    <section className="px-4 sm:px-9 py-4 sm:py-7 pb-20 max-w-[960px]">
      <PageHeader back={{ to: '/band', label: t('band.title') }} title={t('inspirations.title')} />
      {deletionMessage === null ? null : (
        <HintText tone="danger" role="alert">
          {t(deletionMessage.key, { sketches: deletionMessage.sketchTitles })}
        </HintText>
      )}
      {list.isLoading ? <HintText tone="muted">{t('common.loading')}</HintText> : null}
      {list.isLoading || inspirations.length > 0 ? null : (
        <HintText tone="muted">{t('inspirations.empty')}</HintText>
      )}
      <ul className="m-0 flex list-none flex-col gap-2 p-0" aria-label={t('inspirations.title')}>
        {inspirations.map((inspiration) => (
          <li key={inspiration.id}>
            <InspirationCard
              card={projectInspirationCard(inspiration)}
              onEdit={() => editInspiration(inspiration)}
              onDelete={() => setPendingDeletionId(inspiration.id)}
            />
          </li>
        ))}
      </ul>
      {edited === null ? null : (
        <InspirationForm
          key={edited.inspirationId ?? 'new'}
          isNew={edited.inspirationId === null}
          initialValues={edited.values}
          onSave={saveInspiration}
          onClose={() => setEdited(null)}
        />
      )}
      {pendingDeletionId === null ? null : (
        <ConfirmDialog
          question={t('inspirations.deleteConfirm')}
          confirmLabel={t('common.delete')}
          onConfirm={() => {
            deleteInspiration(pendingDeletionId);
            setPendingDeletionId(null);
          }}
          onCancel={() => setPendingDeletionId(null)}
        />
      )}
      <BottomActions>
        <Button variant="primary" size="lg" icon="plus" onClick={() => setEdited(NEW_INSPIRATION)}>
          {t('inspirations.new')}
        </Button>
      </BottomActions>
    </section>
  );
}
