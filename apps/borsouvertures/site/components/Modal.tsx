import { type ReactNode, useEffect, useRef } from 'react';

interface ModalProps {
  title: string;
  children: ReactNode;
  onClose?: () => void;
}

export function Modal({ title, children, onClose }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Native <dialog> needs an imperative open() call to render as a modal with
  // a focus trap and a backdrop. The cleanup closes it when the consumer
  // unmounts the Modal (e.g. when onClose flips the parent state).
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: native <dialog> handles Escape via the onClose event and traps focus; onClick only triggers when the user taps the backdrop.
    <dialog
      ref={dialogRef}
      className="modal-dialog"
      aria-label={title}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose?.();
      }}
    >
      <div className="modal">
        <h3>{title}</h3>
        {children}
      </div>
    </dialog>
  );
}
