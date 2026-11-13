interface LoadingPanelProps {
  message: string;
}

// @FollowsBlueprint atom-plain
export function LoadingPanel({ message }: LoadingPanelProps) {
  return (
    <div className="pt-3 border-t-2 border-ink" role="status" aria-live="polite">
      {message}
    </div>
  );
}
