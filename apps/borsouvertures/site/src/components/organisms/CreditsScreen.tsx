import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ExternalLink } from '@/components/atoms/ExternalLink';
import { Panel } from '@/components/atoms/Panel';
import { SectionTabs } from '@/components/atoms/SectionTabs';
import { StatusItem } from '@/components/atoms/StatusItem';
import { TabPanel } from '@/components/atoms/TabPanel';
import { listStockfishFiles, STOCKFISH_DISTRIBUTION } from '@/opponent/stockfish-distribution.core';

type CreditsSection = 'lichess' | 'wikipedia' | 'stockfish';

const CREDITS_TABS_ID = 'credits';

const CREDITS_SECTIONS = [
  'lichess',
  'wikipedia',
  'stockfish',
] as const satisfies readonly CreditsSection[];

const SECTION_LABEL_KEY_BY_SECTION = {
  lichess: 'credits.sections.lichess',
  wikipedia: 'credits.sections.wikipedia',
  stockfish: 'credits.sections.stockfish',
} as const satisfies Record<CreditsSection, string>;

const LICHESS_DATASET_URL = 'https://github.com/lichess-org/chess-openings';
const WIKIPEDIA_ARTICLE_URL = 'https://en.wikipedia.org/wiki/Albin_Countergambit';
const STOCKFISH_LICENCE_URL = `/${STOCKFISH_DISTRIBUTION.publicFolder}/${STOCKFISH_DISTRIBUTION.files.licence.fileName}`;

// @FollowsBlueprint organism-table-dispatch
export function CreditsScreen() {
  const { t } = useTranslation();
  const [shownSection, setShownSection] = useState<CreditsSection>('lichess');
  return (
    <div className="flex flex-col gap-4 w-full max-w-xl mx-auto">
      <h2 className="text-2xl font-bold tracking-[-0.02em]">{t('credits.title')}</h2>
      <SectionTabs
        tabs={CREDITS_SECTIONS.map((section) => ({
          id: section,
          label: t(SECTION_LABEL_KEY_BY_SECTION[section]),
        }))}
        selectedId={shownSection}
        ariaLabel={t('credits.sections.aria-label')}
        idPrefix={CREDITS_TABS_ID}
        onSelect={setShownSection}
      />
      <TabPanel idPrefix={CREDITS_TABS_ID} tabId="lichess" isSelected={shownSection === 'lichess'}>
        <Panel title={t('credits.lichess.name')}>
          <p className="font-bold">{t('credits.lichess.licence')}</p>
          <p className="max-w-[65ch]">{t('credits.lichess.description')}</p>
          <ExternalLink href={LICHESS_DATASET_URL} label={t('credits.lichess.link')} />
        </Panel>
      </TabPanel>
      <TabPanel
        idPrefix={CREDITS_TABS_ID}
        tabId="wikipedia"
        isSelected={shownSection === 'wikipedia'}
      >
        <Panel title={t('credits.wikipedia.name')}>
          <p className="font-bold">{t('credits.wikipedia.licence')}</p>
          <p className="max-w-[65ch]">{t('credits.wikipedia.description')}</p>
          <ExternalLink href={WIKIPEDIA_ARTICLE_URL} label={t('credits.wikipedia.link')} />
        </Panel>
      </TabPanel>
      <TabPanel
        idPrefix={CREDITS_TABS_ID}
        tabId="stockfish"
        isSelected={shownSection === 'stockfish'}
      >
        <Panel title={t('credits.stockfish.name', { version: STOCKFISH_DISTRIBUTION.version })}>
          <p className="font-bold">{t('credits.stockfish.licence')}</p>
          <p className="max-w-[65ch]">{t('credits.stockfish.description')}</p>
          <ExternalLink
            href={STOCKFISH_DISTRIBUTION.sourceUrl}
            label={t('credits.stockfish.source-link', { tag: STOCKFISH_DISTRIBUTION.upstreamTag })}
          />
          <ExternalLink href={STOCKFISH_LICENCE_URL} label={t('credits.stockfish.licence-link')} />
          <h3 className="text-sm font-bold uppercase tracking-[0.06em] text-ink-muted">
            {t('credits.stockfish.digests')}
          </h3>
          <div className="flex flex-col font-mono text-xs break-all">
            {listStockfishFiles().map((file) => (
              <StatusItem key={file.fileName} label={file.fileName} value={file.sha256} />
            ))}
          </div>
        </Panel>
      </TabPanel>
    </div>
  );
}
