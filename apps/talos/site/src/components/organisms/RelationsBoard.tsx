import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Card } from '../atoms/Card';
import { Chip } from '../atoms/Chip';
import { ClosenessDot } from '../atoms/ClosenessDot';
import { Icon } from '../atoms/Icon';
import { PageTitle } from '../atoms/PageTitle';
import { SectionTitle } from '../atoms/SectionTitle';
import { BackLink } from '../molecules/BackLink';
import { EmptyState } from '../molecules/EmptyState';
import { PersonRow } from '../molecules/PersonRow';
import { QueryState } from '../molecules/QueryState';
import { openActionSheet } from '../../lib/action-sheet.hook';
import { useRelations } from '../../lib/queries/relations.queries';
import { buildPageHref } from '../../lib/wikilinks.core';
import { BirthdayList } from './BirthdayList';
import { selectCloseness } from './relations-board.core';

// @FollowsBlueprint organism-query-owning
export function RelationsBoard(): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const relations = useRelations();
  return (
    <>
      <BackLink to="/" label={t('common.back')} />
      <PageTitle>{t('relations.title')}</PageTitle>
      {relations.data === undefined ? (
        <QueryState isPending={relations.isPending} onRetry={() => void relations.refetch()} />
      ) : (
        <div className="flex flex-col gap-5">
          <section>
            <SectionTitle trailing={<Icon name="cake" size={18} className="text-ink-muted" />}>
              {t('relations.birthdays')}
            </SectionTitle>
            <Card padding="none" className="px-1">
              <BirthdayList birthdays={relations.data.birthdays} />
              {relations.data.birthdays.length === 0 ? (
                <EmptyState icon="cake" label={t('relations.empty')} />
              ) : null}
            </Card>
          </section>
          <section>
            <SectionTitle trailing={<Icon name="users" size={18} className="text-ink-muted" />}>
              {t('relations.reconnect')}
            </SectionTitle>
            <Card padding="none" className="px-1">
              <ul className="m-0 p-0 list-none">
                {relations.data.toReconnect.map((person) => {
                  const href = buildPageHref(person.page);
                  const closeness = selectCloseness(person.closeness);
                  return (
                    <PersonRow
                      key={person.page}
                      href={href}
                      title={person.title}
                      icon="users"
                      leading={
                        <ClosenessDot
                          level={closeness.level}
                          label={t('relations.closeness', { level: closeness.rank })}
                        />
                      }
                      trailing={
                        <Chip tone="neutral">
                          <Icon name="clock" size={13} />
                          {t('relations.silence', { count: person.silentDays })}
                        </Chip>
                      }
                      onLongPress={() => {
                        openActionSheet({
                          title: person.title,
                          subject: { kind: 'page', path: person.page },
                          request: t('relations.discuss.reconnect'),
                          actions: [
                            {
                              labelKey: 'discuss.action.open',
                              icon: 'open',
                              onSelect: () => void navigate(href),
                            },
                          ],
                        });
                      }}
                    />
                  );
                })}
              </ul>
              {relations.data.toReconnect.length === 0 ? (
                <EmptyState icon="users" label={t('relations.empty')} />
              ) : null}
            </Card>
          </section>
        </div>
      )}
    </>
  );
}
