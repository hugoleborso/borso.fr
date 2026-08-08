import { useTranslation } from 'react-i18next';
import { Card, CardBody } from '../components/atoms/Card';
import { InitialsAvatar } from '../components/atoms/InitialsAvatar';
import { Pill } from '../components/atoms/Pill';
import { Show } from '../components/atoms/Show';
import { CardHeader } from '../components/molecules/CardHeader';
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
const IDENTITY_ROW_STYLE = { gap: 'var(--d-5)', flexWrap: 'wrap' } as const;
const NAME_STYLE = { fontSize: 20 } as const;
const LIST_STYLE = { listStyle: 'none', padding: 0, margin: 0 } as const;

const STATUS_KEY_BY_KIND = {
  'in-race': 'runner-profile.in-race',
  out: 'runner-profile.did-not-finish',
} as const;

interface RunnerProfilePageProps {
  readonly runnerSlug: string;
}

/**
 * One runner's page: who they are, where they stand, and every loop they
 * closed. The edition comes from the current edition response, so the page
 * follows whichever edition the API says is current.
 */
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
        <div className="main">
          <Card>
            <CardBody modifier="error-text">{t('runner-profile.not-found')}</CardBody>
          </Card>
        </div>
      </Show>
      <Show when={isLoadingRunnerProfile(runner.isError, runner.data !== undefined)}>
        <div className="main">
          <Card>
            <CardBody modifier="muted">{t('common.loading')}</CardBody>
          </Card>
        </div>
      </Show>
      {listPresent(runner.data?.runner).map((profile) => {
        const avatar = initialsAvatar(profile.displayName);
        return (
          <div className="main col" key={profile.slug}>
            <Card>
              <CardHeader
                title={t('runner-profile.title')}
                hint={
                  <span className="muted mono">
                    {currentEdition.data?.edition?.displayName ?? ''}
                  </span>
                }
              />
              <CardBody modifier="row" style={IDENTITY_ROW_STYLE}>
                <InitialsAvatar
                  initials={avatar.initials}
                  backgroundColor={avatar.backgroundColor}
                  style={AVATAR_STYLE}
                />
                <div className="col">
                  <strong style={NAME_STYLE}>{profile.displayName}</strong>
                  <Show when={profile.bib !== null}>
                    <span className="muted mono">
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
                  <span className="muted">
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
                  <span className="muted mono">
                    {t('runner-profile.validated-count', { count: countValidPunches(punchRows) })}
                  </span>
                }
              />
              <CardBody modifier="flush">
                <Show when={loops.length === 0}>
                  <CardBody modifier="muted">{t('runner-profile.no-loop')}</CardBody>
                </Show>
                <ul style={LIST_STYLE}>
                  {loops.map((loop) => (
                    <li key={loop.loopIndex} className="leaderboard-row">
                      <span className="rank mono">
                        {t('common.loop-short', { loop: loop.loopIndex })}
                      </span>
                      <span className="muted mono">
                        {t('runner-profile.finished-at', {
                          time: formatHourMinute(new Date(loop.finishedAt)),
                        })}
                      </span>
                      <span className="loop-info">
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
