const LABEL_STYLE = { opacity: 0.7, fontSize: '0.85rem' } as const;

interface StatusItemProps {
  label: string;
  value: string;
}

export function StatusItem({ label, value }: StatusItemProps) {
  return (
    <div className="status-item">
      <div style={LABEL_STYLE}>{label}</div>
      <div>{value}</div>
    </div>
  );
}
