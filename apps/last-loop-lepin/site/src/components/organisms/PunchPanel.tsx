import clsx from 'clsx';
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
  EMPTY_PUNCH_OVERLAY,
  listPunchTiles,
  projectPunchLoopClock,
  type PunchOverlay,
  type PunchTileTone,
  selectPunchTileTone,
  withoutPendingPunch,
  withPendingPunch,
} from './punch-panel.core';

const BIB_DIGITS = 3;

const TILE_CLASS =
  'relative flex flex-col gap-3 min-h-26 px-4 py-3 rounded-xl border text-left text-ink transition-[border-color,background,transform] duration-150 hover:border-ink-mute hover:bg-bg-elev-2 active:scale-[0.985] disabled:opacity-60 disabled:cursor-progress';

const TILE_CLASS_BY_TONE: Readonly<Record<PunchTileTone, string>> = {
  pending: 'bg-bg-elev border-line',
  punched: 'bg-tile-punched border-accent',
  late: 'bg-bg-elev border-warn-line',
};

const CHECK_CLASS =
  'absolute top-2.5 right-2.5 grid place-items-center w-5 h-5 rounded-full border-[1.5px] text-[12px] font-bold leading-none';

const CHECK_CLASS_BY_TONE: Readonly<Record<PunchTileTone, string>> = {
  pending: 'border-line text-transparent',
  punched: 'bg-accent border-accent text-accent-ink',
  late: 'border-line text-transparent',
};

const META_CLASS_BY_TONE: Readonly<Record<PunchTileTone, string>> = {
  pending: 'font-mono text-[11px] text-ink-3',
  punched: 'font-mono text-[11px] font-semibold text-accent',
  late: 'font-mono text-[11px] text-ink-3',
};

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
/**
 * @Blueprint organism-mutation-panel
 * @BlueprintName Organism Mutation Panel
 * @BlueprintUsage Use for a panel whose controls each fire a mutation and have to look applied before the server answers.
 * @BlueprintDescription Each tile's click handler writes an immutable overlay through `withPendingPunch` and then calls the mutation, and `onError` puts the overlay back with `withoutPendingPunch`, so the optimistic state is a value rather than an effect watching the request. The overlay carries the loop it belongs to, so the next loop simply stops matching it and nothing has to clear it. The tiles themselves come from `listPunchTiles`, a pure projection over the standings, the clock and the overlay.
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
          <span className="font-mono tabular-nums text-ink-3">
            {t('admin.punch.hint', {
              minutes: clock.minutesToNextTop,
              runners: countRunnersInRace(ranked),
            })}
          </span>
        }
      />
      <CardBody padding="none">
        <Show when={failure !== null}>
          <ErrorText className="px-5 py-3">
            {t(failure?.key ?? 'common.error-detail', failure?.parameters)}
          </ErrorText>
        </Show>
        <Show when={tiles.length === 0}>
          <div className="p-5 text-ink-3">{t('admin.punch.nobody')}</div>
        </Show>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3 px-5 py-4">
          {tiles.map((tile) => {
            const avatar = initialsAvatar(tile.entry.runner.displayName);
            const tone = selectPunchTileTone(tile.isPunched, tile.isLate);
            return (
              <button
                type="button"
                className={clsx(TILE_CLASS, TILE_CLASS_BY_TONE[tone])}
                data-tone={tone}
                key={tile.entry.runner.slug}
                onClick={() => {
                  punchRunner(tile.entry.runner);
                }}
                disabled={registerPunch.isPending}
              >
                <span className={clsx(CHECK_CLASS, CHECK_CLASS_BY_TONE[tone])} aria-hidden>
                  ✓
                </span>
                <span className="flex items-center gap-3 min-w-0">
                  <InitialsAvatar
                    initials={avatar.initials}
                    backgroundColor={avatar.backgroundColor}
                  />
                  <span className="flex flex-col min-w-0">
                    <span className="font-mono text-[10px] tracking-[0.08em] text-ink-mute">
                      #{formatBibNumber(tile.entry.runner.bib, BIB_DIGITS)}
                    </span>
                    <span className="truncate text-[14px] font-medium text-ink">
                      {tile.entry.runner.displayName}
                    </span>
                  </span>
                </span>
                <span className="flex items-baseline justify-between gap-3">
                  <span className={META_CLASS_BY_TONE[tone]}>
                    <Show when={tile.isPunched}>{t('admin.punch.punched')}</Show>
                    <Show when={!tile.isPunched}>
                      {t('admin.punch.loop-count', { count: tile.closedLoopCount })}
                    </Show>
                  </span>
                  <span className="font-mono text-[10px] tracking-[0.04em] text-ink-mute">
                    ~{formatPace(tile.entry.lastLoopDurationMs)}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </CardBody>
    </Card>
  );
}
