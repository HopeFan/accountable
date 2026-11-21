import { Plus } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ActivityPanel } from "../components/ActivityPanel";
import { DeleteDialog } from "../components/ConfirmDelete";
import { ContactForm, DealForm } from "../components/forms";
import { LinkedDeals } from "../components/LinkedLists";
import { RecordDialog } from "../components/RecordDialog";
import { Details, LinkedPanel, RecordHeader } from "../components/RecordPage";
import { useToast } from "../components/Toast";
import { Button, ErrorState, PageSkeleton, Panel, StatusTag } from "../components/ui";
import { ApiError } from "../lib/api";
import { useContact, useRemove } from "../lib/queries";
import { NotFound } from "./NotFound";

export function ContactPage() {
  const id = Number(useParams().id);
  const q = useContact(id);
  const nav = useNavigate();
  const toast = useToast();
  const remove = useRemove("contacts");
  const [dialog, setDialog] = useState<"edit" | "deal" | "delete" | null>(null);

  if (q.isPending) return <PageSkeleton />;
  if (q.error instanceof ApiError && q.error.status === 404) return <NotFound what="contact" />;
  if (q.isError) return <ErrorState onRetry={() => q.refetch()} />;
  const c = q.data;
  const close = () => setDialog(null);

  return (
    <>
      <RecordHeader
        title={c.name}
        tags={<StatusTag status={c.status} />}
        subtitle={<Link to="/contacts" className="hover:underline">Contacts</Link>}
        onEdit={() => setDialog("edit")}
        onDelete={() => setDialog("delete")}
      />
      <div className="grid grid-cols-[minmax(0,5fr)_minmax(0,4fr)] items-start gap-5">
        <div className="flex flex-col gap-5">
          <Panel>
            <Details
              rows={[
                [
                  "Organization",
                  c.organization && (
                    <Link to={`/organizations/${c.organization.id}`} className="font-semibold text-info-text hover:underline">
                      {c.organization.name}
                    </Link>
                  ),
                ],
                ["Job title", c.job_title],
                ["Email", c.email],
                ["Phone", c.phone && <span className="font-mono text-[13px]">{c.phone}</span>],
              ]}
            />
          </Panel>
          <LinkedPanel
            title="Deals"
            isEmpty={c.deals.length === 0}
            empty="This contact isn't the main contact on any deal."
            action={
              c.organization_id ? (
                <Button variant="secondary" onClick={() => setDialog("deal")}>
                  <Plus className="size-4" aria-hidden /> Add deal
                </Button>
              ) : undefined
            }
          >
            <LinkedDeals deals={c.deals} />
          </LinkedPanel>
        </div>
        <ActivityPanel items={c.timeline} contactId={c.id} showLinks />
      </div>

      <RecordDialog open={dialog === "edit"} onOpenChange={(o) => !o && close()} title="Edit contact">
        {dialog === "edit" && <ContactForm initial={c} onDone={close} onCancel={close} />}
      </RecordDialog>
      <RecordDialog open={dialog === "deal"} onOpenChange={(o) => !o && close()} title="Add deal">
        {dialog === "deal" && c.organization_id && (
          <DealForm organizationId={c.organization_id} contactId={c.id} onDone={close} onCancel={close} />
        )}
      </RecordDialog>
      <DeleteDialog
        kind="contacts"
        record={dialog === "delete" ? { id: c.id, name: c.name } : null}
        busy={remove.isPending}
        onCancel={close}
        onConfirm={(rid) =>
          remove.mutate(rid, {
            onSuccess: () => {
              toast.success("Contact deleted");
              nav("/contacts");
            },
            onError: (e) => toast.error(e.message),
          })
        }
      />
    </>
  );
}
