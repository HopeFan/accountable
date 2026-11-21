import { Plus } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { DeleteDialog } from "../components/ConfirmDelete";
import { ContactForm, DealForm, OrganizationForm } from "../components/forms";
import { LinkedContacts, LinkedDeals } from "../components/LinkedLists";
import { RecordDialog } from "../components/RecordDialog";
import { Details, LinkedPanel, RecordHeader } from "../components/RecordPage";
import { useToast } from "../components/Toast";
import { Button, ErrorState, PageSkeleton, Panel } from "../components/ui";
import { ApiError } from "../lib/api";
import { money } from "../lib/format";
import { useOrganization, useRemove } from "../lib/queries";
import { NotFound } from "./NotFound";

export function OrganizationPage() {
  const id = Number(useParams().id);
  const q = useOrganization(id);
  const nav = useNavigate();
  const toast = useToast();
  const remove = useRemove("organizations");
  const [dialog, setDialog] = useState<
    "edit" | "contact" | "deal" | "delete" | null
  >(null);

  if (q.isPending) return <PageSkeleton />;
  if (q.error instanceof ApiError && q.error.status === 404)
    return <NotFound what="organization" />;
  if (q.isError) return <ErrorState onRetry={() => q.refetch()} />;
  const org = q.data;
  const close = () => setDialog(null);

  return (
    <>
      <RecordHeader
        title={org.name}
        subtitle={
          <Link to="/organizations" className="hover:underline">
            Organizations
          </Link>
        }
        onEdit={() => setDialog("edit")}
        onDelete={() => setDialog("delete")}
      />
      <div className="flex flex-col gap-5">
        <Panel>
          <Details
            rows={[
              ["Industry", org.industry],
              ["Website", org.website],
              [
                "Open deals",
                `${org.open_deals_count} worth ${money(org.open_deals_value)}`,
              ],
              ["Notes", org.notes],
            ]}
          />
        </Panel>
        <LinkedPanel
          title="Contacts"
          isEmpty={org.contacts.length === 0}
          empty="No contacts at this organization yet."
          action={
            <Button variant="secondary" onClick={() => setDialog("contact")}>
              <Plus className="size-4" aria-hidden /> Add contact
            </Button>
          }
        >
          <LinkedContacts contacts={org.contacts} />
        </LinkedPanel>
        <LinkedPanel
          title="Deals"
          isEmpty={org.deals.length === 0}
          empty="No deals with this organization yet."
          action={
            <Button variant="secondary" onClick={() => setDialog("deal")}>
              <Plus className="size-4" aria-hidden /> Add deal
            </Button>
          }
        >
          <LinkedDeals deals={org.deals} />
        </LinkedPanel>
      </div>

      <RecordDialog
        open={dialog === "edit"}
        onOpenChange={(o) => !o && close()}
        title="Edit organization"
      >
        {dialog === "edit" && (
          <OrganizationForm initial={org} onDone={close} onCancel={close} />
        )}
      </RecordDialog>
      <RecordDialog
        open={dialog === "contact"}
        onOpenChange={(o) => !o && close()}
        title="Add contact"
      >
        {dialog === "contact" && (
          <ContactForm
            organizationId={org.id}
            onDone={close}
            onCancel={close}
          />
        )}
      </RecordDialog>
      <RecordDialog
        open={dialog === "deal"}
        onOpenChange={(o) => !o && close()}
        title="Add deal"
      >
        {dialog === "deal" && (
          <DealForm organizationId={org.id} onDone={close} onCancel={close} />
        )}
      </RecordDialog>
      <DeleteDialog
        kind="organizations"
        record={dialog === "delete" ? org : null}
        busy={remove.isPending}
        onCancel={close}
        onConfirm={(rid) =>
          remove.mutate(rid, {
            onSuccess: () => {
              toast.success("Organization deleted");
              nav("/organizations");
            },
            onError: (e) => toast.error(e.message),
          })
        }
      />
    </>
  );
}
