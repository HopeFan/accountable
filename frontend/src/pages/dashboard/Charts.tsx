import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  LabelList,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  money,
  moneyCompact,
  monthLabel,
  monthLabelLong,
  plural,
} from "../../lib/format";
import type { Dashboard } from "../../lib/types";
import { Panel } from "../../components/ui";
import { convert, unconvert, useCurrency } from "../../lib/currency";

type Month = Dashboard["monthly"][number];

/** The rows the charts draw: the API's months with a short label, no other maths. */
export function chartData(monthly: Month[]) {
  return monthly.map((m) => ({ ...m, label: monthLabel(m.month) }));
}

/** Round steps (1, 2, 5, 10 times a power of ten) in the displayed currency, as stored USD. */
export function axisTicks(maxUsd: number): number[] {
  const top = Math.max(convert(maxUsd), 1);
  const power = 10 ** Math.floor(Math.log10(top / 4));
  const ratio = top / 4 / power;
  const step = ([1, 2, 5, 10].find((m) => m >= ratio) ?? 10) * power;
  const count = Math.ceil(top / step);
  return Array.from({ length: count + 1 }, (_, i) => unconvert(i * step));
}

const axis = { fontSize: 11, fill: "var(--axis)" };
const mono = { ...axis, fontFamily: "JetBrains Mono, monospace" };

function Tip({
  active,
  payload,
  kind,
}: {
  active?: boolean;
  payload?: { payload: Month }[];
  kind: "revenue" | "deals";
}) {
  if (!active || !payload?.length) return null;
  const m = payload[0].payload;
  return (
    <div className="rounded-lg bg-float px-3 py-2 text-xs text-on-float shadow-[var(--shadow-lift)]">
      <div className="mb-0.5 opacity-80">{monthLabelLong(m.month)}</div>
      <div className="font-mono font-semibold">
        {kind === "revenue"
          ? money(m.revenue)
          : plural(m.deals_won, "deal") + " won"}
      </div>
    </div>
  );
}

function Header({
  title,
  total,
  testid,
}: {
  title: string;
  total: string;
  testid: string;
}) {
  return (
    <div className="mb-3 flex items-start justify-between gap-3">
      <div>
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="mt-0.5 text-[13px] text-muted">
          By month, last 12 months
        </p>
      </div>
      <div className="text-right">
        <b
          className="block font-mono text-[15px] font-semibold"
          data-testid={testid}
        >
          {total}
        </b>
        <span className="text-xs text-muted">12-month total</span>
      </div>
    </div>
  );
}

export function RevenueChart({ monthly }: { monthly: Month[] }) {
  const currency = useCurrency();
  const data = chartData(monthly);
  const total = monthly.reduce((s, m) => s + m.revenue, 0);
  const ticks = axisTicks(Math.max(...monthly.map((m) => m.revenue), 0));
  return (
    <Panel>
      <Header title="Revenue won" total={money(total)} testid="revenue-total" />
      <div
        role="img"
        aria-label="Line chart of revenue won each month for the last 12 months"
        data-testid="revenue-chart"
        className="h-[320px]"
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 8, right: 12, bottom: 4, left: 4 }}
          >
            <CartesianGrid vertical={false} stroke="var(--grid)" />
            <XAxis
              dataKey="label"
              tick={axis}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={mono}
              tickLine={false}
              axisLine={false}
              tickFormatter={moneyCompact}
              ticks={ticks}
              domain={[0, ticks[ticks.length - 1]]}
              width={88}
              label={{
                value: `Revenue won (${currency})`,
                angle: -90,
                position: "insideLeft",
                offset: -2,
                style: { ...axis, textAnchor: "middle" },
              }}
            />
            <Tooltip
              content={<Tip kind="revenue" />}
              cursor={{ stroke: "var(--field-ring)" }}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="none"
              fill="var(--primary)"
              fillOpacity={0.12}
              isAnimationActive={false}
              activeDot={false}
            />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="var(--primary)"
              strokeWidth={3}
              dot={{
                r: 3.5,
                fill: "var(--panel)",
                stroke: "var(--primary)",
                strokeWidth: 2,
              }}
              activeDot={{ r: 5 }}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}

export function DealsWonChart({ monthly }: { monthly: Month[] }) {
  const data = chartData(monthly);
  const total = monthly.reduce((s, m) => s + m.deals_won, 0);
  const revenue = monthly.reduce((s, m) => s + m.revenue, 0);
  const best = monthly.reduce(
    (a, m) => (m.deals_won > a.deals_won ? m : a),
    monthly[0],
  );
  return (
    <Panel>
      <Header
        title="Deals won"
        total={String(total)}
        testid="deals-won-total"
      />
      <div
        role="img"
        aria-label="Bar chart of deals won each month for the last 12 months"
        data-testid="deals-chart"
        className="h-[300px]"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 8, right: 12, bottom: 4, left: 4 }}
          >
            <CartesianGrid vertical={false} stroke="var(--grid)" />
            <XAxis
              dataKey="label"
              tick={axis}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={mono}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              width={44}
              label={{
                value: "Deals won",
                angle: -90,
                position: "insideLeft",
                offset: 6,
                style: { ...axis, textAnchor: "middle" },
              }}
            />
            <Tooltip
              content={<Tip kind="deals" />}
              cursor={{ fill: "var(--grid)", opacity: 0.6 }}
            />
            <Bar
              dataKey="deals_won"
              fill="var(--info)"
              radius={[5, 5, 0, 0]}
              maxBarSize={28}
              isAnimationActive={false}
            >
              <LabelList
                dataKey="deals_won"
                position="top"
                style={{ ...mono, fontSize: 11, fill: "var(--ink)" }}
                formatter={(v: unknown) => (Number(v) > 0 ? String(v) : "")}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <dl className="mt-4 grid grid-cols-3 gap-3 text-[13px]">
        <Stat
          label="Best month"
          value={
            best.deals_won > 0
              ? `${monthLabelLong(best.month)}, ${plural(best.deals_won, "deal")}`
              : "None yet"
          }
        />
        <Stat
          label="Average deal"
          value={total > 0 ? money(revenue / total) : "None yet"}
        />
        <Stat
          label="Months with no wins"
          value={String(monthly.filter((m) => m.deals_won === 0).length)}
        />
      </dl>
    </Panel>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[10px] bg-page px-3 py-2.5">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 font-mono font-semibold">{value}</dd>
    </div>
  );
}
