import 'react';

declare global {
  const __BUILD_VERSION__: string;
  namespace JSX {
    type Element = import('react').JSX.Element;
    type IntrinsicElements = import('react').JSX.IntrinsicElements;
  }
}
