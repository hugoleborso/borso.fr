import { createRuleTester } from './rule-tester.js';
import rule from './no-circle-in-non-uniform-svg.js';

// @FollowsBlueprint test-lint-rule
createRuleTester().run('no-circle-in-non-uniform-svg', rule, {
  valid: [
    'const chart = <svg viewBox="0 0 100 40"><circle cx="1" cy="1" r="2" /></svg>;',
    'const chart = <svg preserveAspectRatio="none"><path d={profilePath} /></svg>;',
    'const chart = <svg preserveAspectRatio="xMidYMid meet"><circle r="2" /></svg>;',
    'const marker = <div className="rounded-full" />;',
  ],
  invalid: [
    {
      code: 'const chart = <svg preserveAspectRatio="none"><circle cx="1" cy="1" r="2" /></svg>;',
      errors: [{ messageId: 'roundMarker' }],
    },
    {
      code: 'const chart = <svg preserveAspectRatio="none"><g><ellipse rx="2" ry="2" /></g></svg>;',
      errors: [{ messageId: 'roundMarker' }],
    },
    {
      code: 'const chart = <svg preserveAspectRatio="none"><circle r="1" /><circle r="2" /></svg>;',
      errors: [{ messageId: 'roundMarker' }, { messageId: 'roundMarker' }],
    },
  ],
});
