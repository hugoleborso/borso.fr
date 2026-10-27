import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const rulesDirectory = join(dirname(require.resolve('eslint/package.json')), 'lib', 'rules');

const RULE_NAMES = ['no-dupe-args', 'no-octal'];

export default {
  meta: { name: 'eslint-js' },
  rules: Object.fromEntries(
    RULE_NAMES.map((name) => [name, require(join(rulesDirectory, `${name}.js`))]),
  ),
};
