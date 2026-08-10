import { isSiteFile, toPosixPath } from './site-paths.js';

/**
 * A stylesheet beside a component is invisible in the diff that breaks it.
 * Specificity fights, dead rules, and selector drift all live between files,
 * and none of them show up when a reviewer reads the component. A Tailwind
 * class sits on the element it styles, so the styling and the structure are
 * reviewed together, and deleting the component deletes the styling.
 *
 * The entry point is the exception, because the one design token file and any
 * vendor stylesheet are global by nature and have to be loaded once. A vendor
 * stylesheet imported next to the component that needs it, e.g.
 * `leaflet/dist/leaflet.css` in a map component, is still global CSS that
 * happens to be loaded from a component file, so it moves to the entry point
 * too.
 *
 * What this deliberately allows:
 *
 * - `main.tsx` and `main.ts`, which are the Vite entry points in this
 *   repository. Each application has several, one per bundle.
 * - Anything outside `apps/<app>/site/`, since the rule is about component
 *   styling.
 * - `import styles from './x.module.css'`, which is not allowed by the
 *   standard either, and is reported by the same branch.
 *
 * See docs/standards/08-styling.md.
 */
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
