import { createRuleTester } from './rule-tester.js';
import rule from './no-use-effect.js';

createRuleTester().run('no-use-effect', rule, {
  valid: [
    // Derived state, which is what most effects were doing.
    'const filteredSongs = selectSongsMatchingQuery(songs, query);',
    // Hooks whose name merely starts the same way.
    'useEffectEvent(() => onSelect(songId));',
    'useLayoutEffect(() => measure(), []);',
    'const useEffectOnce = (callback) => useOnce(callback);',
    // A method named `useEffect` on something that is not React.
    'effects.useEffect(() => {});',
    // A local named `useEffect` that is never called.
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

// The rule reads the file name, so a Lambda handler that happens to define a
// function named `useEffect` is not a React component.
createRuleTester('apps/pragma/api/src/songs/songs.service.ts', { jsx: false }).run(
  'no-use-effect (back end file)',
  rule,
  {
    valid: ['useEffect(() => {}, []);'],
    invalid: [],
  },
);

// The escape hatch the standard names. In the real configuration the comment
// reads `// eslint-disable-next-line borso/no-use-effect -- <reason>`, and
// RuleTester registers the rule under `rule-to-test/<name>` instead, so the
// prefix below is the harness's and not the plugin's.
createRuleTester().run('no-use-effect', rule, {
  valid: [
    [
      '// eslint-disable-next-line rule-to-test/no-use-effect -- attaches Leaflet to the DOM node',
      'useEffect(() => attachMap(nodeRef.current), []);',
    ].join('\n'),
  ],
  invalid: [],
});
