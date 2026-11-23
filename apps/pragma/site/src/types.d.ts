import 'react';

declare global {
  const __PERSISTED_CACHE_SHAPE__: string;
  namespace JSX {
    type Element = import('react').JSX.Element;
    type IntrinsicElements = import('react').JSX.IntrinsicElements;
  }
}
