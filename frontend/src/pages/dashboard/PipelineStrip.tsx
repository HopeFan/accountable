import { money, plural } from "../../lib/format";
import { STAGE_LABEL, type Dashboard } from "../../lib/types";
import { EmptyState, Panel } from "../../components/ui";

const BLOCK: Record<string, { bg: string; fg: string }> = {
  new: { bg: "var(--info-solid)", fg: "white" },
  qualified: { bg: "var(--secondary)", fg: "var(--on-accent)" },
  proposal: { bg: "var(--tertiary)", fg: "var(--on-accent)" },
  negotiation: { bg: "var(--primary)", fg: "var(--on-accent)" },
};

export function PipelineStrip({
  pipeline,
}: {
  pipeline: Dashboard["pipeline"];
}) {
  const total = pipeline.reduce((s, p) => s + p.value, 0);
  return (
    <Panel>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">Open pipeline by stage</h2>
          <p className="mt-0.5 text-[13px] text-muted">
            Bar width is deal value. The lower bar shows the share we expect to
            close, and what that is worth.
          </p>
        </div>
        <div className="text-right">
          <b className="block font-mono text-[15px] font-semibold">
            {money(pipeline.reduce((s, p) => s + p.expected_revenue, 0))}
          </b>
          <span className="text-xs text-muted">expected of {money(total)}</span>
        </div>
      </div>
      {total === 0 ? (
        <EmptyState message="No open deals yet." />
      ) : (
        <div className="flex gap-4" data-testid="pipeline-strip">
          {pipeline.map((p) => {
            const c = BLOCK[p.stage];
            return (
              <div
                key={p.stage}
                className="min-w-[110px]"
                style={{ flex: `${Math.max(p.value, total * 0.08)} 1 0` }}
                data-stage={p.stage}
              >
                <div
                  className="flex h-16 flex-col justify-between rounded-[10px] px-3.5 py-3"
                  style={{ background: c.bg, color: c.fg }}
                >
                  <b className="font-semibold">
                    {STAGE_LABEL[p.stage]}{" "}
                    <span className="font-normal opacity-90">
                      · {plural(p.count, "deal")}
                    </span>
                  </b>
                  <span className="font-mono text-[13px] font-medium">
                    {money(p.value)}
                  </span>
                </div>
                <div
                  className="mt-2.5 h-2 rounded"
                  style={{
                    background: `color-mix(in srgb, ${c.bg} 22%, var(--panel))`,
                  }}
                  role="img"
                  aria-label={p.probability + "% chance of closing"}
                >
                  <div
                    className="h-2 rounded"
                    style={{ width: p.probability + "%", background: c.bg }}
                  />
                </div>
                <p className="mt-1.5 flex justify-between text-[12.5px] text-muted">
                  <span>{p.probability}% likely</span>
                  <b className="font-mono font-semibold text-ink">
                    {money(p.expected_revenue)}
                  </b>
                </p>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}
