interface ExternalLinkProps {
  href: string;
  label: string;
}

// @FollowsBlueprint atom-plain
export function ExternalLink({ href, label }: ExternalLinkProps) {
  return (
    <a
      className="inline-flex items-center self-start min-h-11 font-bold text-ink underline underline-offset-4 decoration-2 decoration-accent break-words"
      href={href}
      target="_blank"
      rel="noreferrer"
    >
      {label}
    </a>
  );
}
