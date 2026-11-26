// @FollowsBlueprint utils-pure-module
import { type Check, PASS, refuse } from '../check.core.ts';

const RULE = 'no-hand-drawn-art';
const SITE_SOURCE = /\/apps\/[^/]+\/site\/src\/.*\.(tsx|ts|svg)$/u;
const TEST_FILE = /\.test\.tsx?$/u;
const PATH_DATA = /\bd(=\{?|: ?)["'`][Mm][^"'`\n]{24,}/u;
const ASSET_SOURCE = '@AssetSource';

function readString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function readEditTexts(edits: unknown): (string | null)[] {
  if (!Array.isArray(edits)) return [];
  return edits.map((edit: unknown) =>
    typeof edit === 'object' && edit !== null && 'new_string' in edit
      ? readString(edit.new_string)
      : null,
  );
}

function readWrittenText(toolInput: Readonly<Record<string, unknown>>): string {
  return [
    readString(toolInput['content']),
    readString(toolInput['new_string']),
    ...readEditTexts(toolInput['edits']),
  ]
    .filter((text) => text !== null)
    .join('\n');
}

export const noHandDrawnArt: Check = {
  name: RULE,
  tools: /^(Write|Edit|MultiEdit|NotebookEdit|Bash)$/u,
  run(input, world) {
    const toolInput = input.tool_input ?? {};
    const file = readString(toolInput['file_path']) ?? '';
    if (!SITE_SOURCE.test(file) || TEST_FILE.test(file)) return PASS;
    const written = readWrittenText(toolInput);
    if (!PATH_DATA.test(written) || written.includes(ASSET_SOURCE)) return PASS;
    if (world.readText(file)?.includes(ASSET_SOURCE) === true) return PASS;
    return refuse(RULE, 'wrote SVG path data with no named source, an illustration drawn by hand', [
      'This writes SVG path data with no named source, so it is a drawing made by hand.',
      'Search free-licensed art instead: icons already installed (lucide-react), iconify, game-icons.net, CC0 packs.',
      'Composite two to four candidates on the real screen, side by side, publish that image and let the operator pick.',
      "Then put `@AssetSource <url> <license>` in the file and credit it in the app's CREDITS.md.",
    ]);
  },
};
