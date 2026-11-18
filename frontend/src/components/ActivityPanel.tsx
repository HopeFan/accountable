import { Plus } from "lucide-react";
import { useState } from "react";
import { useRemove, useToggleFollowUp } from "../lib/queries";
import type { Activity } from "../lib/types";
import { ActivityForm } from "./forms";
import { RecordDialog } from "./RecordDialog";
import { Timeline } from "./Timeline";
import { useToast } from "./Toast";
import { Button, Panel } from "./ui";
import * as Dialog from "@radix-ui/react-dialog";

/** The timeline with its Log activity button, edit and delete, shared by contact and deal pages. */
export function ActivityPanel({
  items,
  contactId,
  dealId,
  showLinks,
}: {
  items: Activity[];
  contactId?: number;
  dealId?: number;
  showLinks?: boolean;
}) {
  const toast = useToast();
  const [editing, setEditing] = useState<Activity | "new" | null>(null);
  const [deleting, setDeleting] = useState<Activity | null>(null);
  const remove = useRemove("activities");
  const toggle = useToggleFollowUp();

  return (
    <Panel>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold">Timeline</h2>
        <Button onClick={() => setEditing("new")}>
          <Plus className="size-4" aria-hidden /> Log activity
        </Button>
      </div>
      <Timeline
        items={items}
        showLinks={showLinks}
        onEdit={setEditing}
        onDelete={setDeleting}
        onToggleDone={(a, done) =>
          toggle.mutate(
            { id: a.id, done },
            { onSuccess: () => toast.success(done ? "Follow-up marked done" : "Follow-up reopened") },
          )
        }
      />
      <RecordDialog
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        title={editing === "new" ? "Log activity" : "Edit activity"}
      >
        {editing !== null && (
          <ActivityForm
            initial={editing === "new" ? undefined : editing}
            contactId={contactId}
            dealId={dealId}
            onDone={() => setEditing(null)}
            onCancel={() => setEditing(null)}
          />
        )}
      </RecordDialog>
      <RecordDialog open={deleting !== null} onOpenChange={(o) => !o && setDeleting(null)} title="Delete activity">
        <p className="text-[15px]">Delete this {deleting?.type === "stage_change" ? "stage change entry" : "activity"}? This can't be undone.</p>
        <div className="mt-6 flex items-center justify-between">
          <Dialog.Close asChild>
            <Button variant="ghost">Cancel</Button>
          </Dialog.Close>
          <Button
            variant="danger"
            busy={remove.isPending}
            onClick={() =>
              deleting &&
              remove.mutate(deleting.id, {
                onSuccess: () => {
                  toast.success("Activity deleted");
                  setDeleting(null);
                },
                onError: (e) => toast.error(e.message),
              })
            }
          >
            Delete
          </Button>
        </div>
      </RecordDialog>
    </Panel>
  );
}
