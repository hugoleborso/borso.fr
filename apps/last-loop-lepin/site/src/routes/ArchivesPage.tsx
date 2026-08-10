import { useTranslation } from 'react-i18next';
import { Card, CardBody } from '../components/atoms/Card';
import { Show } from '../components/atoms/Show';
import { CardHeader } from '../components/molecules/CardHeader';
import { ArchivedEditionCard } from '../components/organisms/ArchivedEditionCard';
import { listArchivedEditions } from '../components/organisms/spectator.core';
import { useEditionList } from '../lib/queries/editions';

/** Every edition already run, most recent first, with its result downloads. */
// @FollowsBlueprint route-list-page
export function ArchivesPage() {
  const { t, i18n } = useTranslation();
  const editionList = useEditionList();
  const archives = listArchivedEditions(editionList.data?.editions ?? []);

  return (
    <div className="main col">
      <Card>
        <CardHeader
          title={t('archives.title')}
          hint={
            <span className="muted mono">
              {t('archives.edition-count', { count: archives.length })}
            </span>
          }
        />
        <Show when={archives.length === 0}>
          <CardBody modifier="muted">{t('archives.empty')}</CardBody>
        </Show>
        {archives.map((edition) => (
          <ArchivedEditionCard key={edition.slug} edition={edition} locale={i18n.language} />
        ))}
      </Card>
    </div>
  );
}
