interface InlineBannerProps {
  message: string;
  primaryLabel: string;
  onPrimaryClick: () => void;
  secondaryLabel?: string;
  onSecondaryClick?: () => void;
  /** When true, applies the gold-gradient + soft pulse animation. */
  celebrate?: boolean;
}

export function InlineBanner({
  message,
  primaryLabel,
  onPrimaryClick,
  secondaryLabel,
  onSecondaryClick,
  celebrate,
}: InlineBannerProps) {
  return (
    <div
      className={`panel inline-banner${celebrate ? ' inline-banner-celebrate' : ''}`}
      role="status"
      aria-live="polite"
    >
      <div className="inline-banner-message">{celebrate && <span aria-hidden>🎉 </span>}{message}</div>
      <div className="controls-row">
        <button type="button" className="btn active" onClick={onPrimaryClick}>
          {primaryLabel}
        </button>
        {secondaryLabel && onSecondaryClick && (
          <button type="button" className="btn" onClick={onSecondaryClick}>
            {secondaryLabel}
          </button>
        )}
      </div>
    </div>
  );
}
