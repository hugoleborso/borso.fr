import { isSiteFile, toPosixPath } from './site-paths.js';

const MESSAGE =
  'A stylesheet may only be imported from an application entry point. Component styles are ' +
  'Tailwind utility classes on the JSX element, and the design tokens live in the one `@theme` ' +
  'file the entry point imports. A vendor stylesheet is global too, so it moves to `main.tsx`. ' +
  'See docs/standards/08-styling.md.';

const STYLESHEET_PATTERN = /\.css(\?.*)?$/;

const ENTRY_POINT_PATTERN = /(^|\/)main\.tsx?$/;

// @FollowsBlueprint lint-rule
/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: { description: 'Forbid importing a stylesheet outside the application entry point.' },
    schema: [],
    messages: { componentCssImport: MESSAGE },
  },
  create(context) {
    const filename = toPosixPath(context.filename);
    if (!isSiteFile(filename) || ENTRY_POINT_PATTERN.test(filename)) {
      return {};
    }
    return {
      ImportDeclaration(node) {
        const source = node.source.value;
        if (typeof source === 'string' && STYLESHEET_PATTERN.test(source)) {
          context.report({ node: node.source, messageId: 'componentCssImport' });
        }
      },
    };
  },
};
