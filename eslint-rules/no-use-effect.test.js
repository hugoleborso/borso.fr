import { createRuleTester } from './rule-tester.js';
import rule from './no-use-effect.js';

/**
 * @Blueprint test-lint-rule
 * @BlueprintName Lint Rule Tester Suite
 * @BlueprintUsage Use for the suite that ships beside every custom lint rule.
 * @BlueprintDescription Drives the rule through `RuleTester`, where every valid case is a near miss chosen so a reader sees the edge of the rule rather than a list of unrelated snippets, and adds a second tester block under a back end file name for the guard that silences the rule. The disable comment the standard names as the escape hatch is proven against the real linter in `disable-directives.test.js`, because the tester applies no directive. A case whose reason is not evident from the snippet is asserted against the rule's exported predicate instead, since the reason cannot be written beside it.
 */
createRuleTester().run('no-use-effect', rule, {
  valid: [
    'const filteredSongs = selectSongsMatchingQuery(songs, query);',
    'useEffectEvent(() => onSelect(songId));',
    'useLayoutEffect(() => measure(), []);',
    'const useEffectOnce = (callback) => useOnce(callback);',
    'effects.useEffect(() => {});',
    'import { useMemo } from "react";',
  ],
  invalid: [
    { code: 'useEffect(() => setOpen(true), []);', errors: [{ messageId: 'useEffect' }] },
    { code: 'React.useEffect(() => setOpen(true), []);', errors: [{ messageId: 'useEffect' }] },
    {
      code: 'function Panel() { useEffect(() => { document.title = title; }, [title]); return null; }',
      errors: [{ messageId: 'useEffect' }],
    },
  ],
});

createRuleTester('apps/pragma/api/src/songs/songs.service.ts', { jsx: false }).run(
  'no-use-effect (back end file)',
  rule,
  {
    valid: ['useEffect(() => {}, []);'],
    invalid: [],
  },
);
