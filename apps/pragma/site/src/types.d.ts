// React 19 ships its JSX types under `React.JSX`. Re-expose them as the
// global `JSX` namespace so route components can keep using the
// `JSX.Element` return type without having to import `React` everywhere.
import 'react';

declare global {
  namespace JSX {
    type Element = import('react').JSX.Element;
    type IntrinsicElements = import('react').JSX.IntrinsicElements;
  }
}
