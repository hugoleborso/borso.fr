import { ACTIVE_BUTTON_CLASS, BUTTON_CLASS } from './buttonStyles';

interface InlineBannerProps {
  message: string;
  primaryLabel: string;
  onPrimaryClick: () => void;
  secondaryLabel: string;
  onSecondaryClick: () => void;
}

const CELEBRATION_MARK = '🎉 ';

const BANNER_CLASS =
  'flex flex-col gap-[0.6rem] mt-3 p-4 rounded-xl border border-celebrate ' +
  'bg-[image:var(--gradient-celebrate)] backdrop-blur-[6px] ' +
  'shadow-[0_0_0_1px_rgba(255,216,74,0.4),0_10px_30px_rgba(255,216,74,0.18),0_0_60px_rgba(108,99,255,0.25)] ' +
  'animate-celebrate-pulse motion-reduce:animate-none';

// @FollowsBlueprint atom-plain
export function InlineBanner({
  message,
  primaryLabel,
  onPrimaryClick,
  secondaryLabel,
  onSecondaryClick,
}: InlineBannerProps) {
  return (
    <div className={BANNER_CLASS} role="status" aria-live="polite">
      <div className="text-[1.05rem] font-semibold tracking-[0.01em]">
        <span aria-hidden>{CELEBRATION_MARK}</span>
        {message}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className={ACTIVE_BUTTON_CLASS} onClick={onPrimaryClick}>
          {primaryLabel}
        </button>
        <button type="button" className={BUTTON_CLASS} onClick={onSecondaryClick}>
          {secondaryLabel}
        </button>
      </div>
    </div>
  );
}
