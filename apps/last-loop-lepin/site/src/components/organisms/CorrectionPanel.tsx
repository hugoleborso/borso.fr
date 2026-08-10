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
import { CardHeader } from '../molecules/CardHeader';
import { type AdminErrorMessage, selectPunchError } from './admin-errors.core';
import { countValidPunches } from './runner-loop-history.core';
import { selectPunchTone, selectToggledRunner } from './correction-panel.core';

const ROW_STYLE = { gap: 'var(--d-2)' } as const;
const TOGGLE_STYLE = { justifyContent: 'space-between' } as const;
const LIST_STYLE = { listStyle: 'none', padding: 0, margin: 0 } as const;
const EMPTY_ROW_STYLE = { padding: '6px 0' } as const;

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
    <div className="col" style={ROW_STYLE}>
      <Button onClick={onToggle} style={TOGGLE_STYLE}>
        <span>{runner.displayName}</span>
        <span className="muted mono">
          {t('admin.corrections.loop-count', { count: countValidPunches(rows) })}
        </span>
      </Button>
      <Show when={isOpen}>
        <ul style={LIST_STYLE}>
          <Show when={rows.length === 0}>
            <li className="muted" style={EMPTY_ROW_STYLE}>
              {t('admin.corrections.no-punch')}
            </li>
          </Show>
          {rows.map((punch) => (
            <li key={punch.id} className="leaderboard-row">
              <span className="rank mono">{t('common.loop-short', { loop: punch.loopIndex })}</span>
              <span className="muted mono">{formatHourMinute(new Date(punch.finishedAt))}</span>
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
                <span className="muted mono">{t('common.empty-value')}</span>
              </Show>
            </li>
          ))}
        </ul>
      </Show>
    </div>
  );
}

/** Cancelling a punch the organiser recorded by mistake, runner by runner. */
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
        hint={<span className="muted mono">{t('admin.corrections.hint')}</span>}
      />
      <CardBody modifier="col">
        <Show when={failure !== null}>
          <ErrorText>{t(failure?.key ?? 'common.error-detail', failure?.parameters)}</ErrorText>
        </Show>
        <Show when={runners.length === 0}>
          <div className="muted">{t('admin.corrections.empty')}</div>
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
