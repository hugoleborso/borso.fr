const FLAP_CLASS =
  'relative inline-flex items-center justify-center w-[clamp(64px,14vw,128px)] h-[clamp(80px,18vw,160px)] rounded-lg border border-line bg-[linear-gradient(180deg,var(--color-bg-elev-2)_0%,var(--color-bg-elev-2)_49%,var(--color-bg)_50%,var(--color-bg)_100%)] font-mono text-[clamp(56px,12vw,112px)] font-bold tabular-nums leading-none tracking-[-0.02em] text-ink shadow-[0_6px_18px_rgba(0,0,0,0.35)] animate-flap';

interface FlapDigitProps {
  readonly digit: string;
}

// @FollowsBlueprint atom-plain
export function FlapDigit({ digit }: FlapDigitProps) {
  return (
    <span key={digit} className={FLAP_CLASS} aria-hidden>
      <span className="relative z-1">{digit}</span>
      <span className="absolute top-1/2 left-0 right-0 h-px bg-black/60 pointer-events-none" />
    </span>
  );
}
