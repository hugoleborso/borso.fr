import { normalisePagePath } from '../../lib/wikilinks.core';

export type SourceReference =
  | { readonly kind: 'page'; readonly path: string }
  | { readonly kind: 'link'; readonly href: string }
  | { readonly kind: 'text'; readonly text: string };

const WEB_ADDRESS_PATTERN = /^https?:\/\/\S+$/i;
const REPOSITORY_PATH_PATTERN = /^[\w.-]+(?:\/[\w.-]+)+$/;
const WIKILINK_DECORATION_PATTERN = /^\[\[|\]\]$/g;
const LIST_BRACKETS_PATTERN = /^\[(.*)\]$/s;
const LIST_ITEM_PATTERN = /"[^"]*"|'[^']*'|[^,]+/g;
const QUOTES_PATTERN = /^(["'])(.*)\1$/s;
const FIRST_CAPTURE = '$1';
const SECOND_CAPTURE = '$2';

// @FollowsBlueprint core-view-projection
export function classifySource(raw: string): SourceReference {
  const trimmed = raw.trim();
  if (WEB_ADDRESS_PATTERN.test(trimmed)) return { kind: 'link', href: trimmed };
  const unwrapped = trimmed.replaceAll(WIKILINK_DECORATION_PATTERN, '');
  if (REPOSITORY_PATH_PATTERN.test(unwrapped)) {
    return { kind: 'page', path: normalisePagePath(unwrapped) };
  }
  return { kind: 'text', text: trimmed };
}

export function readSourceList(raw: string | undefined): string[] {
  const listBody = (raw ?? '').trim().replace(LIST_BRACKETS_PATTERN, FIRST_CAPTURE);
  return [...listBody.matchAll(LIST_ITEM_PATTERN)]
    .map(([item]) => item.trim().replace(QUOTES_PATTERN, SECOND_CAPTURE).trim())
    .filter((item) => item !== '');
}
