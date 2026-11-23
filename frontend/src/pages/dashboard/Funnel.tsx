import { money, plural } from "../../lib/format";
import { STAGE_LABEL, type Dashboard } from "../../lib/types";
import { EmptyState, Panel, STAGE_STYLE } from "../../components/ui";

export function Funnel({
  funnel,
  lost,
}: {
  funnel: Dashboard["funnel"];
  lost: Dashboard["lost"];
}) {
  const max = Math.max(...funnel.map((f) => f.value), 1);
  const empty = funnel.every((f) => f.value === 0);
  return (
    <Panel className="flex flex-col">
      <div className="mb-4">
        <h2 className="text-base font-semibold">Sales funnel</h2>
        <p className="mt-0.5 text-[13px] text-muted">
          Value of deals that reached each stage
        </p>
      </div>
      {empty ? (
        <EmptyState message="No deals yet." />
      ) : (
        <div className="flex flex-col gap-3.5" data-testid="funnel">
          {funnel.map((f) => (
            <div key={f.stage} data-stage={f.stage}>
              <div className="mb-1.5 flex items-baseline justify-between">
                <span className="flex items-center gap-2 font-semibold">
                  <i
                    className="inline-block size-2.5 rounded-[3px]"
                    style={{ background: STAGE_STYLE[f.stage].dot }}
                    aria-hidden
                  />
                  {STAGE_LABEL[f.stage]}
                </span>
                <span className="font-mono text-[12.5px] font-medium">
                  {money(f.value)}{" "}
                  <span className="text-muted">· {f.count}</span>
                </span>
              </div>
              <div className="flex justify-center">
                <div
                  className="h-5 rounded-[7px]"
                  style={{
                    width: (f.value / max) * 100 + "%",
                    minWidth: 6,
                    background: STAGE_STYLE[f.stage].dot,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
      <p
        className="mt-4 flex justify-between gap-3 rounded-[10px] bg-page px-3 py-2.5 text-[13px] text-muted"
        data-testid="funnel-lost"
      >
        <span>Lost, not counted above ({plural(lost.count, "deal")})</span>
        <b className="font-mono font-semibold whitespace-nowrap text-ink">
          {money(lost.value)}
        </b>
      </p>
    </Panel>
  );
}
