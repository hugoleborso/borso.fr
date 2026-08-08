interface FlapDigitProps {
  readonly digit: string;
}

/**
 * One split flap character. The `key` bound to the digit value makes React
 * replace the element whenever the digit changes, which is what restarts the
 * `flap` keyframes defined in `styles/components.css`; without it React reuses
 * the element and the animation only plays once, on mount.
 */
export function FlapDigit({ digit }: FlapDigitProps) {
  return (
    <span key={digit} className="flap mono" aria-hidden>
      <span className="flap-char">{digit}</span>
      <span className="flap-hinge" />
    </span>
  );
}
