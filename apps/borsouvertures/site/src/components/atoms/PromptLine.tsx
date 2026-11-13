export type PromptLeadFont = 'text' | 'notation';

interface PromptLineProps {
  lead: string;
  detail: string;
  leadFont: PromptLeadFont;
}

const LEAD_CLASS_BY_FONT = {
  text: 'font-bold',
  notation: 'font-mono font-bold',
} as const satisfies Record<PromptLeadFont, string>;

// @FollowsBlueprint atom-plain
export function PromptLine({ lead, detail, leadFont }: PromptLineProps) {
  return (
    <p className="flex flex-wrap items-baseline gap-x-2 min-h-6 text-base leading-snug">
      <span className={LEAD_CLASS_BY_FONT[leadFont]}>{lead}</span>
      <span className="min-w-0 max-w-full truncate text-sm text-ink-muted first-letter:uppercase">
        {detail}
      </span>
    </p>
  );
}
