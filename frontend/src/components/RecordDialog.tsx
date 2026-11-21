import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";

export function RecordDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  width = "max-w-[520px]",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  width?: string;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-overlay" />
        <Dialog.Content
          className={`fixed top-1/2 left-1/2 z-50 max-h-[90vh] w-[calc(100vw-48px)] ${width} -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl bg-panel p-6 shadow-[var(--shadow-lift)]`}
        >
          <div className="mb-5 flex items-start justify-between gap-4">
            <Dialog.Title className="text-lg font-semibold">
              {title}
            </Dialog.Title>
            <Dialog.Close
              className="rounded-lg p-1 text-muted hover:bg-soft hover:text-ink"
              aria-label="Close"
            >
              <X className="size-5" aria-hidden />
            </Dialog.Close>
          </div>
          {description ? (
            <Dialog.Description className="mb-4 text-sm text-muted">
              {description}
            </Dialog.Description>
          ) : (
            <Dialog.Description className="sr-only">{title}</Dialog.Description>
          )}
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function FormActions({
  onCancel,
  submitLabel,
  busy,
}: {
  onCancel: () => void;
  submitLabel: string;
  busy?: boolean;
}) {
  return (
    <div className="mt-6 flex items-center justify-between">
      <button
        type="button"
        onClick={onCancel}
        className="inline-flex h-10 items-center rounded-[10px] px-4 text-sm font-semibold hover:bg-soft"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={busy}
        className="inline-flex h-10 items-center rounded-[10px] bg-primary px-5 text-sm font-semibold text-on-accent hover:brightness-95 disabled:opacity-60"
      >
        {submitLabel}
      </button>
    </div>
  );
}
