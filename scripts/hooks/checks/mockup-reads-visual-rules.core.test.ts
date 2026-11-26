import { describe, expect, it } from 'vitest';
import { type HookInput, type HookWorld, PASS } from '../check.core.ts';
import { mockupReadsVisualRules } from './mockup-reads-visual-rules.core.ts';

interface RecordedCall {
  readonly command: string;
  readonly args: readonly string[];
}

interface WorldSetup {
  readonly temporaryDirectory?: string;
  readonly existingMarkers?: readonly string[];
}

function fakeWorld(calls: RecordedCall[], setup: WorldSetup = {}): HookWorld {
  const markers = new Set(setup.existingMarkers);
  return {
    projectDirectory: '/repo',
    readEnvironment: (name) => (name === 'TMPDIR' ? setup.temporaryDirectory : undefined),
    readText: () => null,
    run: (command, args) => {
      calls.push({ command, args });
      const isPresent = command === 'test' && markers.has(args.at(-1) ?? '');
      return { status: isPresent ? 0 : 1, stdout: '', stderr: '' };
    },
  };
}

function artifactCall(toolInput: HookInput['tool_input'], sessionId?: string): HookInput {
  return {
    hook_event_name: 'PreToolUse',
    tool_name: 'Artifact',
    tool_input: toolInput,
    ...(sessionId === undefined ? {} : { session_id: sessionId }),
  };
}

const DESIGN_QUICKSTART = { action: 'quickstart', intent: 'design' };

// @FollowsBlueprint test-pure-unit
describe('mockupReadsVisualRules', () => {
  it('fires on the Artifact tool only', () => {
    expect(mockupReadsVisualRules.tools?.test('Artifact')).toBe(true);
    expect(mockupReadsVisualRules.tools?.test('ArtifactData')).toBe(false);
  });

  it('names the visual rules on the first design quickstart and marks the session', () => {
    const calls: RecordedCall[] = [];
    const verdict = mockupReadsVisualRules.run(
      artifactCall(DESIGN_QUICKSTART, 's1'),
      fakeWorld(calls, { temporaryDirectory: '/scratch' }),
    );

    expect(verdict.kind === 'context' && verdict.text.split('\n')[0]).toBe(
      '[mockup-visual-rules] A mockup of an app follows the rules the app already holds about what a screen may draw: what a colour means, which icons stand for what, which fonts and tokens exist. Read them before the first variant, for the app you are drawing:',
    );
    expect(
      verdict.kind === 'context' && verdict.text.endsWith('a member-mark example to paste.'),
    ).toBe(true);
    expect(calls).toEqual([
      { command: 'test', args: ['-e', '/scratch/mockup-reads-visual-rules-s1'] },
      { command: 'touch', args: ['--', '/scratch/mockup-reads-visual-rules-s1'] },
    ]);
  });

  it('says nothing a second time in the same session', () => {
    const calls: RecordedCall[] = [];
    const world = fakeWorld(calls, { existingMarkers: ['/tmp/mockup-reads-visual-rules-s1'] });

    expect(mockupReadsVisualRules.run(artifactCall(DESIGN_QUICKSTART, 's1'), world)).toBe(PASS);
    expect(calls).toHaveLength(1);
  });

  it('falls back to /tmp for an unset or empty TMPDIR and to "unknown" for a missing session', () => {
    const calls: RecordedCall[] = [];
    mockupReadsVisualRules.run(artifactCall(DESIGN_QUICKSTART), fakeWorld(calls));
    mockupReadsVisualRules.run(
      artifactCall(DESIGN_QUICKSTART, 's2'),
      fakeWorld(calls, { temporaryDirectory: '' }),
    );

    expect(calls.filter(({ command }) => command === 'touch')).toEqual([
      { command: 'touch', args: ['--', '/tmp/mockup-reads-visual-rules-unknown'] },
      { command: 'touch', args: ['--', '/tmp/mockup-reads-visual-rules-s2'] },
    ]);
  });

  it('stays silent on a publish, which names its type only by URL, and on other intents', () => {
    const calls: RecordedCall[] = [];
    const world = fakeWorld(calls);

    expect(mockupReadsVisualRules.run(artifactCall({ intent: 'design' }), world)).toBe(PASS);
    expect(
      mockupReadsVisualRules.run(artifactCall({ action: 'quickstart', intent: 'slides' }), world),
    ).toBe(PASS);
    expect(mockupReadsVisualRules.run(artifactCall({ action: 'quickstart' }), world)).toBe(PASS);
    expect(mockupReadsVisualRules.run({ hook_event_name: 'PreToolUse' }, world)).toBe(PASS);
    expect(calls).toEqual([]);
  });
});
