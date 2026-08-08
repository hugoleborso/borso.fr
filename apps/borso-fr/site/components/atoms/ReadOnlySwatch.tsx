interface ReadOnlySwatchProps {
  color: string;
  name: string;
}

export function ReadOnlySwatch({ color, name }: ReadOnlySwatchProps) {
  return <span className="swatch" style={{ background: color }} title={name} />;
}
