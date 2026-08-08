interface ErrorPanelProps {
  title: string;
  message: string;
  reloadLabel: string;
  onReload: () => void;
}

export function ErrorPanel({ title, message, reloadLabel, onReload }: ErrorPanelProps) {
  return (
    <div className="panel" role="alert">
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      <p>{message}</p>
      <button type="button" className="btn active" onClick={onReload}>
        {reloadLabel}
      </button>
    </div>
  );
}
