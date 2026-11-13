import { type JSX, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../atoms/Card';
import { PageTitle } from '../atoms/PageTitle';
import { BackLink } from '../molecules/BackLink';
import { EmptyState } from '../molecules/EmptyState';
import { QueryState } from '../molecules/QueryState';
import { selectClaudeCodeLinkTarget } from '../../lib/claude-code-address.core';
import { detectClaudeCodeOpener } from '../../lib/claude-code-opener.adapter';
import { useRoutineRuns } from '../../lib/queries/routine.queries';
import { measureAge } from '../../lib/relative-age.utils';
import { selectTriggerLabelKey } from '../../lib/routine-run.core';
import { selectAgeLabelKey } from './scan-status.core';

// @FollowsBlueprint organism-query-owning
export function RoutineRunBoard(): JSX.Element {
  const { t } = useTranslation();
  const runs = useRoutineRuns();
  const [now] = useState(() => Date.now());
  const linkTarget = selectClaudeCodeLinkTarget(detectClaudeCodeOpener());
  return (
    <>
      <BackLink to="/" label={t('common.back')} />
      <PageTitle>{t('runs.title')}</PageTitle>
      {runs.data === undefined ? (
        <QueryState isPending={runs.isPending} onRetry={() => void runs.refetch()} />
      ) : (
        <Card padding="none">
          {runs.data.items.length === 0 ? <EmptyState icon="send" label={t('runs.empty')} /> : null}
          <ul className="m-0 px-3 list-none">
            {runs.data.items.map((run) => {
              const age = measureAge(run.firedAt, now);
              return (
                <li
                  key={run.id}
                  className="flex items-center gap-2 min-h-13 border-b border-line last:border-b-0"
                >
                  <span className="min-w-0 flex-1 py-2">
                    <span className="block text-caption text-ink-muted tabular-nums">
                      {t(selectTriggerLabelKey(run.trigger))} ·{' '}
                      {age === null
                        ? t('age.never')
                        : t(selectAgeLabelKey(age.unit), { count: age.value })}
                    </span>
                    <span className="text-body-sm text-ink line-clamp-2 break-words">
                      {run.subject}
                    </span>
                  </span>
                  {run.sessionUrl === null ? null : (
                    <a
                      href={run.sessionUrl}
                      target={linkTarget}
                      rel="noopener"
                      className="shrink-0 inline-flex items-center min-h-11 px-2 text-body-sm font-semibold text-bronze underline underline-offset-2"
                    >
                      {t('runs.open')}
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </>
  );
}
