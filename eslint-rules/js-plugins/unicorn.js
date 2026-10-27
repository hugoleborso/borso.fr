const pluginEntry = import.meta.resolve('eslint-plugin-unicorn');

const RULE_NAMES = [
  'consistent-boolean-name',
  'consistent-function-scoping',
  'no-top-level-assignment-in-function',
  'prefer-early-return',
];

async function importPluginModule(relativePath) {
  return import(new URL(relativePath, pluginEntry).href);
}

const { toEslintRules } = await importPluginModule('./rules/rule/index.js');
const unicornRules = await Promise.all(
  RULE_NAMES.map(async (name) => [name, (await importPluginModule(`./rules/${name}.js`)).default]),
);

export default {
  meta: { name: 'unicorn-js' },
  rules: toEslintRules(Object.fromEntries(unicornRules)),
};
