interface LoadingPanelProps {
  message: string;
}

// @FollowsBlueprint atom-plain
export function LoadingPanel({ message }: LoadingPanelProps) {
  return (
    <div className="pt-3 border-t-[3px] border-ink" role="status" aria-live="polite">
      {message}
    </div>
  );
}
