import type { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { DeleteDialog } from "../components/ConfirmDelete";
import { DataTable } from "../components/DataTable";
import { OrganizationForm } from "../components/forms";
import { RecordDialog } from "../components/RecordDialog";
import { useToast } from "../components/Toast";
import { Button, ErrorState, PageHeader, PageSkeleton } from "../components/ui";
import { money } from "../lib/format";
import { useOrganizations, useRemove } from "../lib/queries";
import type { Organization } from "../lib/types";
import { useRecordState } from "../lib/useRecordState";

export function Organizations() {
  const q = useOrganizations();
  const toast = useToast();
  const remove = useRemove("organizations");
  const { editing, setEditing, deleting, setDeleting } =
    useRecordState<Organization>();

  const columns = useMemo<ColumnDef<Organization, unknown>[]>(
    () => [
      {
        id: "name",
        header: "Name",
        accessorFn: (r) => r.name,
        cell: ({ row }) => (
          <Link
            to={`/organizations/${row.original.id}`}
            className="font-semibold hover:underline"
          >
            {row.original.name}
          </Link>
        ),
      },
      {
        id: "industry",
        header: "Industry",
        accessorFn: (r) => r.industry ?? undefined,
      },
      {
        id: "website",
        header: "Website",
        accessorFn: (r) => r.website ?? undefined,
      },
      {
        id: "contacts",
        header: "Contacts",
        accessorFn: (r) => r.contacts_count,
        meta: { align: "right", mono: true },
      },
      {
        id: "open_deals",
        header: "Open deals",
        accessorFn: (r) => r.open_deals_count,
        meta: { align: "right", mono: true },
      },
      {
        id: "open_value",
        header: "Open deal value",
        accessorFn: (r) => r.open_deals_value,
        cell: ({ row }) => money(row.original.open_deals_value),
        meta: {
          align: "right",
          mono: true,
          text: (r) => money(r.open_deals_value),
        },
      },
    ],
    [],
  );

  return (
    <>
      <PageHeader
        title="Organizations"
        actions={
          <Button onClick={() => setEditing("new")}>
            <Plus className="size-4" aria-hidden /> Add organization
          </Button>
        }
      />
      {q.isPending ? (
        <PageSkeleton />
      ) : q.isError ? (
        <ErrorState onRetry={() => q.refetch()} />
      ) : (
        <DataTable
          data={q.data}
          columns={columns}
          noun="organization"
          searchLabel="Search organizations"
          rowLabel={(r) => r.name}
          onAdd={() => setEditing("new")}
          actions={{ onEdit: setEditing, onDelete: setDeleting }}
        />
      )}
      <RecordDialog
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        title={editing === "new" ? "Add organization" : "Edit organization"}
      >
        {editing !== null && (
          <OrganizationForm
            initial={editing === "new" ? undefined : editing}
            onDone={() => setEditing(null)}
            onCancel={() => setEditing(null)}
          />
        )}
      </RecordDialog>
      <DeleteDialog
        kind="organizations"
        record={deleting}
        busy={remove.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={(id) =>
          remove.mutate(id, {
            onSuccess: () => {
              toast.success("Organization deleted");
              setDeleting(null);
            },
            onError: (e) => toast.error(e.message),
          })
        }
      />
    </>
  );
}
