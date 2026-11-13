/** @Feature sketches */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { NotFoundNotice } from '../../components/molecules/NotFoundNotice';
import { PageHeader } from '../../components/molecules/PageHeader';
import { SketchEditor } from '../../components/organisms/SketchEditor';
import { useInspirationsList } from '../../lib/queries/inspirations.queries';
import { useSketch } from '../../lib/queries/sketches.queries';
import { useSong } from '../../lib/queries/songs.queries';

const NO_INSPIRATIONS: readonly never[] = [];

// @FollowsBlueprint route-detail-page
export function SketchPage(): JSX.Element {
  const { t } = useTranslation();
  const { songId } = useParams<{ songId: string }>();
  const sketchQuery = useSketch(songId ?? '', songId !== undefined);
  const songQuery = useSong(songId ?? '', songId !== undefined);
  const inspirationsQuery = useInspirationsList();

  const sketch = sketchQuery.data?.sketch ?? null;
  const songTitle =
    songQuery.data !== undefined && 'song' in songQuery.data
      ? songQuery.data.song.title
      : t('sketch.title');
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

  return (
    <section className="px-4 sm:px-9 py-4 sm:py-7 pb-20 max-w-[1280px]">
      <PageHeader
        back={{ to: '/compos', label: t('compos.title') }}
        crumb={t('sketch.title')}
        title={songTitle}
      />
      <SketchEditor sketch={sketch} inspirations={inspirations} />
    </section>
  );
}
