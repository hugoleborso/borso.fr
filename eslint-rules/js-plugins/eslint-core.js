import { builtinRules } from 'eslint/use-at-your-own-risk';

const RULE_NAMES = ['no-dupe-args', 'no-octal'];

export default {
  meta: { name: 'eslint-js' },
  rules: Object.fromEntries(RULE_NAMES.map((name) => [name, builtinRules.get(name)])),
};
