export interface BananaIconProps {
  readonly className?: string;
}

/**
 * @Blueprint atom-mark-drawn-as-a-filled-silhouette
 * @BlueprintName Atom Mark Drawn As A Filled Silhouette
 * @BlueprintUsage Use for the one shape an application repeats at every size, from a sixteen pixel bullet to a hero.
 * @BlueprintDescription Draws the mark as a closed two-sided crescent carrying its own outline, rather than as a stroked sliver. A shape made of thin strokes collapses into a smudge once it is scaled down to the height of a line of body text, which is where most of these actually appear; a filled silhouette keeps its outline there. The body is deliberately thick and set on the diagonal so it fills the square viewBox, because an icon that occupies a third of its box renders a third of the size the caller asked for. Stem, tip and ridge are separate paths so each carries a flat colour of its own with no gradient, which keeps the whole mark inline in the component and free of any asset to fetch.
 */
export function BananaIcon({ className }: BananaIconProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className ?? 'h-5 w-5'}
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M11.2 4 C 3.8 13.5, 5.5 23.5, 14.6 27.6 C 19.8 30, 26 29.4, 29.2 27.4 C 24 26.4, 19.6 24, 17.4 20 C 15 15.6, 15.2 9.6, 17 4.8 Z"
        fill="#ffd23f"
        stroke="#3b2712"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path
        d="M12.8 8.4 C 10.4 15, 11.6 21.4, 16.6 25"
        fill="none"
        stroke="#f0a500"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M11.9 4.3 L 16.5 4.7 L 15.6 1.6 C 15.3 0.7, 14 0.6, 13.4 1.4 Z"
        fill="#6b4a1f"
        stroke="#3b2712"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path
        d="M24.6 26.6 C 27 27, 28.6 27, 29.2 27.4 C 28.4 28.2, 26.6 28.4, 25.2 28 Z"
        fill="#6b4a1f"
        stroke="#3b2712"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
