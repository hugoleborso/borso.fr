interface FileInputProps {
  readonly id: string;
  readonly onFileChange: (file: File | null) => void;
  readonly accept?: string;
  readonly capture?: 'user' | 'environment';
  readonly required?: boolean;
}

// @FollowsBlueprint atom-plain
export function FileInput({ id, onFileChange, accept, capture, required = false }: FileInputProps) {
  return (
    <input
      id={id}
      type="file"
      className="input"
      accept={accept}
      capture={capture}
      required={required}
      onChange={(event) => {
        onFileChange(event.target.files?.[0] ?? null);
      }}
    />
  );
}
