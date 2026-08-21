import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatHourMinute } from '../../lib/formatters.utils';
import { selectLabel } from '../../lib/label.utils';
import { useRunnerPunches, useVoidPunch } from '../../lib/queries/punches';
import { useRunnerRoster } from '../../lib/queries/runners';
import type { RaceEditionDto, RunnerDto } from '../../lib/race.types';
import { recordAnalyticsEvent } from '../../observability/sentry';
import { Button } from '../atoms/Button';
import { Card, CardBody } from '../atoms/Card';
import { ErrorText } from '../atoms/ErrorText';
import { Pill } from '../atoms/Pill';
import { Show } from '../atoms/Show';
import { CardHeader } from '../atoms/CardHeader';
import { type AdminErrorMessage, selectPunchError } from './admin-errors.core';
import { countValidPunches } from './runner-loop-history.core';
import { selectPunchTone, selectToggledRunner } from './correction-panel.core';
import { RUNNER_ROW_CLASS, RUNNER_ROW_RANK_CLASS } from './leaderboard.utils';

interface CorrectionPanelProps {
  readonly edition: RaceEditionDto;
}

interface RunnerPunchesProps {
  readonly runner: RunnerDto;
  readonly editionSlug: string;
  readonly isOpen: boolean;
  readonly onToggle: () => void;
  readonly onFailure: (failure: AdminErrorMessage) => void;
}

function RunnerPunches({ runner, editionSlug, isOpen, onToggle, onFailure }: RunnerPunchesProps) {
  const { t } = useTranslation();
  const punches = useRunnerPunches(editionSlug, runner.slug);
  const voidPunch = useVoidPunch();
  const rows = punches.data?.punches ?? [];

  function cancelPunch(punchId: string): void {
    voidPunch.mutate(
      { punchId, editionSlug, runnerSlug: runner.slug },
      {
        onSuccess: () => {
          recordAnalyticsEvent('correction_applied', { editionSlug, punchId });
        },
        onError: (error: unknown) => {
          onFailure(selectPunchError(error, runner.displayName));
        },
      },
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Button onClick={onToggle} justify="between">
        <span>{runner.displayName}</span>
        <span className="font-mono tabular-nums text-ink-3">
          {t('admin.corrections.loop-count', { count: countValidPunches(rows) })}
        </span>
      </Button>
      <Show when={isOpen}>
        <ul>
          <Show when={rows.length === 0}>
            <li className="py-1.5 text-ink-3">{t('admin.corrections.no-punch')}</li>
          </Show>
          {rows.map((punch) => (
            <li key={punch.id} className={RUNNER_ROW_CLASS}>
              <span className={RUNNER_ROW_RANK_CLASS}>
                {t('common.loop-short', { loop: punch.loopIndex })}
              </span>
              <span className="font-mono tabular-nums text-ink-3">
                {formatHourMinute(new Date(punch.finishedAt))}
              </span>
              <Pill tone={selectPunchTone(punch.voidedAt)}>
                {t(
                  selectLabel(
                    punch.voidedAt === null,
                    'admin.corrections.valid',
                    'admin.corrections.voided',
                  ),
                )}
              </Pill>
              <Show when={punch.voidedAt === null}>
                <Button
                  variant="danger"
                  size="small"
                  onClick={() => {
                    cancelPunch(punch.id);
                  }}
                  disabled={voidPunch.isPending}
                >
                  {t('admin.corrections.void-action')}
                </Button>
              </Show>
              <Show when={punch.voidedAt !== null}>
                <span className="font-mono tabular-nums text-ink-3">{t('common.empty-value')}</span>
              </Show>
            </li>
          ))}
        </ul>
      </Show>
    </div>
  );
}

// @FollowsBlueprint organism-query-owning
export function CorrectionPanel({ edition }: CorrectionPanelProps) {
  const { t } = useTranslation();
  const roster = useRunnerRoster(edition.slug);
  const [openRunnerSlug, setOpenRunnerSlug] = useState<string | null>(null);
  const [failure, setFailure] = useState<AdminErrorMessage | null>(null);
  const runners = roster.data?.runners ?? [];

  return (
    <Card>
      <CardHeader
        title={t('admin.corrections.title')}
        hint={
          <span className="font-mono tabular-nums text-ink-3">{t('admin.corrections.hint')}</span>
        }
      />
      <CardBody className="flex flex-col gap-3">
        <Show when={failure !== null}>
          <ErrorText>{t(failure?.key ?? 'common.error-detail', failure?.parameters)}</ErrorText>
        </Show>
        <Show when={runners.length === 0}>
          <div className="text-ink-3">{t('admin.corrections.empty')}</div>
        </Show>
        {runners.map((runner) => (
          <RunnerPunches
            key={runner.slug}
            runner={runner}
            editionSlug={edition.slug}
            isOpen={openRunnerSlug === runner.slug}
            onToggle={() => {
              setOpenRunnerSlug((current) => selectToggledRunner(current, runner.slug));
            }}
            onFailure={setFailure}
          />
        ))}
      </CardBody>
    </Card>
  );
}
