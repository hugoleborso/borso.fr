interface StatusPanelProps {
  inBook: boolean;
  openingName?: string;
  variationName?: string;
  lineName?: string;
  candidateCount: number;
}

export function StatusPanel({
  inBook,
  openingName,
  variationName,
  lineName,
  candidateCount,
}: StatusPanelProps) {
  return (
    <div className="panel">
      <div className="controls-row" style={{ justifyContent: 'space-between' }}>
        <div>
          <span className="pill">{inBook ? 'In book' : 'Out of book'}</span>
        </div>
        <div>Matches: {candidateCount}</div>
      </div>
      <div className="status-grid" style={{ marginTop: '0.75rem' }}>
        <div className="status-item">
          <div style={{ opacity: 0.7, fontSize: '0.85rem' }}>Opening</div>
          <div>{openingName ?? '—'}</div>
        </div>
        <div className="status-item">
          <div style={{ opacity: 0.7, fontSize: '0.85rem' }}>Variation</div>
          <div>{variationName ?? '—'}</div>
        </div>
        <div className="status-item">
          <div style={{ opacity: 0.7, fontSize: '0.85rem' }}>Line</div>
          <div>{lineName ?? '—'}</div>
        </div>
        <div className="status-item">
          <div style={{ opacity: 0.7, fontSize: '0.85rem' }}>Possible next moves</div>
          <div>{candidateCount > 0 ? 'See arrows when requested' : '—'}</div>
        </div>
      </div>
    </div>
  );
}
