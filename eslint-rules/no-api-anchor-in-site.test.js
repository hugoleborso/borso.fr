import { createRuleTester } from './rule-tester.js';
import rule from './no-api-anchor-in-site.js';

createRuleTester().run('no-api-anchor-in-site', rule, {
  valid: [
    'const link = <a href={rankingCsvUrl}>Download</a>;',
    'const link = <a href="https://borso.fr/api/health">Health</a>;',
    'const link = <a href="/archives">Archives</a>;',
    'const image = <img alt="" />;',
  ],
  invalid: [
    {
      code: 'const link = <a href="/api/ranking.csv">Download</a>;',
      errors: [{ messageId: 'apiAnchor' }],
    },
    { code: "const form = <form action='/api/punches' />;", errors: [{ messageId: 'apiAnchor' }] },
    {
      code: 'const link = <a href={"/api/laps.csv"}>Laps</a>;',
      errors: [{ messageId: 'apiAnchor' }],
    },
  ],
});
