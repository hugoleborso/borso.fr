/**
 * The emoji a block prints, kept in a module of its own.
 *
 * Both the level builders and the journey builder need them, and the journey
 * builder is imported by the level builders, so a constant living in either one
 * closes a cycle: importing the journey module first would run the generator's
 * entry point before its own constants were initialised.
 */

export const BLUEPRINT_ICON = '📘';
export const SIZE_ICON = '📏';
export const COMPLEXITY_ICON = '🧮';
export const DISABLE_ICON = '🚫';
export const FILE_ICON = '🗂️';
export const ROUTE_ICON = '🔌';

/** One emoji per family of layers, so a block reads before it is read. */
export const LAYER_GROUP_ICON: Readonly<Record<string, string>> = {
  adapter: '🔗',
  atom: '⚛️',
  client: '🔗',
  config: '⚙️',
  controller: '🚦',
  core: '🧠',
  database: '🗄️',
  declaration: '📄',
  entrypoint: '🚀',
  environment: '⚙️',
  hook: '🪝',
  i18n: '🌍',
  middleware: '🚧',
  molecule: '🧬',
  organism: '🦴',
  query: '📡',
  repository: '🗄️',
  route: '🧭',
  schema: '📐',
  service: '⚙️',
  setup: '🚀',
  store: '📦',
  types: '📐',
  utils: '🧰',
  variants: '🎨',
};
