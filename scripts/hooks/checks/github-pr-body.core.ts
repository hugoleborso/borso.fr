// @FollowsBlueprint utils-pure-module
import { type Check, PASS, refuse, type Verdict } from '../check.core.ts';
import { stripMarkdownCode } from '../markdown-code.core.ts';

const RULE = 'pr-body';
const MARKDOWN_IMAGE = /!\[[^\]\n]*\]\(/u;
const IMG_TAG = /<img[^\S\n]/iu;
const DETAILS_TAG = /<details>|<summary>/iu;
const IMAGE_FILE_LINK = /\]\([^)\n]+\.(png|jpe?g|gif|webp|svg)([?#][^)\n]*)?\)/u;
const LONG_LINK = /\]\([^) \n]{150,}\)/u;
const PLACEHOLDER = /<[A-Za-z][A-Za-z0-9._/:-]*>/u;
const LINK_WRAPPER_LENGTH = 3;
const KNOWLEDGE_LINK =
  'See https://github.com/hugoleborso/borso.fr/blob/main/docs/knowledge/github-mcp-pr-body-sanitizer.md.';

function refuseMarkup(reason: string): Verdict {
  return refuse(RULE, 'wrote a pull-request body carrying markup the server silently strips', [
    reason,
    'The GitHub MCP server strips this before storing the body, without failing.',
    "Screenshots: commit them and link the PR's Files changed tab, which renders",
    '  them inline. Collapsed sections: use ### headings instead.',
    'Then read the body back with pull_request_read and confirm what survived.',
    KNOWLEDGE_LINK,
  ]);
}

function findMarkupReason(rendered: string): string | null {
  if (MARKDOWN_IMAGE.test(rendered)) {
    return 'the body carries a markdown image; its URL comes back wrapped in backticks and renders as code.';
  }
  if (IMG_TAG.test(rendered)) {
    return 'the body carries an <img> tag; its src attribute is removed and an empty tag is stored.';
  }
  if (DETAILS_TAG.test(rendered)) {
    return 'the body carries a <details> toggle; the tag is removed and its contents are flattened into the page.';
  }
  if (IMAGE_FILE_LINK.test(rendered)) {
    return 'the body links a file whose extension is an image; the URL comes back wrapped in backticks.';
  }
  const longLink = LONG_LINK.exec(rendered)?.[0];
  if (longLink === undefined) return null;
  return `the body carries a markdown link whose target is ${String(longLink.length - LINK_WRAPPER_LENGTH)} characters; past about 150 the URL comes back wrapped in backticks and the anchor is dead. Name a file the branch adds by its path in a code span, since a /blob/main/ link to it is a 404 until merge. Link through /blob/main/ only for a file already on main, or write the bare URL, which autolinks at any length.`;
}

export const githubPrBody: Check = {
  name: RULE,
  tools: /^(mcp__github__create_pull_request|mcp__github__update_pull_request)$/u,
  run(input) {
    const body = input.tool_input?.['body'];
    if (typeof body !== 'string') return PASS;
    const markupReason = findMarkupReason(stripMarkdownCode(body));
    if (markupReason !== null) return refuseMarkup(markupReason);
    const placeholder = PLACEHOLDER.exec(body)?.[0];
    if (placeholder === undefined) return PASS;
    return refuse(
      RULE,
      'wrote a pull-request body carrying an angle-bracket placeholder the server deletes',
      [
        `the body carries ${placeholder}, which the server reads as an HTML tag and deletes.`,
        'Backticks do not protect it: the sanitizer strips markup before markdown fencing',
        '  is considered, so a code span loses the placeholder too. The sentence around it',
        '  stays grammatical and silently changes meaning, which is the worst shape here.',
        'Write a real example instead (PATH/TO/file.ts, 2026-08-21), or name the thing in',
        '  words ("the generator\'s path"). Keep the bracket form for files in the repo.',
        KNOWLEDGE_LINK,
      ],
    );
  },
};
