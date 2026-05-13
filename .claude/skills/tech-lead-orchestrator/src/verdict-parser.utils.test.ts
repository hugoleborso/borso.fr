import { describe, expect, it } from 'vitest';
import { extractFrontMatter, parseVerdictFromMarkdown } from './verdict-parser.utils';

function withFrontMatter(yaml: string, body = 'Body.'): string {
  return `---\n${yaml}\n---\n\n${body}\n`;
}

describe('extractFrontMatter', () => {
  it('returns the YAML between the leading --- delimiters', () => {
    expect(extractFrontMatter(withFrontMatter('status: done\nsummary: ok'))).toBe(
      'status: done\nsummary: ok',
    );
  });

  it('returns null when no front-matter is present', () => {
    expect(extractFrontMatter('# just a markdown body')).toBeNull();
  });
});

describe('parseVerdictFromMarkdown', () => {
  it('parses a valid done verdict with no next', () => {
    const verdict = parseVerdictFromMarkdown(
      withFrontMatter('status: done\nsummary: implemented\nartifacts:\n  - a.ts\n  - b.ts'),
    );
    expect(verdict).toEqual({
      status: 'done',
      summary: 'implemented',
      artifacts: ['a.ts', 'b.ts'],
    });
  });

  it('parses a verdict with next: validate', () => {
    const verdict = parseVerdictFromMarkdown(
      withFrontMatter('status: done\nsummary: ok\nartifacts: []\nnext:\n  kind: validate'),
    );
    expect(verdict.next).toEqual({ kind: 'validate' });
  });

  it('parses a verdict with next: answer-needed including options', () => {
    const verdict = parseVerdictFromMarkdown(
      withFrontMatter(
        'status: question\nsummary: needs input\nartifacts: []\nnext:\n  kind: answer-needed\n  question: which library?\n  options:\n    - lib-a\n    - lib-b',
      ),
    );
    expect(verdict.next).toEqual({
      kind: 'answer-needed',
      question: 'which library?',
      options: ['lib-a', 'lib-b'],
    });
  });

  it('parses a verdict with next: answer-needed without options', () => {
    const verdict = parseVerdictFromMarkdown(
      withFrontMatter(
        'status: question\nsummary: needs input\nartifacts: []\nnext:\n  kind: answer-needed\n  question: open?',
      ),
    );
    expect(verdict.next).toEqual({ kind: 'answer-needed', question: 'open?' });
  });

  it('parses a verdict with next: replan', () => {
    const verdict = parseVerdictFromMarkdown(
      withFrontMatter(
        'status: failed\nsummary: plan flaw\nartifacts: []\nnext:\n  kind: replan\n  scope: validation strategy',
      ),
    );
    expect(verdict.next).toEqual({ kind: 'replan', scope: 'validation strategy' });
  });

  it('parses a verdict with next: escalate', () => {
    const verdict = parseVerdictFromMarkdown(
      withFrontMatter(
        'status: blocked\nsummary: blocked\nartifacts: []\nnext:\n  kind: escalate\n  reason: spec gap',
      ),
    );
    expect(verdict.next).toEqual({ kind: 'escalate', reason: 'spec gap' });
  });

  it('returns a blocked verdict when front-matter is missing', () => {
    const verdict = parseVerdictFromMarkdown('# only body, no front matter');
    expect(verdict.status).toBe('blocked');
    expect(verdict.next).toEqual({
      kind: 'escalate',
      reason: 'unparseable-verdict: missing-front-matter',
    });
  });

  it('returns a blocked verdict when the YAML is malformed', () => {
    const verdict = parseVerdictFromMarkdown('---\nstatus: done\n  invalid: indent\n---\n');
    expect(verdict.status).toBe('blocked');
    expect(verdict.next).toEqual({
      kind: 'escalate',
      reason: 'unparseable-verdict: malformed-yaml',
    });
  });

  it('returns a blocked verdict when the front-matter is a scalar instead of an object', () => {
    const verdict = parseVerdictFromMarkdown('---\njust-a-string\n---\n');
    expect(verdict.next?.kind).toBe('escalate');
    expect(verdict.summary).toContain('front-matter-not-object');
  });

  it('returns a blocked verdict when status is missing or invalid', () => {
    const noStatus = parseVerdictFromMarkdown(withFrontMatter('summary: hi\nartifacts: []'));
    expect(noStatus.summary).toContain('invalid-status');
    const wrongStatus = parseVerdictFromMarkdown(
      withFrontMatter('status: maybe\nsummary: hi\nartifacts: []'),
    );
    expect(wrongStatus.summary).toContain('invalid-status');
  });

  it('returns a blocked verdict when summary is missing', () => {
    const verdict = parseVerdictFromMarkdown(withFrontMatter('status: done\nartifacts: []'));
    expect(verdict.summary).toContain('missing-summary');
  });

  it('returns a blocked verdict when artifacts is not a string array', () => {
    const verdict = parseVerdictFromMarkdown(
      withFrontMatter('status: done\nsummary: ok\nartifacts:\n  - 1\n  - 2'),
    );
    expect(verdict.summary).toContain('invalid-artifacts');
  });

  it('treats missing artifacts as an empty list (valid)', () => {
    const verdict = parseVerdictFromMarkdown(withFrontMatter('status: done\nsummary: ok'));
    expect(verdict.status).toBe('done');
    expect(verdict.artifacts).toEqual([]);
  });

  it('returns a blocked verdict when next is present but its kind is invalid', () => {
    const verdict = parseVerdictFromMarkdown(
      withFrontMatter('status: done\nsummary: ok\nartifacts: []\nnext:\n  kind: explode'),
    );
    expect(verdict.summary).toContain('invalid-next');
  });

  it('returns a blocked verdict when next is present but not an object', () => {
    const verdict = parseVerdictFromMarkdown(
      withFrontMatter('status: done\nsummary: ok\nartifacts: []\nnext: just-a-string'),
    );
    expect(verdict.summary).toContain('invalid-next');
  });

  it('returns a blocked verdict when next: answer-needed lacks a question', () => {
    const verdict = parseVerdictFromMarkdown(
      withFrontMatter(
        'status: question\nsummary: ok\nartifacts: []\nnext:\n  kind: answer-needed',
      ),
    );
    expect(verdict.summary).toContain('invalid-next');
  });

  it('returns a blocked verdict when next: answer-needed options is not a string array', () => {
    const verdict = parseVerdictFromMarkdown(
      withFrontMatter(
        'status: question\nsummary: ok\nartifacts: []\nnext:\n  kind: answer-needed\n  question: q\n  options:\n    - 1\n    - 2',
      ),
    );
    expect(verdict.summary).toContain('invalid-next');
  });

  it('returns a blocked verdict when next: replan lacks scope', () => {
    const verdict = parseVerdictFromMarkdown(
      withFrontMatter('status: failed\nsummary: ok\nartifacts: []\nnext:\n  kind: replan'),
    );
    expect(verdict.summary).toContain('invalid-next');
  });

  it('returns a blocked verdict when next: escalate lacks reason', () => {
    const verdict = parseVerdictFromMarkdown(
      withFrontMatter('status: blocked\nsummary: ok\nartifacts: []\nnext:\n  kind: escalate'),
    );
    expect(verdict.summary).toContain('invalid-next');
  });
});
