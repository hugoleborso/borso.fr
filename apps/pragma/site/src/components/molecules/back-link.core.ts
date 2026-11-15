const PRIMARY_BUTTON = 0;

export type BackLinkMove = 'step-back' | 'follow-link';

export interface BackLinkClick {
  readonly button: number;
  readonly metaKey: boolean;
  readonly altKey: boolean;
  readonly ctrlKey: boolean;
  readonly shiftKey: boolean;
}

function isPlainPrimaryClick(click: BackLinkClick): boolean {
  return (
    click.button === PRIMARY_BUTTON &&
    !click.metaKey &&
    !click.altKey &&
    !click.ctrlKey &&
    !click.shiftKey
  );
}

// @FollowsBlueprint core-decision
export function selectBackLinkMove(
  click: BackLinkClick,
  previousEntryUrl: string | null,
  parentPath: string,
): BackLinkMove {
  if (previousEntryUrl === null || !isPlainPrimaryClick(click)) return 'follow-link';
  const previousPathname = new URL(previousEntryUrl).pathname;
  const parentPathname = new URL(parentPath, previousEntryUrl).pathname;
  return previousPathname === parentPathname ? 'step-back' : 'follow-link';
}
