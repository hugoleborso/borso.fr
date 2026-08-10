interface EditableSwatchProps {
  color: string;
  name: string;
  title: string;
  editLabel: string;
  onColorChange: (nextHex: string) => void;
}

export function EditableSwatch({
  color,
  name,
  title,
  editLabel,
  onColorChange,
}: EditableSwatchProps) {
  return (
    <label className="swatch editable" style={{ background: color }} title={title}>
      <span className="name">{name}</span>
      <input
        type="color"
        value={color}
        onChange={(event) => onColorChange(event.target.value)}
        aria-label={editLabel}
      />
    </label>
  );
}
