/**
 * The one place that knows what `navigate` returns in this application.
 *
 * React Router 7 types `navigate` as `void | Promise<void>`, because the
 * answer depends on the router: the declarative `<BrowserRouter>` + `<Routes>`
 * pairing that `App.tsx` mounts returns nothing, while `<RouterProvider>` and
 * framework mode return a promise that settles when the navigation finishes.
 * The library documents a `declare module 'react-router'` augmentation as the
 * way to pin it, but that needs `react-router` as a direct dependency and this
 * application depends only on the `react-router-dom` shim, so the narrowing
 * happens here.
 *
 * Wrapping in `Promise.resolve` is what keeps this honest under either router.
 * Today the wrapped value is `undefined` and the handler can never run; the day
 * this application moves to `<RouterProvider>`, a rejected navigation reaches
 * the same handler rather than becoming an unhandled rejection. Neither reading
 * requires a `void` operator pretending a failure was considered.
 */

import { type NavigateOptions, type To, useNavigate } from 'react-router-dom';

export type NavigateTo = (destination: To, options?: NavigateOptions) => void;

const NAVIGATION_SURFACE = 'navigation';

export function useNavigateTo(): NavigateTo {
  const navigate = useNavigate();
  return (destination, options) => {
    Promise.resolve(navigate(destination, options)).catch((error: unknown) => {
      console.error({ surface: NAVIGATION_SURFACE, destination, error });
    });
  };
}
