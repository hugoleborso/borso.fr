export type PromptLeadFont = 'text' | 'notation';

interface PromptLineProps {
  lead: string;
  detail: string;
  leadFont: PromptLeadFont;
}

const LEAD_CLASS_BY_FONT = {
  text: 'h-6 text-base leading-6 font-bold truncate',
  notation: 'h-6 text-base leading-6 font-mono font-bold truncate',
} as const satisfies Record<PromptLeadFont, string>;

// @FollowsBlueprint atom-plain
export function PromptLine({ lead, detail, leadFont }: PromptLineProps) {
  return (
    <p className="flex flex-col">
      <span className={LEAD_CLASS_BY_FONT[leadFont]}>{lead}</span>
      <span className="h-5 text-sm leading-5 text-ink-muted truncate first-letter:uppercase">
        {detail}
      </span>
    </p>
  );
}
