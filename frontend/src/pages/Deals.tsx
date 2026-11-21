import type { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { DeleteDialog } from "../components/ConfirmDelete";
import { DataTable } from "../components/DataTable";
import { DealForm } from "../components/forms";
import { RecordDialog } from "../components/RecordDialog";
import { useToast } from "../components/Toast";
import {
  Button,
  ErrorState,
  LateTag,
  PageHeader,
  PageSkeleton,
  StageTag,
  cx,
} from "../components/ui";
import { formatDate, money } from "../lib/format";
import { useDeals, useRemove } from "../lib/queries";
import { STAGES, STAGE_LABEL, type Deal } from "../lib/types";
import { useRecordState } from "../lib/useRecordState";

export function CloseDate({ deal }: { deal: Deal }) {
  if (!deal.close_date) return <span className="text-muted">None</span>;
  return (
    <span
      className={cx(
        "inline-flex items-center gap-2",
        deal.is_late && "font-semibold text-alert-text",
      )}
    >
      {formatDate(deal.close_date)}
      {deal.is_late && <LateTag />}
    </span>
  );
}

export function dealColumns(opts: {
  withOrganization: boolean;
  withContact: boolean;
}): ColumnDef<Deal, unknown>[] {
  const cols: ColumnDef<Deal, unknown>[] = [
    {
      id: "name",
      header: "Name",
      accessorFn: (r) => r.name,
      cell: ({ row }) => (
        <Link
          to={`/deals/${row.original.id}`}
          className="font-semibold hover:underline"
        >
          {row.original.name}
        </Link>
      ),
    },
  ];
  if (opts.withOrganization)
    cols.push({
      id: "organization",
      header: "Organization",
      accessorFn: (r) => r.organization_name,
      cell: ({ row }) => (
        <Link
          to={`/organizations/${row.original.organization_id}`}
          className="text-info-text hover:underline"
        >
          {row.original.organization_name}
        </Link>
      ),
    });
  if (opts.withContact)
    cols.push({
      id: "contact",
      header: "Contact",
      accessorFn: (r) => r.contact_name ?? undefined,
      cell: ({ row }) =>
        row.original.contact_id ? (
          <Link
            to={`/contacts/${row.original.contact_id}`}
            className="text-info-text hover:underline"
          >
            {row.original.contact_name}
          </Link>
        ) : (
          <span className="text-muted">None</span>
        ),
    });
  cols.push(
    {
      id: "stage",
      header: "Stage",
      accessorFn: (r) => STAGES.indexOf(r.stage),
      cell: ({ row }) => <StageTag stage={row.original.stage} />,
      meta: { text: (r) => STAGE_LABEL[r.stage] },
    },
    {
      id: "value",
      header: "Value",
      accessorFn: (r) => r.value,
      cell: ({ row }) => money(row.original.value),
      meta: { align: "right", mono: true, text: (r) => money(r.value) },
    },
    {
      id: "probability",
      header: "Probability",
      accessorFn: (r) => r.probability,
      cell: ({ row }) => `${row.original.probability}%`,
      meta: { align: "right", mono: true, text: (r) => `${r.probability}%` },
    },
    {
      id: "close_date",
      header: "Close date",
      accessorFn: (r) => r.close_date ?? undefined,
      cell: ({ row }) => <CloseDate deal={row.original} />,
      meta: {
        mono: true,
        text: (r) => `${formatDate(r.close_date)}${r.is_late ? " late" : ""}`,
      },
    },
  );
  return cols;
}

export function Deals() {
  const q = useDeals();
  const toast = useToast();
  const remove = useRemove("deals");
  const { editing, setEditing, deleting, setDeleting } = useRecordState<Deal>();
  const columns = useMemo(
    () => dealColumns({ withOrganization: true, withContact: true }),
    [],
  );

  return (
    <>
      <PageHeader
        title="Deals"
        actions={
          <Button onClick={() => setEditing("new")}>
            <Plus className="size-4" aria-hidden /> Add deal
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
          noun="deal"
          searchLabel="Search deals"
          rowLabel={(r) => r.name}
          onAdd={() => setEditing("new")}
          actions={{ onEdit: setEditing, onDelete: setDeleting }}
        />
      )}
      <RecordDialog
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        title={editing === "new" ? "Add deal" : "Edit deal"}
      >
        {editing !== null && (
          <DealForm
            initial={editing === "new" ? undefined : editing}
            onDone={() => setEditing(null)}
            onCancel={() => setEditing(null)}
          />
        )}
      </RecordDialog>
      <DeleteDialog
        kind="deals"
        record={deleting}
        busy={remove.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={(id) =>
          remove.mutate(id, {
            onSuccess: () => {
              toast.success("Deal deleted");
              setDeleting(null);
            },
            onError: (e) => toast.error(e.message),
          })
        }
      />
    </>
  );
}
