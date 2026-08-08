import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  selectTabClassName,
} from '../components/organisms/admin-tabs.core';
import { CorrectionPanel } from '../components/organisms/CorrectionPanel';
import { DidNotFinishPanel } from '../components/organisms/DidNotFinishPanel';
import { FinishRacePrompt } from '../components/organisms/FinishRacePrompt';
import { PunchPanel } from '../components/organisms/PunchPanel';
import { RunnerAdminPanel } from '../components/organisms/RunnerAdminPanel';
import { SetupPanel } from '../components/organisms/SetupPanel';
import { listPresent } from '../lib/optional.utils';
import { useCurrentEdition } from '../lib/queries/editions';
import { useStandings } from '../lib/queries/standings';
import type { RaceEditionDto, RankedRunnerDto } from '../lib/race.types';
import { countRunnersInRace } from '../lib/runner-status.utils';

const NAV_STYLE = { marginLeft: 0 } as const;
const EMPTY_RANKED: readonly RankedRunnerDto[] = [];

interface EditionTabProps {
  readonly edition: RaceEditionDto;
  readonly ranked: readonly RankedRunnerDto[];
  readonly locale: string;
}

const PANEL_BY_TAB: Readonly<Record<EditionPanelTab, (props: EditionTabProps) => ReactNode>> = {
  runners: ({ edition }) => <RunnerAdminPanel edition={edition} />,
  punch: ({ edition, ranked }) => <PunchPanel edition={edition} ranked={ranked} now={new Date()} />,
  'did-not-finish': ({ edition, ranked }) => (
    <DidNotFinishPanel edition={edition} ranked={ranked} />
  ),
  corrections: ({ edition }) => <CorrectionPanel edition={edition} />,
};

/** The organiser screen. PIN first, then one panel per tab. */
export function AdminPage() {
  const { t, i18n } = useTranslation();
  const [isAuthenticated, setAuthenticated] = useState(false);
  const [tab, setTab] = useState<AdminTabName>(DEFAULT_ADMIN_TAB);
  const currentEdition = useCurrentEdition();
  const edition = currentEdition.data?.edition ?? null;
  const standings = useStandings(edition?.slug ?? '');
  const ranked = standings.data?.standings.ranked ?? EMPTY_RANKED;

  return (
    <>
      <Show when={!isAuthenticated}>
        <div className="main">
          <AdminLoginForm
            onAuthenticated={() => {
              setAuthenticated(true);
            }}
          />
        </div>
      </Show>
      <Show when={isAuthenticated}>
        <div className="main col">
          {listPresent(
            selectEditionNeedingFinish(edition, ranked.length, countRunnersInRace(ranked)),
          ).map((closingEdition) => (
            <FinishRacePrompt
              key={closingEdition.slug}
              edition={closingEdition}
              totalRunners={ranked.length}
            />
          ))}
          <nav className="nav" style={NAV_STYLE}>
            {ADMIN_TABS.map((entry) => (
              <button
                key={entry.name}
                type="button"
                className={selectTabClassName(tab, entry.name)}
                onClick={() => {
                  setTab(entry.name);
                }}
              >
                {t(entry.labelKey)}
              </button>
            ))}
          </nav>

          <Show when={tab === 'setup'}>
            <SetupPanel currentEdition={edition} locale={i18n.language} now={new Date()} />
          </Show>

          <Show when={isTabBlockedByMissingEdition(tab, edition !== null)}>
            <Card>
              <CardBody modifier="muted">{t('admin.no-active-edition')}</CardBody>
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
                />
              );
            }),
          )}
        </div>
      </Show>
    </>
  );
}
