import { useState } from 'react';
import { MiniStat } from './components';
import { DATA } from './data';
import {
  countChallenges,
  formatScore,
  pickDefaultMonth,
  pickDefaultYear,
  selectFeaturedMonth,
  selectYearData,
  yearScore,
} from './data.utils';
import { FeaturedMonth } from './featured-month';
import { FilmstripCard } from './filmstrip-card';
import { ACCENT, INK, MUTED, PAPER, RULE, STRIPE_LIGHT } from './theme';

const ALL_YEARS = Object.keys(DATA.years)
  .map(Number)
  .sort((a, b) => a - b);
const FALLBACK_YEAR = new Date().getFullYear();
const DEFAULT_YEAR = pickDefaultYear(ALL_YEARS, FALLBACK_YEAR);

export function App() {
  const [year, setYear] = useState(DEFAULT_YEAR);
  const [selected, setSelected] = useState(() => pickDefaultMonth(DEFAULT_YEAR, new Date()));

  const yearData = selectYearData(DATA, year);

  const now = new Date();
  const todayYear = now.getFullYear();
  const todayMonth = now.getMonth() + 1;

  const score = yearScore(yearData);
  const pct = score.total ? score.done / score.total : 0;
  const featured = selectFeaturedMonth(yearData, selected);

  const dailyCount = countChallenges(yearData, (kind) => kind === 'daily');
  const oneshotCount = countChallenges(yearData, (kind) => kind === 'oneshot');
  const remainingCount = countChallenges(
    yearData,
    (_, status) => status === 'todo' || status === 'doing',
  );

  return (
    <div
      className="twelve-travaux-page"
      style={{
        width: '100%',
        minHeight: '100%',
        background: PAPER,
        color: INK,
        fontFamily: '"Space Grotesk", sans-serif',
        boxSizing: 'border-box',
      }}
    >
      {/* Masthead */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingBottom: 14,
          borderBottom: `1px solid ${RULE}`,
        }}
      >
        <a
          href="/"
          style={{
            fontFamily: '"Space Grotesk", sans-serif',
            fontWeight: 600,
            fontSize: 12,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: INK,
            textDecoration: 'none',
            borderBottom: `1px solid ${INK}`,
            paddingBottom: 1,
          }}
        >
          borso<span style={{ color: ACCENT }}>.</span>fr
        </a>
        <div style={{ display: 'flex', gap: 0 }}>
          {ALL_YEARS.map((candidateYear) => (
            <button
              type="button"
              key={candidateYear}
              onClick={() => {
                setYear(candidateYear);
                setSelected(pickDefaultMonth(candidateYear, new Date()));
              }}
              style={{
                all: 'unset',
                cursor: 'pointer',
                fontFamily: '"Space Grotesk", sans-serif',
                fontWeight: 500,
                fontSize: 12,
                padding: '8px 14px',
                background: candidateYear === year ? INK : 'transparent',
                color: candidateYear === year ? PAPER : INK,
                border: `1px solid ${INK}`,
                letterSpacing: '0.08em',
              }}
            >
              {candidateYear}
            </button>
          ))}
        </div>
      </div>

      {/* Title — Les 12 travaux */}
      <div
        className="twelve-travaux-masthead-title"
        style={{
          padding: '48px 0 28px',
          borderBottom: `1px solid ${RULE}`,
          gap: 32,
          alignItems: 'end',
        }}
      >
        <h1
          className="twelve-travaux-title"
          style={{
            fontFamily: '"Instrument Serif", serif',
            fontWeight: 400,
            lineHeight: 0.85,
            margin: 0,
            letterSpacing: '-0.035em',
            color: INK,
            fontStyle: 'italic',
          }}
        >
          Les douze
          <br />
          travaux<span style={{ color: ACCENT, fontStyle: 'normal' }}>.</span>
        </h1>
        <div style={{ textAlign: 'right', maxWidth: 380, paddingBottom: 10, justifySelf: 'end' }}>
          <div
            style={{
              fontFamily: '"Space Grotesk", sans-serif',
              fontWeight: 600,
              fontSize: 11,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: ACCENT,
              marginBottom: 10,
            }}
          >
            Le projet
          </div>
          <div
            style={{
              fontFamily: '"Instrument Serif", serif',
              fontStyle: 'italic',
              fontSize: 20,
              lineHeight: 1.3,
              color: INK,
            }}
          >
            Douze défis par an, un par mois. Liste fixée en janvier, consignée au fil de l'année.
          </div>
        </div>
      </div>

      {/* Hero — year */}
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
              fontFamily: '"Space Grotesk", sans-serif',
              fontWeight: 600,
              fontSize: 12,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: MUTED,
              marginBottom: 10,
            }}
          >
            Édition
          </div>
          <h2
            className="twelve-travaux-hero-year"
            style={{
              fontFamily: '"Instrument Serif", serif',
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
              fontFamily: '"Instrument Serif", serif',
              fontStyle: 'italic',
              fontSize: 30,
              color: INK,
              marginTop: 18,
              maxWidth: 520,
              lineHeight: 1.2,
            }}
          >
            {yearData.title}
            <span style={{ color: ACCENT }}>.</span>
          </div>
          <div
            style={{
              fontFamily: '"Space Grotesk", sans-serif',
              fontSize: 14,
              color: '#3a3530',
              marginTop: 12,
              maxWidth: 520,
              lineHeight: 1.5,
            }}
          >
            {yearData.subtitle}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div
              style={{
                fontFamily: '"Space Grotesk", sans-serif',
                fontWeight: 500,
                fontSize: 11,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: MUTED,
              }}
            >
              Bilan en cours
            </div>
            <div
              style={{
                fontFamily: '"Instrument Serif", serif',
                fontSize: 72,
                lineHeight: 0.9,
                color: INK,
              }}
            >
              {formatScore(score.done)}
              <span style={{ color: ACCENT }}>/</span>
              {score.total}
            </div>
          </div>
          <div
            style={{
              height: 10,
              background: STRIPE_LIGHT,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: `${pct * 100}%`,
                background: INK,
                transition: 'width 1s cubic-bezier(.2,.7,.3,1)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: `${pct * 100}%`,
                top: -3,
                bottom: -3,
                width: 2,
                background: ACCENT,
              }}
            />
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 12,
              marginTop: 6,
            }}
          >
            <MiniStat label="Quotidiens" value={dailyCount} />
            <MiniStat label="Ponctuels" value={oneshotCount} />
            <MiniStat label="Restants" value={remainingCount} accent />
          </div>
        </div>
      </div>

      {/* Featured month */}
      <FeaturedMonth month={featured} year={year} />

      {/* Filmstrip */}
      <div style={{ marginTop: 32 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: 14,
          }}
        >
          <div
            style={{
              fontFamily: '"Space Grotesk", sans-serif',
              fontWeight: 600,
              fontSize: 11,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: INK,
            }}
          >
            L'année en douze chapitres
          </div>
          <div
            style={{
              fontFamily: '"Space Grotesk", sans-serif',
              fontSize: 11,
              color: MUTED,
              letterSpacing: '0.04em',
            }}
          >
            cliquer pour mettre en focus
          </div>
        </div>
        <div className="twelve-travaux-filmstrip" style={{ gap: 8, minHeight: 200 }}>
          {yearData.months.map((month) => (
            <FilmstripCard
              key={month.m}
              month={month}
              active={selected === month.m}
              isCurrent={year === todayYear && month.m === todayMonth}
              onSelect={() => setSelected(month.m)}
            />
          ))}
        </div>
      </div>

      {/* Footer rule */}
      <div
        style={{
          marginTop: 36,
          paddingTop: 14,
          borderTop: `1px solid ${RULE}`,
          display: 'flex',
          justifyContent: 'space-between',
          fontFamily: '"Space Grotesk", sans-serif',
          fontSize: 11,
          color: MUTED,
          letterSpacing: '0.06em',
        }}
      >
        <span>borso.fr · les 12 travaux</span>
      </div>
    </div>
  );
}
