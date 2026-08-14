import clsx from 'clsx';

export type MiniStatTone = 'ink' | 'accent';

const VALUE_CLASS_NAME = 'font-labours-serif text-[36px] leading-none';

const VALUE_COLOR_BY_TONE: Readonly<Record<MiniStatTone, string>> = {
  ink: 'text-labours-ink',
  accent: 'text-labours-accent',
};

interface MiniStatProps {
  label: string;
  value: number;
  tone: MiniStatTone;
}

// @FollowsBlueprint atom-plain
export function MiniStat({ label, value, tone }: MiniStatProps) {
  return (
    <div className="border-t border-labours-rule pt-2">
      <div className="mb-1 font-labours-sans text-[10px] font-medium tracking-[0.16em] text-labours-muted uppercase">
        {label}
      </div>
      <div className={clsx(VALUE_CLASS_NAME, VALUE_COLOR_BY_TONE[tone])}>{value}</div>
    </div>
  );
}
