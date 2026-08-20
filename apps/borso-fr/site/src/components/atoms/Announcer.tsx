interface AnnouncerProps {
  message: string;
}

// @FollowsBlueprint atom-plain
export function Announcer({ message }: AnnouncerProps) {
  return (
    <div className="sr-only" aria-live="polite" aria-atomic="true">
      {message}
    </div>
  );
}
