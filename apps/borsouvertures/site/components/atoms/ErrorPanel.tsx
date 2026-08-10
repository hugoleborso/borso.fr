interface ErrorPanelProps {
  title: string;
  message: string;
  reloadLabel: string;
  onReload: () => void;
}

// @FollowsBlueprint atom-plain
export function ErrorPanel({ title, message, reloadLabel, onReload }: ErrorPanelProps) {
  return (
    <div className="panel" role="alert">
      <h2 style={{ marginTop: 0 }}>{title}</h2>
      <p>{message}</p>
      <button type="button" className="btn active" onClick={onReload}>
        {reloadLabel}
      </button>
    </div>
  );
}
