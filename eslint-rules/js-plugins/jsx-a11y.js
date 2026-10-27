import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

function readRule(loaded) {
  return loaded.default ?? loaded;
}

export default {
  meta: { name: 'jsx-a11y-js' },
  rules: {
    'autocomplete-valid': readRule(require('eslint-plugin-jsx-a11y/lib/rules/autocomplete-valid')),
    'no-autofocus': readRule(require('eslint-plugin-jsx-a11y/lib/rules/no-autofocus')),
  },
};
