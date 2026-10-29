import { forEachDescendant } from './ast-walk.js';
import { toPosixPath } from './site-paths.js';

const CLASS_ATTRIBUTE_NAME = 'className';
const CLASS_CONSTANT_PATTERN = /(?:CLASS|CLASSES|CLASS_NAME|ClassName)$/u;
const VARIANT_FILE_PATTERN = /\.variants\.ts$/u;

function readStringValue(node) {
  if (node.type === 'Literal' && typeof node.value === 'string') return node.value;
  if (node.type === 'TemplateElement') return node.value.cooked ?? node.value.raw;
  return null;
}

function visitStrings(root, onString) {
  const ownValue = readStringValue(root);
  if (ownValue !== null) onString(root, ownValue);
  forEachDescendant(root, (child) => {
    const value = readStringValue(child);
    if (value !== null) onString(child, value);
  });
}

// @FollowsBlueprint lint-rule-predicate
export function isVariantsFile(filename) {
  return VARIANT_FILE_PATTERN.test(toPosixPath(filename));
}

export function readFileBaseName(filename) {
  const posix = toPosixPath(filename);
  return posix.slice(posix.lastIndexOf('/') + 1);
}

export function buildClassStringVisitors(context, onString) {
  if (isVariantsFile(context.filename)) {
    return {
      Program(node) {
        visitStrings(node, onString);
      },
    };
  }
  return {
    JSXAttribute(node) {
      if (node.name.type !== 'JSXIdentifier' || node.name.name !== CLASS_ATTRIBUTE_NAME) return;
      if (node.value === null) return;
      visitStrings(node.value, onString);
    },
    VariableDeclarator(node) {
      if (node.id.type !== 'Identifier' || !CLASS_CONSTANT_PATTERN.test(node.id.name)) return;
      if (node.init === null || node.init === undefined) return;
      visitStrings(node.init, onString);
    },
  };
}

export function splitClassTokens(value) {
  return value
    .split(/\s+/u)
    .filter(Boolean)
    .map((token) => token.slice(token.lastIndexOf(':') + 1));
}
