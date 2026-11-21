import * as Dialog from "@radix-ui/react-dialog";
import { joinList, plural } from "../lib/format";
import { useDeletePreview, type RecordKind } from "../lib/queries";
import type { DeletePreview } from "../lib/types";
import { RecordDialog } from "./RecordDialog";
import { Button } from "./ui";

export function deleteMessage(
  kind: RecordKind,
  name: string,
  preview: DeletePreview | undefined,
): string {
  const goes: string[] = [];
  if (preview) {
    if (preview.contacts) goes.push(plural(preview.contacts, "contact"));
    if (preview.deals) goes.push(plural(preview.deals, "deal"));
    if (preview.activities)
      goes.push(plural(preview.activities, "activity", "activities"));
  }
  let text = `Delete ${name}?`;
  if (goes.length) text += ` This also deletes ${joinList(goes)}.`;
  if (kind === "contacts" && preview?.deals_kept) {
    const n = preview.deals_kept;
    text += ` ${n} ${n === 1 ? "deal stays" : "deals stay"}, with no main contact.`;
  }
  return `${text} This can't be undone.`;
}

/** The dialog itself: shows the message and does nothing until Delete is pressed. */
export function ConfirmDelete({
  kind,
  name,
  preview,
  busy,
  onConfirm,
  onCancel,
}: {
  kind: RecordKind;
  name: string;
  preview: DeletePreview | undefined;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <RecordDialog
      open
      onOpenChange={(o) => !o && onCancel()}
      title="Delete record"
    >
      <p className="text-[15px]" data-testid="delete-message">
        {deleteMessage(kind, name, preview)}
      </p>
      <div className="mt-6 flex items-center justify-between">
        <Dialog.Close asChild>
          <Button variant="ghost">Cancel</Button>
        </Dialog.Close>
        <Button
          variant="danger"
          busy={busy}
          disabled={!preview}
          onClick={onConfirm}
        >
          Delete
        </Button>
      </div>
    </RecordDialog>
  );
}

/** Fetches the preview for a record and asks. */
export function DeleteDialog({
  kind,
  record,
  busy,
  onConfirm,
  onCancel,
}: {
  kind: RecordKind;
  record: { id: number; name: string } | null;
  busy?: boolean;
  onConfirm: (id: number) => void;
  onCancel: () => void;
}) {
  const preview = useDeletePreview(kind, record?.id ?? null);
  if (!record) return null;
  return (
    <ConfirmDelete
      kind={kind}
      name={record.name}
      preview={preview.data}
      busy={busy}
      onCancel={onCancel}
      onConfirm={() => onConfirm(record.id)}
    />
  );
}
