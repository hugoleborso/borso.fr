import { describe, expect, it } from 'vitest';
import {
  describeIdeasProblem,
  IDEA_MAXIMUM_LENGTH,
  IdeasMarkdownError,
  parseIdeasMarkdown,
} from './ideas-markdown.core';

const FRONT_MATTER =
  '---\nsource: wikipedia\nsourceUrl: https://en.wikipedia.org/wiki/Albin_Countergambit\n---\n';

function readFailure(text: string): string {
  try {
    parseIdeasMarkdown(text);
  } catch (error) {
    if (error instanceof IdeasMarkdownError) return `${error.name}: ${error.message}`;
  }
  return 'no IdeasMarkdownError';
}

// @FollowsBlueprint test-pure-unit
describe('parseIdeasMarkdown', () => {
  it('reads one section per heading and drops the move numbers', () => {
    const file = parseIdeasMarkdown(
      '## 1. d4 d5\n\nMeet the pawn.\n\n## 1. d4 d5 2. c4 e5\n\nThe gambit.\n\n## 1... d5 12. Nf3 12... Nc6\n\nNumbers.\n',
    );
    expect(file).toEqual({
      credit: null,
      sections: [
        { heading: '1. d4 d5', movesSan: ['d4', 'd5'], body: 'Meet the pawn.' },
        { heading: '1. d4 d5 2. c4 e5', movesSan: ['d4', 'd5', 'c4', 'e5'], body: 'The gambit.' },
        { heading: '1... d5 12. Nf3 12... Nc6', movesSan: ['d5', 'Nf3', 'Nc6'], body: 'Numbers.' },
      ],
    });
  });

  it('folds a line break into a space and keeps a blank line as a paragraph break', () => {
    const file = parseIdeasMarkdown(
      '##   d4   d5  \n\nFirst line\n  second line.\n\n\n \nSecond   paragraph.\n\n',
    );
    expect(file.sections).toEqual([
      {
        heading: 'd4   d5',
        movesSan: ['d4', 'd5'],
        body: 'First line second line.\n\nSecond paragraph.',
      },
    ]);
  });

  it('keeps two paragraphs separated by one empty line', () => {
    expect(parseIdeasMarkdown('## d4 d5\n\nFirst.\n\nSecond.\n').sections[0]?.body).toBe(
      'First.\n\nSecond.',
    );
  });

  it('reads a heading on the last line with no line break after it as an empty idea', () => {
    expect(readFailure('## d4 d5')).toBe('IdeasMarkdownError: the idea under "d4 d5" is empty');
  });

  it('reads Windows line endings', () => {
    expect(parseIdeasMarkdown('## d4 d5\r\n\r\nMeet the pawn.\r\n').sections).toEqual([
      { heading: 'd4 d5', movesSan: ['d4', 'd5'], body: 'Meet the pawn.' },
    ]);
  });

  it('reads the Wikipedia front matter', () => {
    expect(parseIdeasMarkdown(`${FRONT_MATTER}\n## d4 d5\n\nMeet the pawn.\n`)).toEqual({
      credit: {
        source: 'wikipedia',
        sourceUrl: 'https://en.wikipedia.org/wiki/Albin_Countergambit',
      },
      sections: [{ heading: 'd4 d5', movesSan: ['d4', 'd5'], body: 'Meet the pawn.' }],
    });
  });

  it('reads an empty file as no section', () => {
    expect(parseIdeasMarkdown('')).toEqual({ credit: null, sections: [] });
    expect(parseIdeasMarkdown('\n  \n')).toEqual({ credit: null, sections: [] });
  });

  it.each([
    ['---\nsource: lichess\nsourceUrl: https://lichess.org/x\n---\n'],
    ['---\nsource: wikipedia\nsourceUrl: http://en.wikipedia.org/wiki/X\n---\n'],
    ['---\nsource: wikipedia\nsourceUrl: https://en.wikipedia.org/wiki/X extra\n---\n'],
    ['---\nsource: wikipedia\nsourceUrl: https://en.wikipedia.org/wiki/X\nlicence: x\n---\n'],
    ['---\nsource: wikipedia\n'],
    ['---'],
  ])('refuses the front matter %j', (frontMatter) => {
    expect(readFailure(`${frontMatter}\n## d4 d5\n\nMeet the pawn.\n`)).toBe(
      'IdeasMarkdownError: the front matter must be "---", "source: wikipedia", "sourceUrl: https://…" and "---"',
    );
  });

  it('refuses a front matter cut short after its first fence', () => {
    expect(readFailure('---')).toBe(
      'IdeasMarkdownError: the front matter must be "---", "source: wikipedia", "sourceUrl: https://…" and "---"',
    );
  });

  it('describes its own error by its message and anything else as text', () => {
    expect(describeIdeasProblem(new IdeasMarkdownError('the idea is empty'))).toBe(
      'the idea is empty',
    );
    expect(describeIdeasProblem(new TypeError('not a text'))).toBe('TypeError: not a text');
    expect(describeIdeasProblem('stopped')).toBe('stopped');
  });

  it('refuses a "# " heading, before or inside a section', () => {
    expect(readFailure('# Albin ideas\n\n## d4 d5\n\nMeet the pawn.\n')).toBe(
      'IdeasMarkdownError: "# Albin ideas" is a "# " heading, only "## " headings are read',
    );
    expect(readFailure('## d4 d5\n\nMeet the pawn.\n# Next\n')).toBe(
      'IdeasMarkdownError: "# Next" is a "# " heading, only "## " headings are read',
    );
  });

  it('refuses text before the first section', () => {
    expect(readFailure('Ideas of the deck.\n\n## d4 d5\n\nMeet the pawn.\n')).toBe(
      'IdeasMarkdownError: "Ideas of the deck." comes before the first "## " heading',
    );
  });

  it('refuses a heading that names no move', () => {
    expect(readFailure('## 1. 1...\n\nNothing.\n')).toBe(
      'IdeasMarkdownError: the heading "## 1. 1..." names no move',
    );
  });

  it('refuses an empty idea, in the middle and at the end of the file', () => {
    expect(readFailure('## d4 d5\n\n## d4 d5 c4 e5\n\nThe gambit.\n')).toBe(
      'IdeasMarkdownError: the idea under "d4 d5" is empty',
    );
    expect(readFailure('## d4 d5\n\nMeet the pawn.\n\n## d4 d5 c4 e5\n \n')).toBe(
      'IdeasMarkdownError: the idea under "d4 d5 c4 e5" is empty',
    );
  });

  it('accepts a body of 280 characters and refuses one of 281', () => {
    const longest = 'a'.repeat(IDEA_MAXIMUM_LENGTH);
    expect(IDEA_MAXIMUM_LENGTH).toBe(280);
    expect(parseIdeasMarkdown(`## d4 d5\n\n${longest}\n`).sections[0]?.body).toBe(longest);
    expect(readFailure(`## d4 d5\n\n${longest}a\n`)).toBe(
      'IdeasMarkdownError: the idea under "d4 d5" has 281 characters, 280 at most',
    );
  });
});
