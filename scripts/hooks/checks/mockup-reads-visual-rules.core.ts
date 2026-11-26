// @FollowsBlueprint utils-pure-module
import { type Check, type HookInput, type HookWorld, PASS } from '../check.core.ts';

const VISUAL_RULES_NOTE = `[mockup-visual-rules] A mockup of an app follows the rules the app already holds about what a screen may draw: what a colour means, which icons stand for what, which fonts and tokens exist. Read them before the first variant, for the app you are drawing:

  grep -rn -i -E 'colou?r|hue|icon|font|token' apps/<app>/VOCABULARY.md apps/<app>/DESIGN.md $(find apps/<app> -name INVARIANTS.md -not -path '*/node_modules/*')

A variant that breaks one of them is not an option the operator can pick.

With no \`docs/features/<app>/<slug>/spec/spec.md\` yet, run \`/specification\` and ask its questions first. PR #389 drew a new app's mockups with none asked, and ten operator corrections followed. Art comes from a free-licensed set, never drawn by hand.

Draw a change over a capture of the real screen (\`scripts/dev-server.sh start <app>\`, then \`agent-browser screenshot\`), uploaded as an asset. Never redraw the rest of the app from memory.

A phone board is one screen, 375 x 812, sheets included. Only a list may run past it. When anything else would make the screen scroll, cut or merge content until it fits, and say what went.

pragma: draw members and instruments with the app's own marks, never as words. \`pnpm --filter @borso-app/pragma run mockup-kit\` prints each instrument glyph as SVG and a member-mark example to paste.`;

function readToolInputText(input: HookInput, field: string, fallback: string): string {
  const value = input.tool_input?.[field];
  return typeof value === 'string' ? value : fallback;
}

function isDesignQuickstart(input: HookInput): boolean {
  return (
    readToolInputText(input, 'action', 'publish') === 'quickstart' &&
    readToolInputText(input, 'intent', '') === 'design'
  );
}

function sessionMarkerPath(input: HookInput, world: HookWorld): string {
  const temporaryDirectory = world.readEnvironment('TMPDIR') || '/tmp';
  return `${temporaryDirectory}/mockup-reads-visual-rules-${input.session_id ?? 'unknown'}`;
}

export const mockupReadsVisualRules: Check = {
  name: 'mockup-reads-visual-rules',
  tools: /^Artifact$/u,
  run: (input, world) => {
    if (!isDesignQuickstart(input)) return PASS;
    const marker = sessionMarkerPath(input, world);
    if (world.run('test', ['-e', marker]).status === 0) return PASS;
    world.run('touch', ['--', marker]);
    return { kind: 'context', text: VISUAL_RULES_NOTE };
  },
};
