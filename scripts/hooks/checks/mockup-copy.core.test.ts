import { describe, expect, it } from 'vitest';
import { type HookInput, type HookWorld, PASS } from '../check.core.ts';
import { describeWordyArtboards, mockupCopy, readPublishedSources } from './mockup-copy.core.ts';

const WORDY = `<p>${'word '.repeat(30)}</p>`;
const SPARSE = '<p>three short words</p>';

function fakeWorld(files: Readonly<Record<string, string>>): HookWorld {
  return {
    projectDirectory: '/repo',
    readEnvironment: () => undefined,
    readText: (path) => files[path] ?? null,
    run: () => ({ status: 0, stdout: '', stderr: '' }),
  };
}

function artifactCall(toolInput: unknown, cwd: unknown = '/work'): HookInput {
  return JSON.parse(
    JSON.stringify({
      hook_event_name: 'PreToolUse',
      tool_name: 'Artifact',
      tool_input: toolInput,
      cwd,
    }),
  );
}

function contextOf(input: HookInput, world: HookWorld): string | null {
  const verdict = mockupCopy.run(input, world);
  return verdict.kind === 'context' ? verdict.text : null;
}

// @FollowsBlueprint test-pure-unit
describe('describeWordyArtboards', () => {
  it('lists each wordy screen with its count under the limit it broke', () => {
    expect(describeWordyArtboards([{ path: '/a.dc.html', words: 30 }])).toBe(
      `[mockup-copy] These screens carry more than 25 visible words:
  /a.dc.html: 30 words

The operator corrected "too much text" on mockups more than once. A word stays only where no icon, number, image or player mark can carry the meaning. Replace sentences and labels before you show the screen: a check icon over "Valider la manche", the card image over "Sirène prise par un pirate", the player's mark over the name.`,
    );
  });
});

describe('readPublishedSources', () => {
  it('collects the page and every non-null file source, by string or by from', () => {
    expect(
      readPublishedSources(
        artifactCall({
          file_path: 'page.dc.html',
          root: 'out',
          files: { 'a.dc.html': 'src/a.dc.html', 'b.dc.html': { from: 'b.html' }, gone: null },
        }),
      ),
    ).toEqual({
      workingDirectory: '/work',
      root: 'out',
      paths: ['page.dc.html', 'src/a.dc.html', 'b.html'],
    });
  });

  it('reads the working directory as the current one when the input names none', () => {
    expect(readPublishedSources({ hook_event_name: 'PreToolUse', tool_input: {} })).toEqual({
      workingDirectory: '.',
      root: undefined,
      paths: [],
    });
  });

  it('rejects an input the old schema refused, so the hook stays silent on it', () => {
    expect(readPublishedSources(artifactCall({}, 7))).toBeNull();
    expect(readPublishedSources(artifactCall('not an object'))).toBeNull();
    expect(readPublishedSources(artifactCall({ file_path: 3 }))).toBeNull();
    expect(readPublishedSources(artifactCall({ root: 3 }))).toBeNull();
    expect(readPublishedSources(artifactCall({ files: ['a.dc.html'] }))).toBeNull();
    expect(readPublishedSources(artifactCall({ files: null }))).toBeNull();
    expect(readPublishedSources(artifactCall({ files: { 'a.dc.html': { to: 'x' } } }))).toBeNull();
    expect(readPublishedSources(artifactCall({ files: { 'a.dc.html': 4 } }))).toBeNull();
    expect(readPublishedSources(artifactCall({ files: { 'a.dc.html': { from: 3 } } }))).toBeNull();
    expect(
      readPublishedSources(artifactCall({ files: { 'a.dc.html': 'a.html', 'b.dc.html': 4 } })),
    ).toBeNull();
  });
});

describe('mockupCopy', () => {
  it('fires on the Artifact tool only', () => {
    expect(mockupCopy.tools?.test('Artifact')).toBe(true);
    expect(mockupCopy.tools?.test('Artifacts')).toBe(false);
  });

  it('names a wordy mockup page, resolved from the working directory', () => {
    const world = fakeWorld({ '/work/page.dc.html': WORDY });

    expect(contextOf(artifactCall({ file_path: 'page.dc.html' }), world)).toContain(
      '  /work/page.dc.html: 30 words',
    );
  });

  it('treats a missing or false action as a publish and reads file sources under the root', () => {
    const world = fakeWorld({ '/work/out/src/a.dc.html': WORDY, '/abs/b.dc.html': WORDY });
    const text = contextOf(
      artifactCall({
        action: false,
        root: 'out',
        files: { 'a.dc.html': 'src/a.dc.html', 'b.dc.html': { from: '/abs/b.dc.html' } },
      }),
      world,
    );

    expect(text).toContain('  /work/out/src/a.dc.html: 30 words\n  /abs/b.dc.html: 30 words\n');
  });

  it('takes an absolute root as it is', () => {
    const world = fakeWorld({ '/root/a.dc.html': WORDY });

    expect(
      contextOf(artifactCall({ action: 'publish', root: '/root', file_path: 'a.dc.html' }), world),
    ).toContain('/root/a.dc.html: 30 words');
  });

  it('stays silent when every mockup screen is sparse or unreadable', () => {
    const world = fakeWorld({ '/work/page.dc.html': SPARSE });

    expect(mockupCopy.run(artifactCall({ file_path: 'page.dc.html' }), world)).toBe(PASS);
    expect(mockupCopy.run(artifactCall({ file_path: 'missing.dc.html' }), world)).toBe(PASS);
  });

  it('reads every source once any published file name is a mockup screen', () => {
    const world = fakeWorld({ '/work/b.dc.html': WORDY });

    expect(
      contextOf(artifactCall({ files: { 'a.html': 'a.html', 'b.dc.html': 'b.dc.html' } }), world),
    ).toContain('  /work/b.dc.html: 30 words');
  });

  it('counts a source only when its own path is a mockup screen', () => {
    const world = fakeWorld({ '/work/page.html': WORDY });

    expect(mockupCopy.run(artifactCall({ files: { 'a.dc.html': 'page.html' } }), world)).toBe(PASS);
  });

  it('stays silent unless the page or a published file name is a mockup screen', () => {
    const world = fakeWorld({ '/work/a.dc.html': WORDY });

    expect(mockupCopy.run(artifactCall({ files: { 'a.html': 'a.dc.html' } }), world)).toBe(PASS);
    expect(mockupCopy.run(artifactCall({ file_path: 7, files: 'a.dc.html' }), world)).toBe(PASS);
    expect(mockupCopy.run({ hook_event_name: 'PreToolUse' }, world)).toBe(PASS);
  });

  it('stays silent on any action but a publish', () => {
    const world = fakeWorld({ '/work/a.dc.html': WORDY });

    expect(mockupCopy.run(artifactCall({ action: 'read', file_path: 'a.dc.html' }), world)).toBe(
      PASS,
    );
  });

  it('stays silent on an input the old schema refused', () => {
    const world = fakeWorld({ '/work/a.dc.html': WORDY });

    expect(mockupCopy.run(artifactCall({ file_path: 'a.dc.html' }, 9), world)).toBe(PASS);
  });
});
