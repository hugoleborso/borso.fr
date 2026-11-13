/** @DependsOnExternal browser-location */

export interface DepartingLink {
  readonly href: string;
  readonly ownerDocument: { readonly location: Pick<Location, 'replace'> };
}

// @FollowsBlueprint ref-callback-browser-api
export function followLinkOnAttach(link: DepartingLink | null): void {
  link?.ownerDocument.location.replace(link.href);
}
