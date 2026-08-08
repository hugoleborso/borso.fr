import {
  ACCENT,
  INK,
  MUTED,
  RULE,
  SANS_FAMILY,
  SERIF_FAMILY,
} from '../../theme/twelve-labours.theme';

export type MiniStatTone = 'ink' | 'accent';

const VALUE_COLOR_BY_TONE: Readonly<Record<MiniStatTone, string>> = {
  ink: INK,
  accent: ACCENT,
};

interface MiniStatProps {
  label: string;
  value: number;
  tone: MiniStatTone;
}

export function MiniStat({ label, value, tone }: MiniStatProps) {
  return (
    <div style={{ borderTop: `1px solid ${RULE}`, paddingTop: 8 }}>
      <div
        style={{
          fontFamily: SANS_FAMILY,
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
          fontFamily: SERIF_FAMILY,
          fontSize: 36,
          lineHeight: 1,
          color: VALUE_COLOR_BY_TONE[tone],
        }}
      >
        {value}
      </div>
    </div>
  );
}
