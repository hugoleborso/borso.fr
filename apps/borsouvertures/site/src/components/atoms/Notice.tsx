interface NoticeAction {
  label: string;
  onActivate: () => void;
}

interface NoticeProps {
  message: string;
  action?: NoticeAction;
}

const ACTION_CLASS =
  'shrink-0 min-h-12 px-3 rounded-md border-2 border-on-signal text-on-signal font-bold ' +
  'active:scale-[0.98]';

// @FollowsBlueprint atom-plain
export function Notice({ message, action }: NoticeProps) {
  return (
    <div
      className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-md bg-signal text-on-signal font-medium"
      role="status"
    >
      <p>{message}</p>
      {action === undefined ? null : (
        <button type="button" className={ACTION_CLASS} onClick={action.onActivate}>
          {action.label}
        </button>
      )}
    </div>
  );
}
