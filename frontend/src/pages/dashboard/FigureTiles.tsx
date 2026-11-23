import { AlarmClock, Layers, Target, Trophy } from "lucide-react";
import { money, plural } from "../../lib/format";
import type { Dashboard } from "../../lib/types";
import { Panel, cx } from "../../components/ui";

function Tile({
  label,
  value,
  note,
  chip,
  icon: Icon,
  testid,
  alert,
}: {
  label: string;
  value: string;
  note: string;
  chip: string;
  icon: typeof Layers;
  testid: string;
  alert?: boolean;
}) {
  const code = /^[A-Z]{3}(?= )/.exec(value)?.[0];
  return (
    <Panel className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2.5 text-[13px] font-medium text-muted">
        <span
          className={cx(
            "grid size-[30px] place-items-center rounded-full",
            chip,
          )}
        >
          <Icon className="size-4" aria-hidden />
        </span>
        {label}
      </div>
      <div
        className={cx(
          "font-mono text-[26px] leading-none font-semibold tracking-tight",
          alert && "text-alert-text",
        )}
        data-testid={testid}
      >
        {code ? (
          <>
            <small className="mr-1.5 text-[13px] font-medium tracking-normal text-muted">
              {code}
            </small>{" "}
            {value.slice(code.length + 1)}
          </>
        ) : (
          value
        )}
      </div>
      <div className="text-[13px] text-muted">{note}</div>
    </Panel>
  );
}

export function FigureTiles({ tiles }: { tiles: Dashboard["tiles"] }) {
  return (
    <div className="grid grid-cols-4 gap-5">
      <Tile
        label="Open pipeline"
        value={money(tiles.open_pipeline_value)}
        note={plural(tiles.open_deals, "open deal")}
        chip="bg-primary-tint text-primary-text"
        icon={Layers}
        testid="tile-pipeline"
      />
      <Tile
        label="Expected revenue"
        value={money(tiles.expected_revenue)}
        note="Value times probability of close"
        chip="bg-info-tint text-info-text"
        icon={Target}
        testid="tile-expected"
      />
      <Tile
        label="Won this month"
        value={money(tiles.won_this_month_value)}
        note={plural(tiles.won_this_month_count, "deal") + " won this month"}
        chip="bg-marigold-tint text-marigold-text"
        icon={Trophy}
        testid="tile-won"
      />
      <Tile
        label="Overdue follow-ups"
        value={String(tiles.overdue_follow_ups)}
        note={
          tiles.overdue_follow_ups === 0 ? "Nothing overdue" : "Waiting for you"
        }
        chip="bg-alert-tint text-alert-text"
        icon={AlarmClock}
        testid="tile-overdue"
        alert={tiles.overdue_follow_ups > 0}
      />
    </div>
  );
}
