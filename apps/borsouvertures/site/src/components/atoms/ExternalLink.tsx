interface ExternalLinkProps {
  href: string;
  label: string;
}

// @FollowsBlueprint atom-plain
export function ExternalLink({ href, label }: ExternalLinkProps) {
  return (
    <a
      className="inline-flex items-center min-h-11 text-accent underline break-words"
      href={href}
      target="_blank"
      rel="noreferrer"
    >
      {label}
    </a>
  );
}
