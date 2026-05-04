interface LoadingPanelProps {
  message?: string;
}

export function LoadingPanel({ message = 'Loading openings…' }: LoadingPanelProps) {
  return (
    <div className="panel" role="status" aria-live="polite">
      {message}
    </div>
  );
}
