import { useTranslation } from 'react-i18next';
import {
  countChallengesOfKind,
  countUnfinishedChallenges,
  deriveEditionScore,
  formatScore,
  selectCompletionRatio,
} from '../../labours/labours.core';
import type { Edition } from '../../labours/labours.types';
import {
  ACCENT,
  INK,
  MUTED,
  NOTE_INK,
  RULE,
  SANS_FAMILY,
  SERIF_FAMILY,
  STRIPE_LIGHT,
} from '../../theme/twelve-labours.theme';
import { MiniStat } from '../atoms/MiniStat';
import { ProgressBar } from '../atoms/ProgressBar';

const EDITION_PROGRESS_HEIGHT_PX = 10;

interface LaboursHeroProps {
  edition: Edition;
  year: number;
}

// @FollowsBlueprint organism-presentational
export function LaboursHero({ edition, year }: LaboursHeroProps) {
  const { t } = useTranslation();
  const score = deriveEditionScore(edition);

  return (
    <div
      className="twelve-travaux-hero"
      style={{
        gap: 48,
        padding: '40px 0 32px',
        borderBottom: `1px solid ${RULE}`,
        alignItems: 'end',
      }}
    >
      <div>
        <div
          style={{
            fontFamily: SANS_FAMILY,
            fontWeight: 600,
            fontSize: 12,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: MUTED,
            marginBottom: 10,
          }}
        >
          {t('twelve-labours.hero.edition-label')}
        </div>
        <h2
          className="twelve-travaux-hero-year"
          style={{
            fontFamily: SERIF_FAMILY,
            fontWeight: 400,
            lineHeight: 0.82,
            margin: 0,
            letterSpacing: '-0.045em',
            color: INK,
          }}
        >
          {year}
        </h2>
        <div
          style={{
            fontFamily: SERIF_FAMILY,
            fontStyle: 'italic',
            fontSize: 30,
            color: INK,
            marginTop: 18,
            maxWidth: 520,
            lineHeight: 1.2,
          }}
        >
          {t(edition.titleKey)}
          <span style={{ color: ACCENT }}>.</span>
        </div>
        <div
          style={{
            fontFamily: SANS_FAMILY,
            fontSize: 14,
            color: NOTE_INK,
            marginTop: 12,
            maxWidth: 520,
            lineHeight: 1.5,
          }}
        >
          {t(edition.subtitleKey)}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div
            style={{
              fontFamily: SANS_FAMILY,
              fontWeight: 500,
              fontSize: 11,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: MUTED,
            }}
          >
            {t('twelve-labours.hero.tally-label')}
          </div>
          <div style={{ fontFamily: SERIF_FAMILY, fontSize: 72, lineHeight: 0.9, color: INK }}>
            {formatScore(score.completed)}
            <span style={{ color: ACCENT }}>/</span>
            {score.total}
          </div>
        </div>
        <ProgressBar
          ratio={selectCompletionRatio(score)}
          heightPx={EDITION_PROGRESS_HEIGHT_PX}
          trackColor={STRIPE_LIGHT}
          fillColor={INK}
          markerColor={ACCENT}
        />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 12,
            marginTop: 6,
          }}
        >
          <MiniStat
            label={t('twelve-labours.stats.daily')}
            value={countChallengesOfKind(edition, 'daily')}
            tone="ink"
          />
          <MiniStat
            label={t('twelve-labours.stats.one-shot')}
            value={countChallengesOfKind(edition, 'oneshot')}
            tone="ink"
          />
          <MiniStat
            label={t('twelve-labours.stats.remaining')}
            value={countUnfinishedChallenges(edition)}
            tone="accent"
          />
        </div>
      </div>
    </div>
  );
}
