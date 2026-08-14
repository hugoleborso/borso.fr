interface LoadingPanelProps {
  message: string;
}

// @FollowsBlueprint atom-plain
export function LoadingPanel({ message }: LoadingPanelProps) {
  return (
    <div
      className="p-4 rounded-xl border border-panel-line bg-panel backdrop-blur-[6px]"
      role="status"
      aria-live="polite"
    >
      {message}
    </div>
  );
}
