import { describe, expect, it } from 'vitest';
import { type HookInput, type HookWorld, PASS } from '../check.core.ts';
import { githubPrBody } from './github-pr-body.core.ts';

const WORLD: HookWorld = {
  projectDirectory: '/repository',
  readEnvironment: () => undefined,
  readText: () => null,
  run: () => ({ status: 0, stdout: '', stderr: '' }),
};

const KNOWLEDGE_LINE =
  '[pr-body] See https://github.com/hugoleborso/borso.fr/blob/main/docs/knowledge/github-mcp-pr-body-sanitizer.md.';

function buildInput(body: unknown): HookInput {
  return {
    hook_event_name: 'PreToolUse',
    tool_name: 'mcp__github__create_pull_request',
    tool_input: { body },
  };
}

function readFirstLine(body: string): string | undefined {
  const verdict = githubPrBody.run(buildInput(body), WORLD);
  return verdict.kind === 'refuse' ? verdict.lines[0] : undefined;
}

// @FollowsBlueprint test-pure-unit
describe('githubPrBody', () => {
  it('answers the two MCP calls that write a pull-request body', () => {
    expect(githubPrBody.tools?.test('mcp__github__create_pull_request')).toBe(true);
    expect(githubPrBody.tools?.test('mcp__github__update_pull_request')).toBe(true);
    expect(githubPrBody.tools?.test('mcp__github__merge_pull_request')).toBe(false);
  });

  it('refuses a markdown image, because the server wraps its URL in backticks', () => {
    expect(githubPrBody.run(buildInput('Look ![shot](https://x.dev/a.png) here'), WORLD)).toEqual({
      kind: 'refuse',
      rule: 'pr-body',
      summary: 'wrote a pull-request body carrying markup the server silently strips',
      lines: [
        '[pr-body] the body carries a markdown image; its URL comes back wrapped in backticks and renders as code.',
        '[pr-body] The GitHub MCP server strips this before storing the body, without failing.',
        "[pr-body] Screenshots: commit them and link the PR's Files changed tab, which renders",
        '[pr-body]   them inline. Collapsed sections: use ### headings instead.',
        '[pr-body] Then read the body back with pull_request_read and confirm what survived.',
        KNOWLEDGE_LINE,
      ],
    });
  });

  it.each([
    [
      'an <img> tag',
      'See <IMG src="x"> here',
      '[pr-body] the body carries an <img> tag; its src attribute is removed and an empty tag is stored.',
    ],
    [
      'a <details> toggle',
      '<details>\nhidden\n</details>',
      '[pr-body] the body carries a <details> toggle; the tag is removed and its contents are flattened into the page.',
    ],
    [
      'a link to an image file',
      'See [shot](https://x.dev/a.jpeg?raw=1).',
      '[pr-body] the body links a file whose extension is an image; the URL comes back wrapped in backticks.',
    ],
  ])('refuses %s', (_shape, body, firstLine) => {
    expect(readFirstLine(body)).toBe(firstLine);
  });

  it('refuses a link whose target passes 150 characters and says how long it is', () => {
    const target = `https://example.com/${'a'.repeat(160)}`;

    expect(readFirstLine(`See [doc](${target}).`)).toBe(
      `[pr-body] the body carries a markdown link whose target is ${String(target.length)} characters; past about 150 the URL comes back wrapped in backticks and the anchor is dead. Name a file the branch adds by its path in a code span, since a /blob/main/ link to it is a 404 until merge. Link through /blob/main/ only for a file already on main, or write the bare URL, which autolinks at any length.`,
    );
  });

  it('refuses an angle-bracket placeholder even inside a code span, since backticks do not protect it', () => {
    expect(githubPrBody.run(buildInput('Run `pnpm --filter <app> test`.'), WORLD)).toEqual({
      kind: 'refuse',
      rule: 'pr-body',
      summary: 'wrote a pull-request body carrying an angle-bracket placeholder the server deletes',
      lines: [
        '[pr-body] the body carries <app>, which the server reads as an HTML tag and deletes.',
        '[pr-body] Backticks do not protect it: the sanitizer strips markup before markdown fencing',
        '[pr-body]   is considered, so a code span loses the placeholder too. The sentence around it',
        '[pr-body]   stays grammatical and silently changes meaning, which is the worst shape here.',
        '[pr-body] Write a real example instead (PATH/TO/file.ts, 2026-08-21), or name the thing in',
        '[pr-body]   words ("the generator\'s path"). Keep the bracket form for files in the repo.',
        KNOWLEDGE_LINE,
      ],
    });
  });

  it.each([
    ['a plain body', 'Adds a page.\n\n## Flow\n\nNothing odd.'],
    ['an image quoted in a code span', 'Write `![x](y)` never.'],
    ['an image quoted in a fenced block', '```md\n![x](https://x.dev/a.png)\n```\nDone.'],
    ['an image whose brackets break across lines', 'An ![open\nbracket](x) here'],
    ['a long target with a space in it', `See [doc](https://e.com/${'a'.repeat(160)} b).`],
    ['a link to a markdown file', 'See [entry](docs/knowledge/x.md).'],
  ])('lets %s through', (_shape, body) => {
    expect(githubPrBody.run(buildInput(body), WORLD)).toBe(PASS);
  });

  it('passes a call with no body or a body that is not text', () => {
    expect(githubPrBody.run(buildInput(''), WORLD)).toBe(PASS);
    expect(githubPrBody.run(buildInput(undefined), WORLD)).toBe(PASS);
  });
});
