import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import { cloneElement } from "react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "../components/Toast";
import type { Dashboard as DashboardData } from "../lib/types";
import { Dashboard } from "./Dashboard";
import { chartData } from "./dashboard/Charts";

vi.mock("recharts", async (orig) => {
  const actual = await orig<typeof import("recharts")>();
  return {
    ...actual,
    ResponsiveContainer: ({
      children,
    }: {
      children: React.ReactElement<{ width?: number; height?: number }>;
    }) => (
      <div style={{ width: 800, height: 300 }}>
        {cloneElement(children, { width: 800, height: 300 })}
      </div>
    ),
  };
});

const data: DashboardData = {
  today: "2026-11-17",
  tiles: {
    open_pipeline_value: 123456,
    open_deals: 7,
    expected_revenue: 45678.9,
    won_this_month_value: 48000,
    won_this_month_count: 2,
    overdue_follow_ups: 3,
  },
  pipeline: [
    {
      stage: "new",
      count: 1,
      value: 10000,
      probability: 5,
      expected_revenue: 500,
    },
    {
      stage: "qualified",
      count: 2,
      value: 20000,
      probability: 20,
      expected_revenue: 4000,
    },
    {
      stage: "proposal",
      count: 3,
      value: 30000,
      probability: 40,
      expected_revenue: 12000,
    },
    {
      stage: "negotiation",
      count: 1,
      value: 63456,
      probability: 70,
      expected_revenue: 29178.9,
    },
  ],
  monthly: Array.from({ length: 12 }, (_, i) => ({
    month: "2026-" + String(i + 1).padStart(2, "0"),
    revenue: i * 1000,
    deals_won: i % 3,
  })),
  funnel: [
    { stage: "new", count: 20, value: 500000 },
    { stage: "qualified", count: 15, value: 400000 },
    { stage: "proposal", count: 10, value: 300000 },
    { stage: "negotiation", count: 6, value: 200000 },
    { stage: "won", count: 4, value: 100000 },
  ],
  lost: { count: 5, value: 137000 },
  follow_ups: [
    {
      id: 1,
      type: "call",
      contact_id: null,
      deal_id: 9,
      description: "Send the revised quote",
      occurred_at: "2026-11-01T10:00:00",
      follow_up_date: "2026-11-10",
      follow_up_done: false,
      follow_up_state: "overdue",
      deal_name: "Dispatch optimisation",
      contact_name: null,
    },
    {
      id: 2,
      type: "note",
      contact_id: null,
      deal_id: 8,
      description: "Confirm the start date",
      occurred_at: "2026-11-02T10:00:00",
      follow_up_date: "2026-11-24",
      follow_up_done: false,
      follow_up_state: "open",
      deal_name: "Fraud alerts",
      contact_name: null,
    },
  ],
  recent_activity: [
    {
      id: 5,
      type: "stage_change",
      contact_id: null,
      deal_id: 9,
      description: "Moved from Proposal to Negotiation",
      occurred_at: "2026-11-16T09:30:00",
      follow_up_date: null,
      follow_up_done: false,
      follow_up_state: null,
      deal_name: "Dispatch optimisation",
      contact_name: null,
    },
  ],
};

afterEach(() => vi.unstubAllGlobals());

function renderDashboard() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify(data), { status: 200 })),
  );
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <ToastProvider>
          <Dashboard />
        </ToastProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("Dashboard", () => {
  it("shows the API's figures without doing its own sums", async () => {
    renderDashboard();
    await waitFor(() =>
      expect(screen.getByTestId("tile-pipeline")).toBeInTheDocument(),
    );
    expect(screen.getByTestId("tile-pipeline")).toHaveTextContent(
      "USD 123,456",
    );
    expect(screen.getByText("7 open deals")).toBeInTheDocument();
    expect(screen.getByTestId("tile-expected")).toHaveTextContent("USD 45,679");
    expect(screen.getByTestId("tile-won")).toHaveTextContent("USD 48,000");
    expect(screen.getByText("2 deals won this month")).toBeInTheDocument();
    expect(screen.getByTestId("tile-overdue")).toHaveTextContent("3");
    expect(screen.getByText("Tuesday 17 November 2026")).toBeInTheDocument();
  });

  it("shows one block per open stage and one row per funnel stage", async () => {
    renderDashboard();
    const strip = await screen.findByTestId("pipeline-strip");
    expect(
      Array.from(strip.querySelectorAll("[data-stage]")).map((e) =>
        e.getAttribute("data-stage"),
      ),
    ).toEqual(["new", "qualified", "proposal", "negotiation"]);
    expect(within(strip).getByText("USD 63,456")).toBeInTheDocument();
    const funnel = screen.getByTestId("funnel");
    const rows = Array.from(funnel.querySelectorAll("[data-stage]"));
    expect(rows.map((r) => r.getAttribute("data-stage"))).toEqual([
      "new",
      "qualified",
      "proposal",
      "negotiation",
      "won",
    ]);
    expect(within(funnel).getByText(/USD 500,000/)).toBeInTheDocument();
    expect(within(funnel).getByText(/USD 100,000/)).toBeInTheDocument();
    expect(screen.getByTestId("funnel-lost")).toHaveTextContent("USD 137,000");
  });

  it("lists overdue follow-ups before upcoming ones, and recent activity", async () => {
    renderDashboard();
    const list = await screen.findByTestId("follow-ups");
    const boxes = within(list).getAllByRole("checkbox");
    expect(boxes).toHaveLength(2);
    expect(boxes[0]).toHaveAccessibleName("Mark done: Send the revised quote");
    expect(within(list).getByText(/Overdue · 10 Nov 2026/)).toBeInTheDocument();
    expect(
      within(screen.getByTestId("recent-activity")).getByText(
        "Moved from Proposal to Negotiation",
      ),
    ).toBeInTheDocument();
  });
});

describe("chart data", () => {
  it("is the API's 12 months with a short label", () => {
    const rows = chartData(data.monthly);
    expect(rows).toHaveLength(12);
    expect(rows[0]).toMatchObject({
      month: "2026-01",
      label: "Jan",
      revenue: 0,
      deals_won: 0,
    });
    expect(rows[11]).toMatchObject({
      month: "2026-12",
      label: "Dec",
      revenue: 11000,
      deals_won: 2,
    });
  });
});
