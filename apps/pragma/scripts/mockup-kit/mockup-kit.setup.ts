import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Icon } from '../../site/src/components/atoms/Icon';
import { INSTRUMENT_ICON_GLYPH } from '../../site/src/components/molecules/lineup-slots.core';

const MEMBER_MARK_STYLE =
  'display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;' +
  'border-radius:999px;font:600 12px/1 sans-serif;color:#fff;background:';
const EXAMPLE_MEMBER = { initial: 'G', color: '#3a9b9b' };
const EXAMPLE_ICONS = ['drum', 'mic-vocal'] as const;

function glyphMarkup(icon: keyof typeof INSTRUMENT_ICON_GLYPH): string {
  return renderToStaticMarkup(
    createElement(Icon, { name: INSTRUMENT_ICON_GLYPH[icon], size: 'lg' }),
  );
}

const glyphs = Object.keys(INSTRUMENT_ICON_GLYPH)
  .filter((icon): icon is keyof typeof INSTRUMENT_ICON_GLYPH => icon in INSTRUMENT_ICON_GLYPH)
  .map((icon) => `<!-- ${icon} -->\n${glyphMarkup(icon)}`);

const exampleRow = [
  '<span style="display:inline-flex;align-items:center;gap:6px">',
  `<span style="${MEMBER_MARK_STYLE}${EXAMPLE_MEMBER.color}">${EXAMPLE_MEMBER.initial}</span>`,
  ...EXAMPLE_ICONS.map(glyphMarkup),
  '</span>',
].join('');

process.stdout.write(
  [
    '<!-- pragma mockup kit: the app\'s own instrument glyphs, keyed by the instrument "icon" id.',
    '     A lineup is a member mark followed by glyphs, never a sentence such as "Gui keeps the drums". -->',
    `<!-- example: member G on drums and voice -->\n${exampleRow}`,
    ...glyphs,
    '',
  ].join('\n'),
);
