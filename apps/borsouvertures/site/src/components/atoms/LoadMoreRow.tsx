import { BUTTON_CLASS } from './buttonStyles';
import type { LoadMoreRowProps } from './loadMoreRow.types';

// @FollowsBlueprint atom-plain
export function LoadMoreRow({ label, onLoadMore }: LoadMoreRowProps) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
      <button type="button" className={BUTTON_CLASS} onClick={onLoadMore}>
        {label}
      </button>
    </div>
  );
}
