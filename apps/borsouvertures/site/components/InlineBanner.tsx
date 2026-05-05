interface InlineBannerProps {
  message: string;
  primaryLabel: string;
  onPrimaryClick: () => void;
  secondaryLabel?: string;
  onSecondaryClick?: () => void;
}

export function InlineBanner({
  message,
  primaryLabel,
  onPrimaryClick,
  secondaryLabel,
  onSecondaryClick,
}: InlineBannerProps) {
  return (
    <div className="panel inline-banner" role="status" aria-live="polite">
      <div className="inline-banner-message">{message}</div>
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
