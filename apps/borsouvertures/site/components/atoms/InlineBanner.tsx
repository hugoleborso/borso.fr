interface InlineBannerProps {
  message: string;
  primaryLabel: string;
  onPrimaryClick: () => void;
  secondaryLabel: string;
  onSecondaryClick: () => void;
}

const CELEBRATION_MARK = '🎉 ';

// @FollowsBlueprint atom-plain
export function InlineBanner({
  message,
  primaryLabel,
  onPrimaryClick,
  secondaryLabel,
  onSecondaryClick,
}: InlineBannerProps) {
  return (
    <div className="panel inline-banner inline-banner-celebrate" role="status" aria-live="polite">
      <div className="inline-banner-message">
        <span aria-hidden>{CELEBRATION_MARK}</span>
        {message}
      </div>
      <div className="controls-row">
        <button type="button" className="btn active" onClick={onPrimaryClick}>
          {primaryLabel}
        </button>
        <button type="button" className="btn" onClick={onSecondaryClick}>
          {secondaryLabel}
        </button>
      </div>
    </div>
  );
}
