import type { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { DeleteDialog } from "../components/ConfirmDelete";
import { DataTable } from "../components/DataTable";
import { ContactForm } from "../components/forms";
import { RecordDialog } from "../components/RecordDialog";
import { useToast } from "../components/Toast";
import { Button, ErrorState, PageHeader, PageSkeleton, StatusTag, cx, inputClass } from "../components/ui";
import { useContacts, useRemove } from "../lib/queries";
import { CONTACT_STATUSES, STATUS_LABEL, type Contact, type ContactStatus } from "../lib/types";
import { useRecordState } from "../lib/useRecordState";

export function contactColumns(opts: { withOrganization: boolean }): ColumnDef<Contact, any>[] { // eslint-disable-line @typescript-eslint/no-explicit-any
  const cols: ColumnDef<Contact, any>[] = [ // eslint-disable-line @typescript-eslint/no-explicit-any
    {
      id: "name",
      header: "Name",
      accessorFn: (r) => `${r.last_name} ${r.first_name}`,
      cell: ({ row }) => (
        <Link to={`/contacts/${row.original.id}`} className="font-semibold hover:underline">
          {row.original.name}
        </Link>
      ),
      meta: { text: (r) => r.name },
    },
  ];
  if (opts.withOrganization) {
    cols.push({
      id: "organization",
      header: "Organization",
      accessorFn: (r) => r.organization_name ?? undefined,
      cell: ({ row }) =>
        row.original.organization_id ? (
          <Link to={`/organizations/${row.original.organization_id}`} className="text-info-text hover:underline">
            {row.original.organization_name}
          </Link>
        ) : (
          <span className="text-muted">None</span>
        ),
    });
  }
  cols.push(
    { id: "job_title", header: "Job title", accessorFn: (r) => r.job_title ?? undefined },
    { id: "email", header: "Email", accessorFn: (r) => r.email ?? undefined },
    { id: "phone", header: "Phone", accessorFn: (r) => r.phone ?? undefined, meta: { mono: true } },
    {
      id: "status",
      header: "Status",
      accessorFn: (r) => STATUS_LABEL[r.status],
      cell: ({ row }) => <StatusTag status={row.original.status} />,
    },
  );
  return cols;
}

export function Contacts() {
  const q = useContacts();
  const toast = useToast();
  const remove = useRemove("contacts");
  const { editing, setEditing, deleting, setDeleting } = useRecordState<Contact>();
  const [status, setStatus] = useState<ContactStatus | "all">("all");
  const columns = useMemo(() => contactColumns({ withOrganization: true }), []);
  const rows = useMemo(
    () => (q.data ?? []).filter((c) => status === "all" || c.status === status),
    [q.data, status],
  );

  return (
    <>
      <PageHeader
        title="Contacts"
        actions={
          <Button onClick={() => setEditing("new")}>
            <Plus className="size-4" aria-hidden /> Add contact
          </Button>
        }
      />
      {q.isPending ? (
        <PageSkeleton />
      ) : q.isError ? (
        <ErrorState onRetry={() => q.refetch()} />
      ) : (
        <DataTable
          data={rows}
          columns={columns}
          noun="contact"
          searchLabel="Search contacts"
          rowLabel={(r) => r.name}
          onAdd={q.data.length === 0 ? () => setEditing("new") : undefined}
          actions={{ onEdit: setEditing, onDelete: setDeleting }}
          toolbar={
            <div className="flex items-center gap-2 text-[13px] font-semibold">
              <label htmlFor="status-filter">Status</label>
              <select
                id="status-filter"
                value={status}
                onChange={(e) => setStatus(e.target.value as ContactStatus | "all")}
                className={cx(inputClass, "w-40 bg-panel shadow-panel ring-0")}
              >
                <option value="all">All</option>
                {CONTACT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </div>
          }
        />
      )}
      <RecordDialog
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        title={editing === "new" ? "Add contact" : "Edit contact"}
      >
        {editing !== null && (
          <ContactForm
            initial={editing === "new" ? undefined : editing}
            onDone={() => setEditing(null)}
            onCancel={() => setEditing(null)}
          />
        )}
      </RecordDialog>
      <DeleteDialog
        kind="contacts"
        record={deleting ? { id: deleting.id, name: deleting.name } : null}
        busy={remove.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={(id) =>
          remove.mutate(id, {
            onSuccess: () => {
              toast.success("Contact deleted");
              setDeleting(null);
            },
            onError: (e) => toast.error(e.message),
          })
        }
      />
    </>
  );
}
