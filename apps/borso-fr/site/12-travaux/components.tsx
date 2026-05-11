import type { ChallengeStatus } from './data';
import { statusColorRole, statusLabel } from './data.utils';
import {
  ACCENT,
  BAD_INK,
  INK,
  MUTED,
  PAPER,
  RULE,
  STRIPE_ACCENT_DARK,
  STRIPE_DARK,
  STRIPE_LIGHT,
  WARN_INK,
} from './theme';

const ROLE_COLOR = {
  ink: INK,
  warn: WARN_INK,
  bad: BAD_INK,
  muted: MUTED,
  live: ACCENT,
  future: MUTED,
} as const satisfies Record<ReturnType<typeof statusColorRole>, string>;

function roleColor(status: ChallengeStatus): string {
  return ROLE_COLOR[statusColorRole(status)];
}

export function StatusTag({ status, big }: { status: ChallengeStatus; big?: boolean }) {
  const isLive = status === 'doing';
  const fg = isLive ? PAPER : roleColor(status);
  const bg = isLive ? ACCENT : 'transparent';
  const borderColor = isLive ? ACCENT : fg;
  return (
    <span
      style={{
        fontFamily: '"Space Grotesk", sans-serif',
        fontWeight: 500,
        fontSize: big ? 12 : 10,
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
        padding: big ? '5px 10px' : '3px 7px',
        background: bg,
        color: fg,
        border: `1px solid ${borderColor}`,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
      }}
    >
      {statusLabel(status)}
    </span>
  );
}

export function ImageSlot({
  label,
  height,
  accent,
}: {
  label: string;
  height?: number;
  accent?: boolean;
}) {
  const base = accent ? ACCENT : STRIPE_LIGHT;
  const alt = accent ? STRIPE_ACCENT_DARK : STRIPE_DARK;
  return (
    <div
      style={{
        height: height ?? 240,
        background: `repeating-linear-gradient(135deg, ${base} 0 8px, ${alt} 8px 16px)`,
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'flex-end',
      }}
    >
      <div
        style={{
          fontFamily: '"Space Grotesk", sans-serif',
          fontSize: 10,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: '#fff',
          background: 'rgba(23,20,16,0.85)',
          padding: '4px 8px',
          margin: 8,
        }}
      >
        {label}
      </div>
    </div>
  );
}

export function MiniStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div style={{ borderTop: `1px solid ${RULE}`, paddingTop: 8 }}>
      <div
        style={{
          fontFamily: '"Space Grotesk", sans-serif',
          fontWeight: 500,
          fontSize: 10,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: MUTED,
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: '"Instrument Serif", serif',
          fontSize: 36,
          lineHeight: 1,
          color: accent ? ACCENT : INK,
        }}
      >
        {value}
      </div>
    </div>
  );
}
