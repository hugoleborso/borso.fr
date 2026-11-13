interface NoticeProps {
  message: string;
}

// @FollowsBlueprint atom-plain
export function Notice({ message }: NoticeProps) {
  return (
    <p className="p-3 rounded-lg border border-celebrate bg-sunken" role="status">
      {message}
    </p>
  );
}
