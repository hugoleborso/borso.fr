import { ACTIVE_BUTTON_CLASS, BUTTON_CLASS } from './buttonStyles';

interface InlineBannerProps {
  message: string;
  primaryLabel: string;
  onPrimaryClick: () => void;
  secondaryLabel: string;
  onSecondaryClick: () => void;
}

const BANNER_CLASS = 'flex flex-col gap-3 mt-3 p-4 rounded-md bg-signal text-on-signal';

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
      <div className="text-lg font-bold leading-snug">{message}</div>
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
