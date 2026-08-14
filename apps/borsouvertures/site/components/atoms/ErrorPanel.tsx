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
    <div
      className="p-4 rounded-xl border border-panel-line bg-panel backdrop-blur-[6px]"
      role="alert"
    >
      <h2 className="mb-[1.17rem] text-[1.17rem] font-bold">{title}</h2>
      <p className="my-4">{message}</p>
      <button type="button" className={ACTIVE_BUTTON_CLASS} onClick={onReload}>
        {reloadLabel}
      </button>
    </div>
  );
}
