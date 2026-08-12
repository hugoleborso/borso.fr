import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { initialsAvatar } from '../../lib/initials.utils';
import { listWhen } from '../../lib/optional.utils';
import { useCatchupPunch, useRecordDidNotFinish } from '../../lib/queries/punches';
import type { RaceEditionDto, RankedRunnerDto } from '../../lib/race.types';
import { recordAnalyticsEvent } from '../../observability/sentry';
import { Button } from '../atoms/Button';
import { Card, CardBody } from '../atoms/Card';
import { ErrorText } from '../atoms/ErrorText';
import { InitialsAvatar } from '../atoms/InitialsAvatar';
import { Show } from '../atoms/Show';
import { CardHeader } from '../atoms/CardHeader';
import { type AdminErrorMessage, selectPunchError } from './admin-errors.core';
import {
  RUNNER_ROW_CLASS,
  RUNNER_ROW_DETAIL_CLASS,
  RUNNER_ROW_NAME_CLASS,
  RUNNER_ROW_RANK_CLASS,
} from './leaderboard.utils';
import {
  selectMissedLoop,
  selectOutAtLoop,
  selectOutReasonKey,
  splitByDidNotFinish,
} from './did-not-finish.core';

interface DidNotFinishPanelProps {
  readonly edition: RaceEditionDto;
  readonly ranked: readonly RankedRunnerDto[];
}

interface RunnerRowProps {
  readonly entry: RankedRunnerDto;
  readonly loopLabel: string;
  readonly note: string;
  readonly children: React.ReactNode;
}

function RunnerRow({ entry, loopLabel, note, children }: RunnerRowProps) {
  const avatar = initialsAvatar(entry.runner.displayName);
  return (
    <div className={RUNNER_ROW_CLASS}>
      <span className={RUNNER_ROW_RANK_CLASS}>{loopLabel}</span>
      <div className="flex items-center gap-3 min-w-0">
        <InitialsAvatar initials={avatar.initials} backgroundColor={avatar.backgroundColor} />
        <span className={RUNNER_ROW_NAME_CLASS}>{entry.runner.displayName}</span>
      </div>
      <span className={RUNNER_ROW_DETAIL_CLASS}>{note}</span>
      {children}
    </div>
  );
}

/**
 * The out tab. It confirms a runner the system projected as out, reinstates
 * one who was projected too eagerly, and records a voluntary withdrawal.
 */
// @FollowsBlueprint organism-mutation-panel
export function DidNotFinishPanel({ edition, ranked }: DidNotFinishPanelProps) {
  const { t } = useTranslation();
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [failure, setFailure] = useState<AdminErrorMessage | null>(null);
  const recordDidNotFinish = useRecordDidNotFinish();
  const catchupPunch = useCatchupPunch();
  const lists = splitByDidNotFinish(ranked);

  function reportFailure(error: unknown, runnerName: string): void {
    setBusySlug(null);
    setFailure(selectPunchError(error, runnerName));
  }

  function confirmOut(entry: RankedRunnerDto): void {
    setBusySlug(entry.runner.slug);
    setFailure(null);
    recordDidNotFinish.mutate(
      {
        editionSlug: edition.slug,
        runnerSlug: entry.runner.slug,
        outAtLoop: selectOutAtLoop(entry),
        reason: 'manual',
      },
      {
        onSuccess: () => {
          setBusySlug(null);
          recordAnalyticsEvent('dnf_validated', {
            editionSlug: edition.slug,
            runnerSlug: entry.runner.slug,
          });
        },
        onError: (error: unknown) => {
          reportFailure(error, entry.runner.displayName);
        },
      },
    );
  }

  function withdraw(entry: RankedRunnerDto): void {
    const isConfirmed = globalThis.confirm(
      t('admin.did-not-finish.withdraw-confirm', {
        name: entry.runner.displayName,
        loop: selectOutAtLoop(entry),
      }),
    );
    for (const confirmed of listWhen(isConfirmed, entry)) {
      confirmOut(confirmed);
    }
  }

  function reinstate(entry: RankedRunnerDto): void {
    const loopIndex = selectMissedLoop(entry);
    const isConfirmed = globalThis.confirm(
      t('admin.did-not-finish.catch-up-confirm', {
        name: entry.runner.displayName,
        loop: loopIndex,
      }),
    );
    for (const confirmed of listWhen(isConfirmed, entry)) {
      setBusySlug(confirmed.runner.slug);
      setFailure(null);
      catchupPunch.mutate(
        { editionSlug: edition.slug, runnerSlug: confirmed.runner.slug, loopIndex },
        {
          onSuccess: () => {
            setBusySlug(null);
            recordAnalyticsEvent('correction_applied', {
              editionSlug: edition.slug,
              runnerSlug: confirmed.runner.slug,
            });
          },
          onError: (error: unknown) => {
            reportFailure(error, confirmed.runner.displayName);
          },
        },
      );
    }
  }

  const failureText = t(failure?.key ?? 'common.error-detail', failure?.parameters);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader
          title={t('admin.did-not-finish.pending-title')}
          hint={
            <span className="font-mono tabular-nums text-ink-3">
              {t('admin.did-not-finish.pending-count', {
                runners: lists.awaitingConfirmation.length,
              })}
            </span>
          }
        />
        <CardBody className="flex flex-col gap-3">
          <Show when={failure !== null}>
            <ErrorText>{failureText}</ErrorText>
          </Show>
          <Show when={lists.awaitingConfirmation.length === 0}>
            <div className="text-ink-3">{t('admin.did-not-finish.pending-empty')}</div>
          </Show>
          {lists.awaitingConfirmation.map((entry) => (
            <RunnerRow
              key={entry.runner.slug}
              entry={entry}
              loopLabel={t('common.loop-short', { loop: selectOutAtLoop(entry) })}
              note={t('admin.did-not-finish.missed-top', { loop: selectOutAtLoop(entry) })}
            >
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="small"
                  onClick={() => {
                    reinstate(entry);
                  }}
                  disabled={busySlug !== null}
                  title={t('admin.did-not-finish.catch-up-hint')}
                >
                  {t('admin.did-not-finish.catch-up')}
                </Button>
                <Button
                  variant="danger"
                  size="small"
                  onClick={() => {
                    confirmOut(entry);
                  }}
                  disabled={busySlug !== null}
                >
                  {t('admin.did-not-finish.confirm-action')}
                </Button>
              </div>
            </RunnerRow>
          ))}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title={t('admin.did-not-finish.reinstate-title')}
          hint={
            <span className="font-mono tabular-nums text-ink-3">
              {t('admin.did-not-finish.reinstate-count', { runners: lists.allOut.length })}
            </span>
          }
        />
        <CardBody className="flex flex-col gap-3">
          <div className="text-[12px] text-ink-3">{t('admin.did-not-finish.reinstate-hint')}</div>
          <Show when={lists.allOut.length === 0}>
            <div className="text-ink-3">{t('admin.did-not-finish.reinstate-empty')}</div>
          </Show>
          {lists.allOut.map((entry) => (
            <RunnerRow
              key={`reinstate-${entry.runner.slug}`}
              entry={entry}
              loopLabel={t('common.loop-short', { loop: selectOutAtLoop(entry) })}
              note={t('admin.did-not-finish.reason-line', {
                reason: t(selectOutReasonKey(entry)),
                loop: selectOutAtLoop(entry),
              })}
            >
              <Button
                size="small"
                onClick={() => {
                  reinstate(entry);
                }}
                disabled={busySlug !== null}
              >
                {t('admin.did-not-finish.catch-up')}
              </Button>
            </RunnerRow>
          ))}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title={t('admin.did-not-finish.withdrawal-title')}
          hint={
            <span className="font-mono tabular-nums text-ink-3">
              {t('admin.did-not-finish.in-race-count', { runners: lists.stillRunning.length })}
            </span>
          }
        />
        <CardBody className="flex flex-col gap-3">
          <div className="text-[12px] text-ink-3">{t('admin.did-not-finish.withdrawal-hint')}</div>
          <Show when={lists.stillRunning.length === 0}>
            <div className="text-ink-3">{t('admin.did-not-finish.withdrawal-empty')}</div>
          </Show>
          {lists.stillRunning.map((entry) => (
            <RunnerRow
              key={entry.runner.slug}
              entry={entry}
              loopLabel={t('common.loop-short', { loop: selectOutAtLoop(entry) })}
              note={t('admin.did-not-finish.last-loop', { loop: selectOutAtLoop(entry) })}
            >
              <Button
                variant="danger"
                size="small"
                onClick={() => {
                  withdraw(entry);
                }}
                disabled={busySlug !== null}
              >
                {t('admin.did-not-finish.withdraw-action')}
              </Button>
            </RunnerRow>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}
