import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import '../../i18n/i18n.setup';
import { VisitorQrCodeAction } from './VisitorQrCodeAction';

const CODE_LABEL = 'QR code to the concert sign-up page';

// @FollowsBlueprint test-component-render
describe('VisitorQrCodeAction', () => {
  afterEach(() => {
    cleanup();
  });

  it('opens a sheet with the code, dark on white with a quiet zone, and the host under it', () => {
    render(<VisitorQrCodeAction />);
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Visitor QR code' }));
    const sheet = screen.getByRole('dialog', { name: 'Visitor QR code' });
    const code = within(sheet).getByRole('img', { name: CODE_LABEL });
    expect(code.tagName.toLowerCase()).toBe('svg');
    const [background, modules] = [...code.querySelectorAll('path')];
    expect(background?.getAttribute('fill')).toBe('#ffffff');
    expect(modules?.getAttribute('fill')).toBe('#000000');
    const caption = within(sheet).getByText(globalThis.location.host);
    expect(caption.className).toContain('font-mono');
  });

  it('closes the sheet', () => {
    render(<VisitorQrCodeAction />);
    fireEvent.click(screen.getByRole('button', { name: 'Visitor QR code' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
