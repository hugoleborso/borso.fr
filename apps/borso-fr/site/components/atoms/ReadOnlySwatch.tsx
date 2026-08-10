interface ReadOnlySwatchProps {
  color: string;
  name: string;
}

// @FollowsBlueprint atom-plain
export function ReadOnlySwatch({ color, name }: ReadOnlySwatchProps) {
  return <span className="swatch" style={{ background: color }} title={name} />;
}
