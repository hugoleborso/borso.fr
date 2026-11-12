export interface TitledMarkdown {
  readonly title: string;
  readonly rest: string;
}

const TITLE_PREFIX = '# ';
const LINE_BREAK = '\n';

// @FollowsBlueprint core-view-projection
export function splitTitleLine(markdown: string): TitledMarkdown {
  const opening = markdown.trimStart();
  if (!opening.startsWith(TITLE_PREFIX)) return { title: '', rest: markdown };
  const lineEnd = opening.indexOf(LINE_BREAK);
  return lineEnd === -1
    ? { title: opening, rest: '' }
    : { title: opening.slice(0, lineEnd), rest: opening.slice(lineEnd + 1) };
}
