import { useTranslation } from 'react-i18next';
import { Card, CardBody } from '../components/atoms/Card';
import { Show } from '../components/atoms/Show';
import { CardHeader } from '../components/atoms/CardHeader';
import { ArchivedEditionCard } from '../components/organisms/ArchivedEditionCard';
import { listArchivedEditions } from '../components/organisms/spectator.core';
import { useEditionList } from '../lib/queries/editions';

// @FollowsBlueprint route-list-page
export function ArchivesPage() {
  const { t, i18n } = useTranslation();
  const editionList = useEditionList();
  const archives = listArchivedEditions(editionList.data?.editions ?? []);

  return (
    <div className="flex flex-col gap-3 p-6 min-h-0">
      <Card>
        <CardHeader
          title={t('archives.title')}
          hint={
            <span className="font-mono tabular-nums text-ink-3">
              {t('archives.edition-count', { count: archives.length })}
            </span>
          }
        />
        <Show when={archives.length === 0}>
          <CardBody className="text-ink-3">{t('archives.empty')}</CardBody>
        </Show>
        {archives.map((edition) => (
          <ArchivedEditionCard key={edition.slug} edition={edition} locale={i18n.language} />
        ))}
      </Card>
    </div>
  );
}
