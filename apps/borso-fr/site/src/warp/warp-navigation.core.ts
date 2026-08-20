export type NavigationMode = 'warp' | 'browser';

export interface LinkActivation {
  readonly destinationHref: string;
  readonly currentHref: string;
  readonly linkTarget: string;
  readonly isDownloadLink: boolean;
  readonly isModifiedClick: boolean;
  readonly isReducedMotionPreferred: boolean;
}

const SAME_DOCUMENT_TARGETS: ReadonlySet<string> = new Set(['', '_self']);

function readAddressWithoutFragment(href: string): string {
  const address = new URL(href);
  return `${address.origin}${address.pathname}${address.search}`;
}

function readOrigin(href: string): string {
  return new URL(href).origin;
}

export function selectNavigationMode(activation: LinkActivation): NavigationMode {
  if (activation.isReducedMotionPreferred) return 'browser';
  if (activation.isModifiedClick) return 'browser';
  if (activation.isDownloadLink) return 'browser';
  if (!SAME_DOCUMENT_TARGETS.has(activation.linkTarget)) return 'browser';
  if (readOrigin(activation.destinationHref) !== readOrigin(activation.currentHref))
    return 'browser';
  if (
    readAddressWithoutFragment(activation.destinationHref) ===
    readAddressWithoutFragment(activation.currentHref)
  ) {
    return 'browser';
  }
  return 'warp';
}

export interface ClickModifiers {
  readonly button: number;
  readonly altKey: boolean;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly shiftKey: boolean;
}

const PRIMARY_MOUSE_BUTTON = 0;

export function isModifiedClick(modifiers: ClickModifiers): boolean {
  return (
    modifiers.button !== PRIMARY_MOUSE_BUTTON ||
    modifiers.altKey ||
    modifiers.ctrlKey ||
    modifiers.metaKey ||
    modifiers.shiftKey
  );
}
