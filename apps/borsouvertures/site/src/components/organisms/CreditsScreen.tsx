import { useTranslation } from 'react-i18next';
import { ExternalLink } from '@/components/atoms/ExternalLink';
import { Panel } from '@/components/atoms/Panel';
import { StatusItem } from '@/components/atoms/StatusItem';
import { listStockfishFiles, STOCKFISH_DISTRIBUTION } from '@/opponent/stockfish-distribution.core';

const LICHESS_DATASET_URL = 'https://github.com/lichess-org/chess-openings';
const WIKIPEDIA_ARTICLE_URL = 'https://en.wikipedia.org/wiki/Albin_Countergambit';
const STOCKFISH_LICENCE_URL = `/${STOCKFISH_DISTRIBUTION.publicFolder}/${STOCKFISH_DISTRIBUTION.files.licence.fileName}`;

// @FollowsBlueprint organism-presentational
export function CreditsScreen() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-4 w-full max-w-xl mx-auto">
      <h2 className="text-xl font-bold">{t('credits.title')}</h2>
      <Panel title={t('credits.lichess.name')}>
        <p className="font-semibold">{t('credits.lichess.licence')}</p>
        <p>{t('credits.lichess.description')}</p>
        <ExternalLink href={LICHESS_DATASET_URL} label={t('credits.lichess.link')} />
      </Panel>
      <Panel title={t('credits.wikipedia.name')}>
        <p className="font-semibold">{t('credits.wikipedia.licence')}</p>
        <p>{t('credits.wikipedia.description')}</p>
        <ExternalLink href={WIKIPEDIA_ARTICLE_URL} label={t('credits.wikipedia.link')} />
      </Panel>
      <Panel title={t('credits.stockfish.name', { version: STOCKFISH_DISTRIBUTION.version })}>
        <p className="font-semibold">{t('credits.stockfish.licence')}</p>
        <p>{t('credits.stockfish.description')}</p>
        <ExternalLink
          href={STOCKFISH_DISTRIBUTION.sourceUrl}
          label={t('credits.stockfish.source-link', { tag: STOCKFISH_DISTRIBUTION.upstreamTag })}
        />
        <ExternalLink href={STOCKFISH_LICENCE_URL} label={t('credits.stockfish.licence-link')} />
        <h3 className="text-sm font-bold opacity-80">{t('credits.stockfish.digests')}</h3>
        <div className="flex flex-col gap-2 font-mono text-xs break-all">
          {listStockfishFiles().map((file) => (
            <StatusItem key={file.fileName} label={file.fileName} value={file.sha256} />
          ))}
        </div>
      </Panel>
    </div>
  );
}
