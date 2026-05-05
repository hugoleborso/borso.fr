interface ErrorPanelProps {
  message: string;
  onReload: () => void;
}

export function ErrorPanel({ message, onReload }: ErrorPanelProps) {
  return (
    <div className="panel" role="alert">
      <h3 style={{ marginTop: 0 }}>Couldn't load openings</h3>
      <p>{message}</p>
      <button type="button" className="btn active" onClick={onReload}>
        Reload
      </button>
    </div>
  );
}
