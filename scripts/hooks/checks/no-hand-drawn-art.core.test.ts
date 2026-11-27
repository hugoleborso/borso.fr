import { describe, expect, it } from 'vitest';
import { type HookInput, type HookWorld, PASS } from '../check.core.ts';
import { noHandDrawnArt } from './no-hand-drawn-art.core.ts';

const SITE_FILE = '/repository/apps/pragma/site/src/Eye.tsx';
const SOURCED_FILE = '/repository/apps/pragma/site/src/Sourced.tsx';
const PATH_DATA = 'M10 10 L 20 20 L 30 30 L 40 40 L 50 50 Z';

const WORLD: HookWorld = {
  projectDirectory: '/repository',
  readEnvironment: () => undefined,
  readText: (path) =>
    path === SOURCED_FILE ? '// @AssetSource https://game-icons.net/eye CC-BY\n' : null,
  run: () => ({ status: 0, stdout: '', stderr: '' }),
};

function buildInput(toolInput?: Record<string, unknown>, toolName = 'Write'): HookInput {
  return { hook_event_name: 'PreToolUse', tool_name: toolName, tool_input: toolInput };
}

// @FollowsBlueprint test-pure-unit
describe('noHandDrawnArt', () => {
  it('answers the tools its settings matcher names', () => {
    for (const tool of ['Write', 'Edit', 'MultiEdit', 'NotebookEdit', 'Bash']) {
      expect(noHandDrawnArt.tools?.test(tool)).toBe(true);
    }
    expect(noHandDrawnArt.tools?.test('Read')).toBe(false);
  });

  it('refuses path data with no named source, which the operator rejects on sight', () => {
    expect(
      noHandDrawnArt.run(
        buildInput({ file_path: SITE_FILE, content: `<path d="${PATH_DATA}" />` }),
        WORLD,
      ),
    ).toEqual({
      kind: 'refuse',
      rule: 'no-hand-drawn-art',
      summary: 'wrote SVG path data with no named source, an illustration drawn by hand',
      lines: [
        '[no-hand-drawn-art] This writes SVG path data with no named source, so it is a drawing made by hand.',
        '[no-hand-drawn-art] Search free-licensed art instead: icons already installed (lucide-react), iconify, game-icons.net, CC0 packs.',
        '[no-hand-drawn-art] Composite two to four candidates on the real screen, side by side, publish that image and let the operator pick.',
        "[no-hand-drawn-art] Then put `@AssetSource <url> <license>` in the file and credit it in the app's CREDITS.md.",
      ],
    });
  });

  it.each([
    ['an Edit object literal', 'Edit', { file_path: SITE_FILE, new_string: `d: '${PATH_DATA}'` }],
    [
      'a MultiEdit template literal',
      'MultiEdit',
      {
        file_path: SITE_FILE.replace('.tsx', '.svg'),
        edits: [{ old_string: 'a' }, 'not an edit', null, { new_string: `d={\`${PATH_DATA}\`}` }],
      },
    ],
  ])('refuses path data written through %s', (_shape, tool, toolInput) => {
    expect(noHandDrawnArt.run(buildInput(toolInput, tool), WORLD).kind).toBe('refuse');
  });

  it.each([
    [
      'a source named in the written text',
      { file_path: SITE_FILE, content: `// @AssetSource https://x CC0\n<path d="${PATH_DATA}" />` },
    ],
    [
      'a source already named in the file on disk',
      { file_path: SOURCED_FILE, new_string: `d: '${PATH_DATA}'` },
    ],
    [
      'a test file',
      { file_path: SITE_FILE.replace('.tsx', '.test.tsx'), content: `d="${PATH_DATA}"` },
    ],
    [
      'a file outside a site source folder',
      { file_path: '/repository/docs/Eye.tsx', content: `d="${PATH_DATA}"` },
    ],
    [
      'path data shorter than 24 characters',
      { file_path: SITE_FILE, content: '<path d="M0 0 L 1 1 Z" />' },
    ],
    [
      'path data broken across lines, which the line-based grep never joined',
      { file_path: SITE_FILE, content: '<path d="M10\n10 L 20 20 L 30 30 L 40 40 Z" />' },
    ],
    ['edits that are not a list', { file_path: SITE_FILE, edits: 'none' }],
    ['content that is not text', { file_path: SITE_FILE, content: [`d="${PATH_DATA}"`] }],
    ['a file path that is not text', { file_path: [SITE_FILE], content: `d="${PATH_DATA}"` }],
    [
      'path data split across two edits, since no single edit writes it',
      { file_path: SITE_FILE, edits: [{ new_string: 'd="M' }, { new_string: PATH_DATA }] },
    ],
  ])('lets %s through', (_shape, toolInput) => {
    expect(noHandDrawnArt.run(buildInput(toolInput), WORLD)).toBe(PASS);
  });

  it('passes a call that names no file, such as a Bash call', () => {
    expect(noHandDrawnArt.run(buildInput(undefined, 'Bash'), WORLD)).toBe(PASS);
  });
});
