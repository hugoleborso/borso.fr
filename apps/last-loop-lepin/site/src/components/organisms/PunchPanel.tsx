import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatBibNumber, formatLoopIndex, formatPace } from '../../lib/formatters.utils';
import { useRegisterPunch } from '../../lib/queries/punches';
import type { RaceEditionDto, RankedRunnerDto, RunnerDto } from '../../lib/race.types';
import { countRunnersInRace } from '../../lib/runner-status.utils';
import { initialsAvatar } from '../../lib/initials.utils';
import { recordAnalyticsEvent } from '../../observability/sentry';
import { Card, CardBody } from '../atoms/Card';
import { ErrorText } from '../atoms/ErrorText';
import { InitialsAvatar } from '../atoms/InitialsAvatar';
import { Show } from '../atoms/Show';
import { CardHeader } from '../molecules/CardHeader';
import { type AdminErrorMessage, selectPunchError } from './admin-errors.core';
import {
  composePunchTileClassName,
  EMPTY_PUNCH_OVERLAY,
  listPunchTiles,
  projectPunchLoopClock,
  type PunchOverlay,
  withoutPendingPunch,
  withPendingPunch,
} from './punch-panel.core';

const BIB_DIGITS = 3;
const ERROR_STYLE = { padding: 'var(--d-3) var(--d-5)' } as const;
const EMPTY_STYLE = { padding: 'var(--d-5)' } as const;
const GRID_STYLE = { padding: 0 } as const;

interface PunchPanelProps {
  readonly edition: RaceEditionDto;
  readonly ranked: readonly RankedRunnerDto[];
  readonly now: Date;
}

/**
 * The organiser's punching grid. A tap flips the tile straight away from a
 * local overlay, so the next bib can be tapped without waiting on the two
 * second standings poll, and the poll is what confirms it.
 */
export function PunchPanel({ edition, ranked, now }: PunchPanelProps) {
  const { t } = useTranslation();
  const [overlay, setOverlay] = useState<PunchOverlay>(EMPTY_PUNCH_OVERLAY);
  const [failure, setFailure] = useState<AdminErrorMessage | null>(null);
  const registerPunch = useRegisterPunch();

  const clock = projectPunchLoopClock(edition.startsAt, edition.intervalMinutes, now.getTime());
  const tiles = listPunchTiles(ranked, clock, overlay);
  const loopIndex = clock.currentLoopIndex;

  function punchRunner(runner: RunnerDto): void {
    setFailure(null);
    setOverlay((current) => withPendingPunch(current, loopIndex, runner.slug));
    registerPunch.mutate(
      { editionSlug: edition.slug, runnerSlug: runner.slug },
      {
        onSuccess: () => {
          recordAnalyticsEvent('loop_punched', {
            editionSlug: edition.slug,
            runnerSlug: runner.slug,
          });
        },
        onError: (error: unknown) => {
          setOverlay((current) => withoutPendingPunch(current, loopIndex, runner.slug));
          setFailure(selectPunchError(error, runner.displayName));
        },
      },
    );
  }

  return (
    <Card>
      <CardHeader
        title={t('admin.punch.title', { loop: formatLoopIndex(loopIndex) })}
        hint={
          <span className="muted mono">
            {t('admin.punch.hint', {
              minutes: clock.minutesToNextTop,
              runners: countRunnersInRace(ranked),
            })}
          </span>
        }
      />
      <CardBody style={GRID_STYLE}>
        <Show when={failure !== null}>
          <ErrorText style={ERROR_STYLE}>
            {t(failure?.key ?? 'common.error-detail', failure?.parameters)}
          </ErrorText>
        </Show>
        <Show when={tiles.length === 0}>
          <div className="muted" style={EMPTY_STYLE}>
            {t('admin.punch.nobody')}
          </div>
        </Show>
        <div className="punch-grid">
          {tiles.map((tile) => {
            const avatar = initialsAvatar(tile.entry.runner.displayName);
            return (
              <button
                type="button"
                className={composePunchTileClassName(tile.isPunched, tile.isLate)}
                key={tile.entry.runner.slug}
                onClick={() => {
                  punchRunner(tile.entry.runner);
                }}
                disabled={registerPunch.isPending}
              >
                <span className="punch-check" aria-hidden>
                  ✓
                </span>
                <span className="punch-top">
                  <InitialsAvatar
                    initials={avatar.initials}
                    backgroundColor={avatar.backgroundColor}
                  />
                  <span className="punch-id">
                    <span className="punch-bib">
                      #{formatBibNumber(tile.entry.runner.bib, BIB_DIGITS)}
                    </span>
                    <span className="punch-name">{tile.entry.runner.displayName}</span>
                  </span>
                </span>
                <span className="punch-bottom">
                  <span className="punch-meta">
                    <Show when={tile.isPunched}>{t('admin.punch.punched')}</Show>
                    <Show when={!tile.isPunched}>
                      {t('admin.punch.loop-count', { count: tile.closedLoopCount })}
                    </Show>
                  </span>
                  <span className="punch-pace">~{formatPace(tile.entry.lastLoopDurationMs)}</span>
                </span>
              </button>
            );
          })}
        </div>
      </CardBody>
    </Card>
  );
}
