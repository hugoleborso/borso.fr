import { describe, expect, it } from 'vitest';
import { isCommentOnlyEdit } from './comment-only-change.core.ts';

const COMPONENT = `/**
 * @BlueprintUsage Use for a region that owns no state.
 */
export function Card(): JSX.Element {
  return <p className="m-0">hi</p>; // the card
}
`;

describe('isCommentOnlyEdit', () => {
  it('reads a reworded comment and a reformatted body as no change to the code', () => {
    const reworded = COMPONENT.replace('owns no state', 'holds at most local view state').replace(
      'return <p className="m-0">hi</p>; // the card',
      'return (\n    <p className="m-0">hi</p>\n  );',
    );

    expect(isCommentOnlyEdit('apps/a/site/src/Card.tsx', COMPONENT, reworded)).toBe(true);
  });

  it.each([
    ['a changed class', COMPONENT.replace('m-0', 'm-1')],
    ['a changed type', COMPONENT.replace('JSX.Element', 'JSX.Element | null')],
    ['a changed text', COMPONENT.replace('>hi<', '>hello<')],
  ])('reads %s as a change to the code', (_change, after) => {
    expect(isCommentOnlyEdit('apps/a/site/src/Card.tsx', COMPONENT, after)).toBe(false);
  });

  it.each([
    ['a file that is not a script', 'apps/a/site/src/tokens.css', COMPONENT, COMPONENT],
    ['a file added on the branch', 'apps/a/site/src/Card.tsx', null, COMPONENT],
    ['a file deleted on the branch', 'apps/a/site/src/Card.tsx', COMPONENT, null],
    [
      'a version that does not parse',
      'apps/a/site/src/Card.tsx',
      'export const =',
      'export const =',
    ],
    [
      'a later version that does not parse',
      'apps/a/site/src/Card.tsx',
      COMPONENT,
      `${COMPONENT}export const =`,
    ],
  ])('never calls %s comment only', (_shape, path, before, after) => {
    expect(isCommentOnlyEdit(path, before, after)).toBe(false);
  });

  it('reads every script extension the apps use', () => {
    for (const path of ['a.ts', 'a.js', 'a.mjs', 'a.cts', 'a.jsx']) {
      expect(isCommentOnlyEdit(path, 'const a = 1; // x', 'const a = 1; // y')).toBe(true);
    }
  });
});
