import type { CSSProperties } from 'react';
import type { Month } from './data';
import { filmstripBarColor, formatScore, monthScore } from './data.utils';
import { ACCENT, DASH_RULE, INK, PAPER } from './theme';

const ACTIVE_INNER_BORDER = '#3a3530';

export function FilmstripCard({
  month,
  active,
  isCurrent,
  onSelect,
}: {
  month: Month;
  active: boolean;
  isCurrent: boolean;
  onSelect: () => void;
}) {
  const score = monthScore(month);
  const summary =
    month.challenges
      .slice(0, 2)
      .map((challenge) => challenge.t)
      .join(' · ') + (month.challenges.length > 2 ? ` +${month.challenges.length - 2}` : '');
  const borderRest = active ? INK : DASH_RULE;
  const innerBorder = active ? ACTIVE_INNER_BORDER : DASH_RULE;
  const baseStyle: CSSProperties = {
    all: 'unset',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
    height: '100%',
    background: active ? INK : 'transparent',
    color: active ? PAPER : INK,
    border: `1px solid ${borderRest}`,
    transition: 'all .15s',
  };
  return (
    <button
      type="button"
      onClick={onSelect}
      style={baseStyle}
      onMouseEnter={(event) => {
        if (!active) event.currentTarget.style.borderColor = INK;
      }}
      onMouseLeave={(event) => {
        if (!active) event.currentTarget.style.borderColor = DASH_RULE;
      }}
    >
      <div
        style={{
          padding: '14px 14px 10px',
          borderBottom: `1px solid ${innerBorder}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span
          style={{
            fontFamily: '"Space Grotesk", sans-serif',
            fontWeight: 600,
            fontSize: 10,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            opacity: active ? 0.7 : 0.55,
          }}
        >
          {String(month.m).padStart(2, '0')}
        </span>
        {isCurrent && (
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: ACCENT,
            }}
          />
        )}
      </div>
      <div style={{ padding: '12px 14px 14px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            fontFamily: '"Instrument Serif", serif',
            fontSize: 24,
            lineHeight: 0.95,
            letterSpacing: '-0.01em',
            marginBottom: 8,
          }}
        >
          {month.name}
        </div>
        <div
          style={{
            fontFamily: '"Space Grotesk", sans-serif',
            fontSize: 10,
            letterSpacing: '0.04em',
            opacity: active ? 0.7 : 0.55,
            lineHeight: 1.4,
            flex: 1,
            marginBottom: 12,
          }}
        >
          {summary}
        </div>
        <div style={{ display: 'flex', gap: 3, marginBottom: 8 }}>
          {month.challenges.map((challenge) => (
            <div
              key={challenge.t}
              style={{
                flex: 1,
                height: 3,
                background: filmstripBarColor(challenge.status, active),
              }}
            />
          ))}
        </div>
        <div
          style={{
            fontFamily: '"Space Grotesk", sans-serif',
            fontSize: 10,
            opacity: active ? 0.7 : 0.55,
            letterSpacing: '0.08em',
          }}
        >
          {formatScore(score.done)}/{score.total}
        </div>
      </div>
    </button>
  );
}
