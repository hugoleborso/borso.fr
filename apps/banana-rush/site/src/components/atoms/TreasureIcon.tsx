export interface TreasureIconProps {
  readonly className?: string;
}

/**
 * @Blueprint atom-mark-composed-from-the-application-s-own-parts
 * @BlueprintName Atom Mark Composed From The Application's Own Parts
 * @BlueprintUsage Use for a composite mark, so the pieces it is made of cannot drift from the pieces used everywhere else.
 * @BlueprintDescription Places the application's existing banana paths inside the chest rather than drawing a second set that merely resembles them, so the fruit in the logo and the fruit beside a stash count are the same geometry and a change to one is a change to both. Each copy is positioned by a transform around the banana's own centre, and every stroke width is divided by that copy's scale so the outline lands at the same 2.2 units as every other outline in the interface — a scaled group scales its strokes too, which is what makes a composed mark look thinner or fatter than the components around it. The left banana is mirrored rather than rotated further, because a fan built only from rotations leans instead of opening.
 */
export function TreasureIcon({ className }: TreasureIconProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className ?? 'h-5 w-5'}
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M2.8 18.2 L 4.2 11.8 C 5.0 7.6, 9.0 5.0, 16 5.0 C 23 5.0, 27.0 7.6, 27.8 11.8 L 29.2 18.2 Z"
        fill="#7a5c38"
        stroke="#3b2712"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path
        transform="translate(11.2,8.8) rotate(-22) scale(-0.47,0.47) translate(-16.5,-15.4)"
        d="M11.2 4 C 3.8 13.5, 5.5 23.5, 14.6 27.6 C 19.8 30, 26 29.4, 29.2 27.4 C 24 26.4, 19.6 24, 17.4 20 C 15 15.6, 15.2 9.6, 17 4.8 Z"
        fill="#ffd23f"
        stroke="#3b2712"
        strokeWidth="4.68"
        strokeLinejoin="round"
      />
      <path
        transform="translate(20.8,8.8) rotate(22) scale(0.47,0.47) translate(-16.5,-15.4)"
        d="M11.2 4 C 3.8 13.5, 5.5 23.5, 14.6 27.6 C 19.8 30, 26 29.4, 29.2 27.4 C 24 26.4, 19.6 24, 17.4 20 C 15 15.6, 15.2 9.6, 17 4.8 Z"
        fill="#ffd23f"
        stroke="#3b2712"
        strokeWidth="4.68"
        strokeLinejoin="round"
      />
      <path
        transform="translate(16.0,7.0) rotate(33) scale(0.53,0.53) translate(-16.5,-15.4)"
        d="M11.2 4 C 3.8 13.5, 5.5 23.5, 14.6 27.6 C 19.8 30, 26 29.4, 29.2 27.4 C 24 26.4, 19.6 24, 17.4 20 C 15 15.6, 15.2 9.6, 17 4.8 Z"
        fill="#ffd23f"
        stroke="#3b2712"
        strokeWidth="4.15"
        strokeLinejoin="round"
      />
      <path
        transform="translate(16.0,7.0) rotate(33) scale(0.53,0.53) translate(-16.5,-15.4)"
        d="M12.8 8.4 C 10.4 15, 11.6 21.4, 16.6 25"
        fill="none"
        stroke="#f0a500"
        strokeWidth="2.83"
        strokeLinecap="round"
      />
      <path
        transform="translate(16.0,7.0) rotate(33) scale(0.53,0.53) translate(-16.5,-15.4)"
        d="M11.9 4.3 L 16.5 4.7 L 15.6 1.6 C 15.3 0.7, 14 0.6, 13.4 1.4 Z"
        fill="#6b4a1f"
        stroke="#3b2712"
        strokeWidth="4.15"
        strokeLinejoin="round"
      />
      <path
        transform="translate(16.0,7.0) rotate(33) scale(0.53,0.53) translate(-16.5,-15.4)"
        d="M24.6 26.6 C 27 27, 28.6 27, 29.2 27.4 C 28.4 28.2, 26.6 28.4, 25.2 28 Z"
        fill="#6b4a1f"
        stroke="#3b2712"
        strokeWidth="4.15"
        strokeLinejoin="round"
      />
      <g stroke="#3b2712" strokeWidth="2.2" strokeLinejoin="round">
        <path
          d="M2.6 17.8 L 29.4 17.8 L 29.4 27 C 29.4 28.9, 28.2 29.7, 26.4 29.7 L 5.6 29.7 C 3.8 29.7, 2.6 28.9, 2.6 27 Z"
          fill="#7a5c38"
        />
        <path d="M2.6 17.8 L 29.4 17.8 L 29.4 21.5 L 2.6 21.5 Z" fill="#f5a623" />
        <path
          d="M13.3 21.1 L 18.7 21.1 L 18.7 26.3 C 18.7 27, 18.2 27.4, 17.4 27.4 L 14.6 27.4 C 13.8 27.4, 13.3 27, 13.3 26.3 Z"
          fill="#f5a623"
        />
      </g>
    </svg>
  );
}
