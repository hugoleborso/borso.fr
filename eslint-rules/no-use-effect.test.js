import { createRuleTester } from './rule-tester.js';
import rule from './no-use-effect.js';

/**
 * @Blueprint test-lint-rule
 * @BlueprintName Lint Rule Tester Suite
 * @BlueprintUsage Use for the suite that ships beside every custom lint rule.
 * @BlueprintDescription Drives the rule through `RuleTester`, where every valid case is a near miss chosen so a reader sees the edge of the rule rather than a list of unrelated snippets, and adds a second tester block under a back end file name for the guard that silences the rule and a third for the disable comment the standard names as the escape hatch. A case whose reason is not evident from the snippet is asserted against the rule's exported predicate instead, since the reason cannot be written beside it.
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

createRuleTester().run('no-use-effect', rule, {
  valid: [
    [
      '// eslint-disable-next-line rule-to-test/no-use-effect -- attaches Leaflet to the DOM node',
      'useEffect(() => attachMap(nodeRef.current), []);',
    ].join('\n'),
  ],
  invalid: [],
});
