import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { Button } from './Button';
import { ButtonLink } from './ButtonLink';
import { IconButton } from './IconButton';

describe('the button atoms', () => {
  it('refuse to type-check without the icon or the name each one requires', () => {
    // @ts-expect-error -- a Button without an icon is the type error this test pins
    const buttonWithoutIcon = createElement(Button, { children: 'Save' });
    // @ts-expect-error -- a ButtonLink without an icon is the type error this test pins
    const linkWithoutIcon = createElement(ButtonLink, { to: '/', children: 'Open' });
    // @ts-expect-error -- an IconButton without a label has no accessible name
    const iconButtonWithoutLabel = createElement(IconButton, { icon: 'close' });
    expect([buttonWithoutIcon, linkWithoutIcon, iconButtonWithoutLabel]).toHaveLength(3);
  });
});
