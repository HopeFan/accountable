import { Plus } from "lucide-react";
import { useState } from "react";
import { DealForm } from "../components/forms";
import { RecordDialog } from "../components/RecordDialog";
import { FollowUpList } from "../components/FollowUpList";
import { Button, ErrorState, Panel, Skeleton } from "../components/ui";
import { formatLongDate } from "../lib/format";
import { useDashboard } from "../lib/queries";
import { DealsWonChart, RevenueChart } from "./dashboard/Charts";
import { FigureTiles } from "./dashboard/FigureTiles";
import { Funnel } from "./dashboard/Funnel";
import { PipelineStrip } from "./dashboard/PipelineStrip";
import { RecentActivity } from "./dashboard/RecentActivity";

function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

function DashboardSkeleton() {
  return (
    <div role="status" aria-label="Loading" className="space-y-5">
      <div className="grid grid-cols-4 gap-5">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[124px] rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-44 rounded-xl" />
      <div className="grid grid-cols-[2fr_1fr] gap-5">
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    </div>
  );
}

export function Dashboard() {
  const q = useDashboard();
  const [adding, setAdding] = useState(false);
  return (
    <>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <p className="mb-0.5 text-[13px] text-muted">{q.data ? formatLongDate(q.data.today) : "\u00a0"}</p>
          <h1 className="font-serif text-[40px] leading-[1.05] font-normal tracking-tight">{greeting()}</h1>
        </div>
        <Button onClick={() => setAdding(true)}>
          <Plus className="size-4" aria-hidden /> Add deal
        </Button>
      </div>
      <RecordDialog open={adding} onOpenChange={setAdding} title="Add deal">
        {adding && <DealForm onDone={() => setAdding(false)} onCancel={() => setAdding(false)} />}
      </RecordDialog>
      {q.isPending ? (
        <DashboardSkeleton />
      ) : q.isError ? (
        <ErrorState onRetry={() => q.refetch()} />
      ) : (
        <div className="flex flex-col gap-5">
          <FigureTiles tiles={q.data.tiles} />
          <PipelineStrip pipeline={q.data.pipeline} />
          <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-5">
            <RevenueChart monthly={q.data.monthly} />
            <Funnel funnel={q.data.funnel} lost={q.data.lost} />
          </div>
          <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-5">
            <DealsWonChart monthly={q.data.monthly} />
            <Panel>
              <h2 className="text-base font-semibold">Follow-ups</h2>
              <p className="mt-0.5 mb-2 text-[13px] text-muted">
                {q.data.follow_ups.length} open, tick one to mark it done
              </p>
              <div data-testid="follow-ups" className="max-h-[400px] overflow-y-auto pr-1">
                <FollowUpList items={q.data.follow_ups} />
              </div>
            </Panel>
          </div>
          <RecentActivity items={q.data.recent_activity} />
        </div>
      )}
    </>
  );
}
