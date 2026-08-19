/**
 * A click on a link is only worth a warp when the browser was going to replace
 * the whole document with another page of this site. Everything else — a new
 * tab, a download, a jump to an anchor on the page already open — either keeps
 * the reader here or leaves this document alive behind a new one, and holding
 * it back for the length of an animation would be a delay with nothing to
 * look at.
 */

/** `warp` means the module drives the navigation; `browser` means it stays out of the way. */
export type NavigationMode = 'warp' | 'browser';

export interface LinkActivation {
  readonly destinationHref: string;
  readonly currentHref: string;
  readonly linkTarget: string;
  readonly isDownloadLink: boolean;
  readonly isModifiedClick: boolean;
  readonly isReducedMotionPreferred: boolean;
}

/** The two `target` values that replace the current document rather than opening another. */
const SAME_DOCUMENT_TARGETS: ReadonlySet<string> = new Set(['', '_self']);

/** Everything a hash carries is scroll position, so two hrefs that differ only there are one page. */
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

/** A click the browser would not have turned into a plain navigation of its own. */
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
