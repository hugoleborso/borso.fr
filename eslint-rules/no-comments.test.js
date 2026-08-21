import { createRuleTester } from './rule-tester.js';
import rule, { isMachineReadComment } from './no-comments.js';
import { describe, expect, it } from 'vitest';

function annotation(body) {
  return `@${body}`;
}

// @FollowsBlueprint test-lint-rule
createRuleTester().run('no-comments', rule, {
  valid: [
    'export const total = price * quantity;',
    `// ${annotation('FollowsBlueprint service-crud-update')}\nexport function patchSong() {}`,
    `/**\n * ${annotation('Blueprint repository-json-column')}\n * ${annotation('BlueprintName Repository Json Column Boundary')}\n */\nfunction rowToSong() {}`,
    `/** ${annotation("type {import('eslint').Rule.RuleModule}")} */\nexport default {};`,
    `// ${annotation('ts-expect-error the vendor types are wrong here')}\nconst value = api.call();`,
    `// ${annotation('Feature catalog')}\nexport function CatalogGrid() {}`,
    `// ${annotation('DependsOnExternal musicbrainz')}\nexport async function searchExternal() {}`,
    '// prettier-ignore\nconst matrix = [1, 0, 0];',
    '// SPDX-License-Identifier: MIT\n// SPDX-FileCopyrightText: 2024 David Haz\nexport const SHADER = `void main() {}`;',
    `/**\n * ${annotation('vitest-environment node')}\n */\nimport { it } from 'vitest';`,
  ],
  invalid: [
    { code: '// Add one to the counter.\ncounter += 1;', errors: [{ messageId: 'noComment' }] },
    {
      code: '/** Returns the runner ranking. */\nexport function rank() {}',
      errors: [{ messageId: 'noComment' }],
    },
    {
      code: '// Previously this used a queue, now it uses a topic.\nconst topic = build();',
      errors: [{ messageId: 'noComment' }],
    },
    {
      code: `/**\n * ${annotation('Blueprint repository-json-column')}\n * Decodes the column in one place.\n */\nfunction rowToSong() {}`,
      errors: [{ messageId: 'noComment' }],
    },
    {
      code: `/**\n * ${annotation('param total the amount to charge')}\n */\nexport function charge(total) {}`,
      errors: [{ messageId: 'noComment' }],
    },
    { code: '/* */\nconst value = 1;', errors: [{ messageId: 'noComment' }] },
  ],
});

describe('isMachineReadComment', () => {
  it('rejects a block whose tag is followed by a sentence of prose', () => {
    expect(
      isMachineReadComment({
        type: 'Block',
        value: `*\n * ${annotation('Feature catalog')}\n * The grid.\n `,
      }),
    ).toBe(false);
  });

  it('accepts a block whose every line is a tag', () => {
    expect(
      isMachineReadComment({
        type: 'Block',
        value: `*\n * ${annotation('Blueprint id-here')}\n * ${annotation('BlueprintName A Name')}\n `,
      }),
    ).toBe(true);
  });

  it('rejects a sentence that merely opens with a directive word', () => {
    expect(
      isMachineReadComment({
        type: 'Block',
        value: ' global `JSX` namespace so route components ',
      }),
    ).toBe(false);
  });

  it('accepts a real globals directive, which names identifiers and nothing else', () => {
    expect(isMachineReadComment({ type: 'Block', value: ' globals process, console ' })).toBe(true);
  });

  it('rejects an empty comment, which carries nothing at all', () => {
    expect(isMachineReadComment({ type: 'Line', value: '  ' })).toBe(false);
  });

  it('accepts a rule exception, whose reason is the directive rather than prose', () => {
    expect(
      isMachineReadComment({
        type: 'Line',
        value: ' eslint-disable-next-line borso/no-use-effect -- attaches Leaflet to a DOM node',
      }),
    ).toBe(true);
  });
});
