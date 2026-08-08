import type { LoadMoreRowProps } from './loadMoreRow.types';

export function LoadMoreRow({ label, onLoadMore }: LoadMoreRowProps) {
  return (
    <div className="controls-row selector-load-more">
      <button type="button" className="btn" onClick={onLoadMore}>
        {label}
      </button>
    </div>
  );
}
