import 'react';

declare global {
  namespace JSX {
    type Element = import('react').JSX.Element;
    type IntrinsicElements = import('react').JSX.IntrinsicElements;
  }
}
