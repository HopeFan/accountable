import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ActivityPanel } from "../components/ActivityPanel";
import { DeleteDialog } from "../components/ConfirmDelete";
import { DealForm } from "../components/forms";
import { RecordDialog } from "../components/RecordDialog";
import { Details, RecordHeader } from "../components/RecordPage";
import { useToast } from "../components/Toast";
import {
  ErrorState,
  LateTag,
  PageSkeleton,
  Panel,
  StageTag,
  inputClass,
} from "../components/ui";
import { ApiError } from "../lib/api";
import { money } from "../lib/format";
import { useDeal, useRemove, useUpdate } from "../lib/queries";
import { STAGES, STAGE_LABEL, type Stage } from "../lib/types";
import { CloseDate } from "./Deals";
import { NotFound } from "./NotFound";

export function DealPage() {
  const id = Number(useParams().id);
  const q = useDeal(id);
  const nav = useNavigate();
  const toast = useToast();
  const remove = useRemove("deals");
  const update = useUpdate("deals");
  const [dialog, setDialog] = useState<"edit" | "delete" | null>(null);

  if (q.isPending) return <PageSkeleton />;
  if (q.error instanceof ApiError && q.error.status === 404)
    return <NotFound what="deal" />;
  if (q.isError) return <ErrorState onRetry={() => q.refetch()} />;
  const d = q.data;
  const close = () => setDialog(null);

  const changeStage = (stage: Stage) =>
    update.mutate(
      { id: d.id, body: { stage } },
      {
        onSuccess: () => toast.success(`Deal moved to ${STAGE_LABEL[stage]}`),
        onError: (e) => toast.error(e.message),
      },
    );

  return (
    <>
      <RecordHeader
        title={d.name}
        tags={
          <>
            <StageTag stage={d.stage} />
            {d.is_late && <LateTag />}
          </>
        }
        subtitle={
          <Link to="/deals" className="hover:underline">
            Deals
          </Link>
        }
        onEdit={() => setDialog("edit")}
        onDelete={() => setDialog("delete")}
      />
      <div className="grid grid-cols-[minmax(0,5fr)_minmax(0,4fr)] items-start gap-5">
        <Panel>
          <Details
            author={d}
            rows={[
              [
                "Organization",
                <Link
                  key="o"
                  to={`/organizations/${d.organization_id}`}
                  className="font-semibold text-info-text hover:underline"
                >
                  {d.organization_name}
                </Link>,
              ],
              [
                "Main contact",
                d.contact_id && (
                  <Link
                    key="c"
                    to={`/contacts/${d.contact_id}`}
                    className="font-semibold text-info-text hover:underline"
                  >
                    {d.contact_name}
                  </Link>
                ),
              ],
              [
                "Stage",
                <select
                  key="s"
                  aria-label="Stage"
                  value={d.stage}
                  onChange={(e) => changeStage(e.target.value as Stage)}
                  className={`${inputClass} w-48`}
                >
                  {STAGES.map((s) => (
                    <option key={s} value={s}>
                      {STAGE_LABEL[s]}
                    </option>
                  ))}
                </select>,
              ],
              [
                "Value",
                <span key="v" className="font-mono text-[13px]">
                  {money(d.value)}
                </span>,
              ],
              [
                "Probability",
                <span key="p" className="font-mono text-[13px]">
                  {d.probability}%
                </span>,
              ],
              [
                "Expected revenue",
                <span key="e" className="font-mono text-[13px]">
                  {money(d.expected_revenue)}
                </span>,
              ],
              [
                "Close date",
                <span key="cd" className="font-mono text-[13px]">
                  <CloseDate deal={d} />
                </span>,
              ],
            ]}
          />
        </Panel>
        <ActivityPanel items={d.timeline} dealId={d.id} />
      </div>

      <RecordDialog
        open={dialog === "edit"}
        onOpenChange={(o) => !o && close()}
        title="Edit deal"
      >
        {dialog === "edit" && (
          <DealForm initial={d} onDone={close} onCancel={close} />
        )}
      </RecordDialog>
      <DeleteDialog
        kind="deals"
        record={dialog === "delete" ? d : null}
        busy={remove.isPending}
        onCancel={close}
        onConfirm={(rid) =>
          remove.mutate(rid, {
            onSuccess: () => {
              toast.success("Deal deleted");
              nav("/deals");
            },
            onError: (e) => toast.error(e.message),
          })
        }
      />
    </>
  );
}
