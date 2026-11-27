import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { QRCodeSVG } from 'qrcode.react';
import { afterEach, describe, expect, it } from 'vitest';
import '../../i18n/i18n.setup';
import { VisitorQrCodeAction } from './VisitorQrCodeAction';

const CODE_LABEL = 'QR code to the concert sign-up page';
const QUIET_ZONE_MODULES = 4;

function openCode(): SVGElement {
  render(<VisitorQrCodeAction />);
  fireEvent.click(screen.getByRole('button', { name: 'Visitor QR code' }));
  const sheet = screen.getByRole('dialog', { name: 'Visitor QR code' });
  const code = within(sheet).getByRole('img', { name: CODE_LABEL });
  if (!(code instanceof SVGElement)) {
    throw new TypeError('the visitor QR code is not an svg');
  }
  return code;
}

function readDrawing(code: Element): { viewBox: string | null; modules: string | null } {
  const [, modules] = [...code.querySelectorAll('path')];
  return { viewBox: code.getAttribute('viewBox'), modules: modules?.getAttribute('d') ?? null };
}

// @FollowsBlueprint test-component-render
describe('VisitorQrCodeAction', () => {
  afterEach(() => {
    cleanup();
  });

  it('opens a sheet with the code, dark on white, and the host under it', () => {
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

  it('draws a code that encodes the sign-up page at the root of the current origin', () => {
    const drawn = readDrawing(openCode());
    const { container } = render(
      <QRCodeSVG
        value={`${globalThis.location.origin}/`}
        level="M"
        marginSize={QUIET_ZONE_MODULES}
      />,
    );
    const reference = container.querySelector('svg');
    expect(reference).not.toBeNull();
    expect(drawn.modules).not.toBeNull();
    expect(drawn).toEqual(readDrawing(reference ?? container));
  });

  it('leaves a quiet zone of four modules around the code', () => {
    const drawn = readDrawing(openCode());
    const { container } = render(
      <QRCodeSVG value={`${globalThis.location.origin}/`} level="M" marginSize={0} />,
    );
    const edgeToEdge = readDrawing(container.querySelector('svg') ?? container);
    const moduleCount = Number(edgeToEdge.viewBox?.split(' ')[2]);
    const paddedSize = moduleCount + 2 * QUIET_ZONE_MODULES;
    expect(moduleCount).toBeGreaterThan(0);
    expect(drawn.viewBox).toBe(`0 0 ${paddedSize} ${paddedSize}`);
    expect(drawn.modules).toMatch(new RegExp(`^M${QUIET_ZONE_MODULES} ${QUIET_ZONE_MODULES}h`));
  });

  it('closes the sheet when Close is pressed', () => {
    render(<VisitorQrCodeAction />);
    fireEvent.click(screen.getByRole('button', { name: 'Visitor QR code' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
