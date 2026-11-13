export interface IdeaSection {
  heading: string;
  movesSan: string[];
  body: string;
}

export interface IdeasCredit {
  source: 'wikipedia';
  sourceUrl: string;
}

export interface IdeasFile {
  credit: IdeasCredit | null;
  sections: IdeaSection[];
}

export const IDEA_MAXIMUM_LENGTH = 280;

const FRONT_MATTER_FENCE = '---';
const SECTION_PREFIX = '## ';
const TITLE_PREFIX = '# ';
const SOURCE_LINE = 'source: wikipedia';
const SOURCE_URL_PATTERN = /^sourceUrl: (https:\/\/\S+)$/;
const MOVE_NUMBER_PATTERN = /^\d+\.(?:\.\.)?$/;
const FRONT_MATTER_LINE_COUNT = 4;
const PARAGRAPH_BREAK = '\n\n';

export class IdeasMarkdownError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IdeasMarkdownError';
  }
}

export function describeIdeasProblem(error: unknown): string {
  return error instanceof IdeasMarkdownError ? error.message : String(error);
}

function parseFrontMatter(lines: readonly string[]): IdeasCredit {
  const [, sourceLine, urlLine, closingFence] = lines;
  const sourceUrl = SOURCE_URL_PATTERN.exec(String(urlLine))?.[1];
  if (
    sourceLine !== SOURCE_LINE ||
    sourceUrl === undefined ||
    closingFence !== FRONT_MATTER_FENCE
  ) {
    throw new IdeasMarkdownError(
      'the front matter must be "---", "source: wikipedia", "sourceUrl: https://…" and "---"',
    );
  }
  return { source: 'wikipedia', sourceUrl };
}

function foldBody(lines: readonly string[]): string {
  return lines
    .join('\n')
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.replaceAll(/\s+/g, ' ').trim())
    .filter((paragraph) => paragraph.length > 0)
    .join(PARAGRAPH_BREAK);
}

function buildSection(heading: string, bodyLines: readonly string[]): IdeaSection {
  const movesSan = heading.split(/\s+/).filter((token) => !MOVE_NUMBER_PATTERN.test(token));
  if (movesSan.length === 0) {
    throw new IdeasMarkdownError(`the heading "${SECTION_PREFIX}${heading}" names no move`);
  }
  const body = foldBody(bodyLines);
  if (body.length === 0) {
    throw new IdeasMarkdownError(`the idea under "${heading}" is empty`);
  }
  if (body.length > IDEA_MAXIMUM_LENGTH) {
    throw new IdeasMarkdownError(
      `the idea under "${heading}" has ${body.length} characters, ${IDEA_MAXIMUM_LENGTH} at most`,
    );
  }
  return { heading, movesSan, body };
}

// @FollowsBlueprint core-parser-named-error
export function parseIdeasMarkdown(text: string): IdeasFile {
  const lines = text.replaceAll('\r\n', '\n').split('\n');
  const hasFrontMatter = lines[0] === FRONT_MATTER_FENCE;
  const credit = hasFrontMatter ? parseFrontMatter(lines) : null;
  const contentLines = hasFrontMatter ? lines.slice(FRONT_MATTER_LINE_COUNT) : lines;

  const title = contentLines.find((line) => line.startsWith(TITLE_PREFIX));
  if (title !== undefined) {
    throw new IdeasMarkdownError(`"${title}" is a "# " heading, only "## " headings are read`);
  }
  const [preamble, ...chunks] = `\n${contentLines.join('\n')}`.split(`\n${SECTION_PREFIX}`);
  const stray = String(preamble)
    .split('\n')
    .find((line) => line.trim().length > 0);
  if (stray !== undefined) {
    throw new IdeasMarkdownError(`"${stray}" comes before the first "## " heading`);
  }
  const sections = chunks.map((chunk) => {
    const [heading, ...bodyLines] = chunk.split('\n');
    return buildSection(String(heading).trim(), bodyLines);
  });
  return { credit, sections };
}
