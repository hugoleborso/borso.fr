import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const upstream = require('@eslint-community/eslint-plugin-eslint-comments');

const FIRST_COLUMN = 0;

function clampColumn(position) {
  if (position === undefined || position.column >= FIRST_COLUMN) return position;
  return { ...position, column: FIRST_COLUMN };
}

function clampLocation(descriptor) {
  if (descriptor.loc === undefined || !('start' in descriptor.loc)) return descriptor;
  return {
    ...descriptor,
    loc: { start: clampColumn(descriptor.loc.start), end: clampColumn(descriptor.loc.end) },
  };
}

function reportWithinTheLine(rule) {
  return {
    ...rule,
    create(context) {
      const reportingContext = Object.create(context, {
        report: { value: (descriptor) => context.report(clampLocation(descriptor)) },
        sourceCode: { value: context.sourceCode },
        options: { value: context.options },
      });
      return rule.create(reportingContext);
    },
  };
}

export default {
  meta: { name: '@eslint-community/eslint-comments' },
  rules: Object.fromEntries(
    Object.entries(upstream.rules).map(([name, rule]) => [name, reportWithinTheLine(rule)]),
  ),
};
