import type { JSX, MouseEvent } from 'react';

export interface MarkdownContentProps {
  readonly html: string;
  readonly onClick?: (event: MouseEvent<HTMLDivElement>) => void;
}

const PROSE_CLASS =
  'text-body leading-[26px] text-ink-soft break-words ' +
  '[&_h1]:font-display [&_h1]:text-display [&_h1]:text-ink [&_h1]:mt-1 [&_h1]:mb-3 ' +
  '[&_h2]:font-display [&_h2]:text-(length:--text-focus) [&_h2]:leading-(--text-focus--line-height) [&_h2]:font-medium [&_h2]:text-ink [&_h2]:mt-6 [&_h2]:mb-2 ' +
  '[&_h3]:font-display [&_h3]:text-prose-heading [&_h3]:text-ink [&_h3]:mt-5 [&_h3]:mb-1.5 ' +
  '[&_p]:my-2.5 [&_ul]:my-2.5 [&_ul]:pl-5 [&_ul]:list-disc [&_ol]:my-2.5 [&_ol]:pl-5 [&_ol]:list-decimal ' +
  '[&_li]:my-1 [&_li]:marker:text-bronze ' +
  '[&_li:has(>input)]:list-none [&_li:has(>input)]:-ml-5 [&_li>input]:mr-2 [&_li>input]:accent-bronze ' +
  '[&_li:has(>input:checked)]:line-through [&_li:has(>input:checked)]:text-ink-muted ' +
  '[&_a]:text-patina [&_a]:underline [&_a]:underline-offset-2 ' +
  '[&_strong]:font-bold [&_strong]:text-ink [&_em]:italic ' +
  '[&_code]:font-mono [&_code]:text-mono-sm [&_code]:bg-sunk [&_code]:rounded-sm [&_code]:px-1 ' +
  '[&_pre]:bg-sunk [&_pre]:rounded-sm [&_pre]:p-3 [&_pre]:overflow-x-auto ' +
  '[&_blockquote]:my-3 [&_blockquote]:mx-0 [&_blockquote]:px-3 [&_blockquote]:py-2 [&_blockquote]:rounded-md [&_blockquote]:bg-patina-soft [&_blockquote]:text-ink ' +
  '[&_hr]:border-line [&_hr]:my-5 ' +
  '[&_table]:block [&_table]:overflow-x-auto [&_table]:text-body-sm [&_table]:my-3 ' +
  '[&_th]:text-left [&_th]:font-bold [&_th]:px-2 [&_th]:py-1 [&_th]:border-b [&_th]:border-line-strong ' +
  '[&_td]:px-2 [&_td]:py-1 [&_td]:border-b [&_td]:border-line [&_td]:align-top';

// @FollowsBlueprint atom-plain
export function MarkdownContent({ html, onClick }: MarkdownContentProps): JSX.Element {
  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- the click only intercepts the anchors inside, which keep their own keyboard behaviour.
    <div className={PROSE_CLASS} onClick={onClick} dangerouslySetInnerHTML={{ __html: html }} />
  );
}
