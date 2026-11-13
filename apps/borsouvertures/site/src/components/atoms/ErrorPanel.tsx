import { ACTIVE_BUTTON_CLASS } from './buttonStyles';

interface ErrorPanelProps {
  title: string;
  message: string;
  reloadLabel: string;
  onReload: () => void;
}

// @FollowsBlueprint atom-plain
export function ErrorPanel({ title, message, reloadLabel, onReload }: ErrorPanelProps) {
  return (
    <div className="pt-3 border-t-[3px] border-ink" role="alert">
      <h2 className="mb-3 text-xl font-bold">{title}</h2>
      <p className="my-4">{message}</p>
      <button type="button" className={ACTIVE_BUTTON_CLASS} onClick={onReload}>
        {reloadLabel}
      </button>
    </div>
  );
}
