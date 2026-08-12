import clsx from 'clsx';
import { type ReactNode, useState, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { getCurrentTime, readServerTime, subscribeClock } from '../clock-store';
import { Card, CardBody } from '../components/atoms/Card';
import { Show } from '../components/atoms/Show';
import { AdminLoginForm } from '../components/organisms/AdminLoginForm';
import {
  ADMIN_TABS,
  type AdminTabName,
  DEFAULT_ADMIN_TAB,
  type EditionPanelTab,
  isTabBlockedByMissingEdition,
  selectEditionNeedingFinish,
  selectEditionPanelTab,
  selectTabState,
} from '../components/organisms/admin-tabs.core';
import { CorrectionPanel } from '../components/organisms/CorrectionPanel';
import { DidNotFinishPanel } from '../components/organisms/DidNotFinishPanel';
import { FinishRacePrompt } from '../components/organisms/FinishRacePrompt';
import {
  NAVIGATION_ITEM_CLASS,
  NAVIGATION_ITEM_CLASS_BY_STATE,
  NAVIGATION_LIST_CLASS,
} from '../components/organisms/navigation-styles';
import { PunchPanel } from '../components/organisms/PunchPanel';
import { RunnerAdminPanel } from '../components/organisms/RunnerAdminPanel';
import { SetupPanel } from '../components/organisms/SetupPanel';
import { listPresent } from '../lib/optional.utils';
import { useCurrentEdition } from '../lib/queries/editions';
import { useStandings } from '../lib/queries/standings';
import type { RaceEditionDto, RankedRunnerDto } from '../lib/race.types';
import { countRunnersInRace } from '../lib/runner-status.utils';

const EMPTY_RANKED: readonly RankedRunnerDto[] = [];

interface EditionTabProps {
  readonly edition: RaceEditionDto;
  readonly ranked: readonly RankedRunnerDto[];
  readonly locale: string;
  readonly now: Date;
}

// @FollowsBlueprint component-lookup-table
const PANEL_BY_TAB: Readonly<Record<EditionPanelTab, (props: EditionTabProps) => ReactNode>> = {
  runners: ({ edition }) => <RunnerAdminPanel edition={edition} />,
  punch: ({ edition, ranked, now }) => <PunchPanel edition={edition} ranked={ranked} now={now} />,
  'did-not-finish': ({ edition, ranked }) => (
    <DidNotFinishPanel edition={edition} ranked={ranked} />
  ),
  corrections: ({ edition }) => <CorrectionPanel edition={edition} />,
};

/**
 * The organiser screen. PIN first, then one panel per tab.
 *
 * The punch grid flags a runner as late from how far into the loop the race
 * is, so the screen subscribes to the shared clock once and hands the instant
 * down. Reading `new Date()` during render instead would only advance when the
 * standings poll happened to re-render the tree.
 */
// @FollowsBlueprint route-list-page
export function AdminPage() {
  const { t, i18n } = useTranslation();
  const [isAuthenticated, setAuthenticated] = useState(false);
  const [tab, setTab] = useState<AdminTabName>(DEFAULT_ADMIN_TAB);
  const currentEdition = useCurrentEdition();
  const edition = currentEdition.data?.edition ?? null;
  const standings = useStandings(edition?.slug ?? '');
  const ranked = standings.data?.standings.ranked ?? EMPTY_RANKED;
  const nowMs = useSyncExternalStore(subscribeClock, getCurrentTime, readServerTime);
  const now = new Date(nowMs);

  return (
    <>
      <Show when={!isAuthenticated}>
        <div className="flex flex-col gap-4 p-6 min-h-0">
          <AdminLoginForm
            onAuthenticated={() => {
              setAuthenticated(true);
            }}
          />
        </div>
      </Show>
      <Show when={isAuthenticated}>
        <div className="flex flex-col gap-3 p-6 min-h-0">
          {listPresent(
            selectEditionNeedingFinish(edition, ranked.length, countRunnersInRace(ranked)),
          ).map((closingEdition) => (
            <FinishRacePrompt
              key={closingEdition.slug}
              edition={closingEdition}
              totalRunners={ranked.length}
            />
          ))}
          <nav className={NAVIGATION_LIST_CLASS}>
            {ADMIN_TABS.map((entry) => (
              <button
                key={entry.name}
                type="button"
                className={clsx(
                  NAVIGATION_ITEM_CLASS,
                  NAVIGATION_ITEM_CLASS_BY_STATE[selectTabState(tab, entry.name)],
                )}
                onClick={() => {
                  setTab(entry.name);
                }}
              >
                {t(entry.labelKey)}
              </button>
            ))}
          </nav>

          <Show when={tab === 'setup'}>
            <SetupPanel currentEdition={edition} locale={i18n.language} now={now} />
          </Show>

          <Show when={isTabBlockedByMissingEdition(tab, edition !== null)}>
            <Card>
              <CardBody className="text-ink-3">{t('admin.no-active-edition')}</CardBody>
            </Card>
          </Show>

          {listPresent(edition).map((activeEdition) =>
            listPresent(selectEditionPanelTab(tab)).map((panelTab) => {
              const Panel = PANEL_BY_TAB[panelTab];
              return (
                <Panel
                  key={panelTab}
                  edition={activeEdition}
                  ranked={ranked}
                  locale={i18n.language}
                  now={now}
                />
              );
            }),
          )}
        </div>
      </Show>
    </>
  );
}
