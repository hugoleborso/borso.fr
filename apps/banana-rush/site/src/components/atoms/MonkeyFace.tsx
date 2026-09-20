import { MONKEY_AVATARS, type MonkeyAvatar } from '@domain/monkey.core';

interface MonkeyLook {
  readonly fur: string;
  readonly muzzle: string;
  readonly ear: string;
}

const LOOK_BY_AVATAR: Readonly<Record<MonkeyAvatar, MonkeyLook>> = {
  chimp: { fur: '#6b4423', muzzle: '#e8c39e', ear: '#8a5a2f' },
  gibbon: { fur: '#3f3f46', muzzle: '#d9c3a5', ear: '#57575f' },
  macaque: { fur: '#a1663a', muzzle: '#f0d3b4', ear: '#b87a4a' },
  mandrill: { fur: '#4a5d8f', muzzle: '#e05a4a', ear: '#5c71a8' },
  marmoset: { fur: '#c9a227', muzzle: '#f4e3bd', ear: '#ddb63c' },
  tamarin: { fur: '#7d5ba6', muzzle: '#e8d8f0', ear: '#9470bd' },
  capuchin: { fur: '#8c6239', muzzle: '#fbe9cf', ear: '#a3764a' },
  lemur: { fur: '#9aa5b1', muzzle: '#f2f4f6', ear: '#b5bec9' },
};

export interface MonkeyFaceProps {
  readonly avatar: string;
  readonly className?: string;
  readonly asleep?: boolean;
}

function lookFor(avatar: string): MonkeyLook {
  const known = MONKEY_AVATARS.find((candidate) => candidate === avatar);
  return LOOK_BY_AVATAR[known ?? 'chimp'];
}

/**
 * @Blueprint atom-generated-illustration
 * @BlueprintName Atom Generated Illustration
 * @BlueprintUsage Use for a small illustration that varies over a closed set, where shipping one image per case would cost more than drawing it.
 * @BlueprintDescription Draws the whole illustration as inline SVG from a lookup table of colours, so eight monkeys cost one component and no network request, scale to any size without a second asset, and follow the text colour where they should. An unknown name falls back to a drawn face rather than a broken image, because the name arrives from the server and an interface should not show a hole when a later version adds a ninth monkey. The face is marked as an image for assistive technology with the name passed in, since the drawing is the content here and not decoration.
 */
export function MonkeyFace({ avatar, className, asleep = false }: MonkeyFaceProps) {
  const look = lookFor(avatar);
  return (
    <svg
      viewBox="0 0 64 64"
      className={className ?? 'h-10 w-10'}
      role="img"
      aria-label={avatar}
      focusable="false"
    >
      <circle cx="12" cy="24" r="10" fill={look.ear} stroke="#3b2712" strokeWidth="3" />
      <circle cx="52" cy="24" r="10" fill={look.ear} stroke="#3b2712" strokeWidth="3" />
      <circle cx="32" cy="32" r="22" fill={look.fur} stroke="#3b2712" strokeWidth="3" />
      <ellipse
        cx="32"
        cy="40"
        rx="15"
        ry="12"
        fill={look.muzzle}
        stroke="#3b2712"
        strokeWidth="3"
      />
      {asleep ? (
        <>
          <path
            d="M18 28 q5 4 10 0"
            fill="none"
            stroke="#3b2712"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M36 28 q5 4 10 0"
            fill="none"
            stroke="#3b2712"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </>
      ) : (
        <>
          <circle cx="24" cy="27" r="3.5" fill="#3b2712" />
          <circle cx="40" cy="27" r="3.5" fill="#3b2712" />
        </>
      )}
      <ellipse cx="27" cy="37" rx="1.8" ry="2.6" fill="#3b2712" />
      <ellipse cx="37" cy="37" rx="1.8" ry="2.6" fill="#3b2712" />
      <path
        d="M25 45 q7 5 14 0"
        fill="none"
        stroke="#3b2712"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
