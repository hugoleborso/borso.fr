/** @Feature sketches */

import { SONG_TEXT_FIELD_MAX_LENGTH } from '@domain/input-limits.core';
import type { JSX } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { Badge } from '../../components/atoms/Badge';
import { ConfirmDialog } from '../../components/molecules/ConfirmDialog';
import { NotFoundNotice } from '../../components/molecules/NotFoundNotice';
import { PageHeader } from '../../components/molecules/PageHeader';
import { NameSheet } from '../../components/organisms/NameSheet';
import { SketchEditor } from '../../components/organisms/SketchEditor';
import { SketchHeaderActions } from '../../components/organisms/SketchHeaderActions';
import {
  useCatalogueComposition,
  useDeleteComposition,
  useRenameComposition,
} from '../../lib/queries/compositions.queries';
import { useInspirationsList } from '../../lib/queries/inspirations.queries';
import { useSketch } from '../../lib/queries/sketches.queries';

const NO_INSPIRATIONS: readonly never[] = [];

// @FollowsBlueprint route-detail-page
export function SketchPage(): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { compositionId } = useParams<{ compositionId: string }>();
  const sketchQuery = useSketch(compositionId ?? '', compositionId !== undefined);
  const inspirationsQuery = useInspirationsList();
  const rename = useRenameComposition();
  const remove = useDeleteComposition();
  const catalogue = useCatalogueComposition();
  const [isRenaming, setIsRenaming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const sketch = sketchQuery.data?.sketch ?? null;
  const inspirations = inspirationsQuery.data?.inspirations ?? NO_INSPIRATIONS;

  if (sketchQuery.isLoading || inspirationsQuery.isLoading) {
    return (
      <p className="px-4 sm:px-9 py-4 sm:py-7 text-ink-soft italic text-meta">
        {t('common.loading')}
      </p>
    );
  }
  if (sketch === null) {
    return (
      <NotFoundNotice
        message={t('sketch.notFound')}
        backTo="/compos"
        backLabel={t('compos.title')}
      />
    );
  }

  const { composition } = sketch;

  return (
    <section className="px-4 sm:px-9 py-4 sm:py-7 pb-20 max-w-[1280px]">
      <PageHeader
        back={{ to: '/compos', label: t('compos.title') }}
        crumb={t('sketch.title')}
        title={composition.title}
        subtitle={
          composition.songId === null ? null : (
            <Badge tone="accent">{t('compos.inCatalogue')}</Badge>
          )
        }
        actions={
          <SketchHeaderActions
            songId={composition.songId}
            isCataloguing={catalogue.isPending}
            isCatalogueFailed={catalogue.isError}
            onRename={() => setIsRenaming(true)}
            onCatalogue={() => catalogue.mutate({ id: composition.id })}
          />
        }
      />
      <SketchEditor sketch={sketch} inspirations={inspirations} />
      {isRenaming ? (
        <NameSheet
          sheetTitle={t('compos.rename')}
          fieldLabel={t('compos.titleField')}
          maxLength={SONG_TEXT_FIELD_MAX_LENGTH}
          initialName={composition.title}
          isNew={false}
          deleteLabel={t('compos.delete')}
          onSave={(title) => {
            rename.mutate({ id: composition.id, title });
            setIsRenaming(false);
          }}
          onDelete={() => {
            setIsRenaming(false);
            setIsDeleting(true);
          }}
          onClose={() => setIsRenaming(false)}
        />
      ) : null}
      {isDeleting ? (
        <ConfirmDialog
          question={t('compos.deleteConfirm')}
          confirmLabel={t('compos.delete')}
          onConfirm={() => {
            remove.mutate({ id: composition.id });
            setIsDeleting(false);
            void navigate('/compos');
          }}
          onCancel={() => setIsDeleting(false)}
        />
      ) : null}
    </section>
  );
}
