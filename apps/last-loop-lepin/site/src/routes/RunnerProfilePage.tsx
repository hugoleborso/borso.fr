import { useTranslation } from 'react-i18next';
import { Card, CardBody } from '../components/atoms/Card';
import { InitialsAvatar } from '../components/atoms/InitialsAvatar';
import { Pill } from '../components/atoms/Pill';
import { Show } from '../components/atoms/Show';
import { CardHeader } from '../components/atoms/CardHeader';
import {
  RUNNER_ROW_CLASS,
  RUNNER_ROW_DETAIL_CLASS,
  RUNNER_ROW_RANK_CLASS,
} from '../components/organisms/leaderboard.utils';
import {
  countValidPunches,
  listClosedLoops,
} from '../components/organisms/runner-loop-history.core';
import { formatHourMinute, formatLoopDuration } from '../lib/formatters.utils';
import { initialsAvatar } from '../lib/initials.utils';
import { listPresent } from '../lib/optional.utils';
import { useCurrentEdition } from '../lib/queries/editions';
import { useRunnerPunches } from '../lib/queries/punches';
import { useRunner } from '../lib/queries/runners';
import { useStandings } from '../lib/queries/standings';
import { selectRunnerStatusKind, selectRunnerStatusLoop } from '../lib/runner-status.utils';
import { formatCurrentRank, isLoadingRunnerProfile } from './runner-profile.core';

const AVATAR_STYLE = { width: 64, height: 64, fontSize: 20 } as const;

const STATUS_KEY_BY_KIND = {
  'in-race': 'runner-profile.in-race',
  out: 'runner-profile.did-not-finish',
} as const;

interface RunnerProfilePageProps {
  readonly runnerSlug: string;
}

// @FollowsBlueprint route-detail-page
export function RunnerProfilePage({ runnerSlug }: RunnerProfilePageProps) {
  const { t } = useTranslation();
  const currentEdition = useCurrentEdition();
  const editionSlug = currentEdition.data?.edition?.slug ?? '';
  const runner = useRunner(editionSlug, runnerSlug);
  const standings = useStandings(editionSlug);
  const punches = useRunnerPunches(editionSlug, runnerSlug);

  const entry = standings.data?.standings.ranked.find((row) => row.runner.slug === runnerSlug);
  const punchRows = punches.data?.punches ?? [];
  const loops = listClosedLoops(currentEdition.data?.edition?.startsAt, punchRows);

  return (
    <>
      <Show when={runner.isError}>
        <div className="flex flex-col gap-4 p-6 min-h-0">
          <Card>
            <CardBody className="font-mono text-[12px] text-danger">
              {t('runner-profile.not-found')}
            </CardBody>
          </Card>
        </div>
      </Show>
      <Show when={isLoadingRunnerProfile(runner.isError, runner.data !== undefined)}>
        <div className="flex flex-col gap-4 p-6 min-h-0">
          <Card>
            <CardBody className="text-ink-3">{t('common.loading')}</CardBody>
          </Card>
        </div>
      </Show>
      {listPresent(runner.data?.runner).map((profile) => {
        const avatar = initialsAvatar(profile.displayName);
        return (
          <div className="flex flex-col gap-3 p-6 min-h-0" key={profile.slug}>
            <Card>
              <CardHeader
                title={t('runner-profile.title')}
                hint={
                  <span className="font-mono tabular-nums text-ink-3">
                    {currentEdition.data?.edition?.displayName ?? ''}
                  </span>
                }
              />
              <CardBody className="flex flex-wrap items-center gap-5">
                <InitialsAvatar
                  initials={avatar.initials}
                  backgroundColor={avatar.backgroundColor}
                  style={AVATAR_STYLE}
                />
                <div className="flex flex-col gap-3">
                  <strong className="text-[20px]">{profile.displayName}</strong>
                  <Show when={profile.bib !== null}>
                    <span className="font-mono tabular-nums text-ink-3">
                      {t('runner-profile.bib', { bib: profile.bib ?? 0 })}
                    </span>
                  </Show>
                  {listPresent(entry).map((standing) => (
                    <Pill key={standing.runner.slug} tone={selectRunnerStatusKind(standing.status)}>
                      {t(STATUS_KEY_BY_KIND[selectRunnerStatusKind(standing.status)], {
                        loop: selectRunnerStatusLoop(standing.status),
                      })}
                    </Pill>
                  ))}
                  <span className="text-ink-3">
                    {t('runner-profile.current-rank', {
                      rank: formatCurrentRank(
                        entry?.rank,
                        t('common.ex-aequo'),
                        t('common.empty-value'),
                      ),
                    })}
                  </span>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader
                title={t('runner-profile.loop-history-title')}
                hint={
                  <span className="font-mono tabular-nums text-ink-3">
                    {t('runner-profile.validated-count', { count: countValidPunches(punchRows) })}
                  </span>
                }
              />
              <CardBody padding="none">
                <Show when={loops.length === 0}>
                  <div className="px-5 py-4 text-ink-3">{t('runner-profile.no-loop')}</div>
                </Show>
                <ul>
                  {loops.map((loop) => (
                    <li key={loop.loopIndex} className={RUNNER_ROW_CLASS}>
                      <span className={RUNNER_ROW_RANK_CLASS}>
                        {t('common.loop-short', { loop: loop.loopIndex })}
                      </span>
                      <span className="font-mono tabular-nums text-ink-3">
                        {t('runner-profile.finished-at', {
                          time: formatHourMinute(new Date(loop.finishedAt)),
                        })}
                      </span>
                      <span className={RUNNER_ROW_DETAIL_CLASS}>
                        {t('runner-profile.loop-duration', {
                          duration: formatLoopDuration(loop.durationMs),
                        })}
                      </span>
                      <Pill tone="in-race">{t('runner-profile.loop-valid')}</Pill>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          </div>
        );
      })}
    </>
  );
}
