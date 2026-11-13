import type { ReactNode } from 'react';

interface ActionBarProps {
  children: ReactNode;
}

// @FollowsBlueprint atom-plain
export function ActionBar({ children }: ActionBarProps) {
  return (
    <>
      <div aria-hidden="true" className="h-[calc(var(--spacing-action-bar)-2rem)] roomy:hidden" />
      <div className="fixed inset-x-0 z-10 bottom-[calc(var(--spacing-tab-bar)+env(safe-area-inset-bottom))] flex gap-3 px-4 py-2 bg-page border-t border-rule roomy:static roomy:p-0 roomy:border-0 roomy:bg-transparent [&>*]:flex-1 roomy:[&>*]:flex-none">
        {children}
      </div>
    </>
  );
}
