import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface AdminDialogProps {
  title: string;
  children: ReactNode;
  locked?: boolean;
  onClose: () => void;
}

export const AdminDialog = ({
  title,
  children,
  locked = false,
  onClose,
}: AdminDialogProps) => {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const element = ref.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        if (!locked) onClose();
      }}
      className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-2xl bg-white p-0 text-stone-900 shadow-2xl backdrop:bg-stone-950/60"
    >
      <header className="flex items-center justify-between gap-4 border-b border-stone-200 px-5 py-4 md:px-7">
        <h2 id={titleId} className="text-xl font-semibold">
          {title}
        </h2>
        <button
          type="button"
          disabled={locked}
          onClick={onClose}
          aria-label="Închide dialogul"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg hover:bg-stone-100 disabled:opacity-30"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </header>
      <div className="p-5 md:p-7">{children}</div>
    </dialog>
  );
};
