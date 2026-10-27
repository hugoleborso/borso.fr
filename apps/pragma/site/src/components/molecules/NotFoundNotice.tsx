import type { JSX } from 'react';
import { ButtonLink } from '../atoms/ButtonLink';

export interface NotFoundNoticeProps {
  readonly message: string;
  readonly backTo: string;
  readonly backLabel: string;
}

// @FollowsBlueprint molecule-presentational
export function NotFoundNotice({ message, backTo, backLabel }: NotFoundNoticeProps): JSX.Element {
  return (
    <section className="px-4 sm:px-9 py-4 sm:py-7 flex flex-col items-start gap-4">
      <p className="m-0 text-meta text-ink" role="alert">
        {message}
      </p>
      <ButtonLink to={backTo} variant="primary" icon="chevL">
        {backLabel}
      </ButtonLink>
    </section>
  );
}
