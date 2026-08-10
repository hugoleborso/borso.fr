interface AnnouncerProps {
  message: string;
}

export function Announcer({ message }: AnnouncerProps) {
  return (
    <div className="visually-hidden" aria-live="polite" aria-atomic="true">
      {message}
    </div>
  );
}
