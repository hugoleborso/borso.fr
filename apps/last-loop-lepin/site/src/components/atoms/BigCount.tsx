const COUNT_CLASS =
  'font-display text-[clamp(28px,5vw,40px)] font-bold tabular-nums leading-none tracking-[-0.02em] text-ink';

const CAPTION_CLASS = 'text-[11px] uppercase tracking-[0.16em] text-ink-3';

interface BigCountProps {
  readonly count: number;
  readonly caption: string;
}

// @FollowsBlueprint atom-plain
export function BigCount({ count, caption }: BigCountProps) {
  return (
    <div className="flex items-baseline gap-2">
      <span className={COUNT_CLASS}>{count}</span>
      <span className={CAPTION_CLASS}>{caption}</span>
    </div>
  );
}
