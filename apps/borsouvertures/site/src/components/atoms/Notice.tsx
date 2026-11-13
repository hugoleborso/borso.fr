interface NoticeProps {
  message: string;
}

// @FollowsBlueprint atom-plain
export function Notice({ message }: NoticeProps) {
  return (
    <p className="px-3 py-2.5 rounded-md bg-signal text-on-signal font-medium" role="status">
      {message}
    </p>
  );
}
