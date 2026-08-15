/**
 * What a detail route draws when the record behind its id is gone.
 *
 * A shared or bookmarked link outlives the record it names, and every route
 * used to answer that with the raw API message — `song 404` — in red, with no
 * control of any kind. On the stage route, which renders outside the
 * application shell, that left a phone with nothing to tap at all.
 *
 * The way out is a button rather than the thin back link a detail page carries
 * on its success path: it is the only thing on the screen, so it is what the
 * reader is aiming at.
 */

import type { JSX } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../atoms/Button';
import { Icon } from '../atoms/Icon';

export interface NotFoundNoticeProps {
  readonly message: string;
  readonly backTo: string;
  readonly backLabel: string;
}

// @FollowsBlueprint molecule-presentational
export function NotFoundNotice({ message, backTo, backLabel }: NotFoundNoticeProps): JSX.Element {
  return (
    <section className="px-4 sm:px-9 py-7 flex flex-col items-start gap-4">
      <p className="m-0 text-sm text-ink-700" role="alert">
        {message}
      </p>
      <Link to={backTo} className="no-underline">
        <Button variant="accent" type="button">
          <Icon name="chevL" size={14} />
          {backLabel}
        </Button>
      </Link>
    </section>
  );
}
