interface LoadingPanelProps {
  message: string;
}

// @FollowsBlueprint atom-plain
export function LoadingPanel({ message }: LoadingPanelProps) {
  return (
    <div className="panel" role="status" aria-live="polite">
      {message}
    </div>
  );
}
