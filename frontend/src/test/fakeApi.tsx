import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import { App } from "../App";
import { ToastProvider } from "../components/Toast";
import type {
  Activity,
  Contact,
  Dashboard,
  Deal,
  Organization,
} from "../lib/types";

export const org: Organization = {
  id: 1,
  name: "Acme Corp",
  website: "https://acme.test",
  industry: "Software",
  notes: null,
  contacts_count: 1,
  open_deals_count: 2,
  open_deals_value: 30000,
};
export const contact: Contact = {
  id: 1,
  first_name: "Ada",
  last_name: "Lovelace",
  name: "Ada Lovelace",
  email: "ada@acme.test",
  phone: null,
  job_title: "CTO",
  organization_id: 1,
  organization_name: "Acme Corp",
  status: "lead",
};
const baseDeal: Deal = {
  id: 1,
  name: "Platform rollout",
  organization_id: 1,
  organization_name: "Acme Corp",
  contact_id: 1,
  contact_name: "Ada Lovelace",
  stage: "new",
  value: 10000,
  probability: 5,
  close_date: "2026-01-01",
  position: 0,
  is_late: true,
  expected_revenue: 500,
};
export const deals: Deal[] = [
  baseDeal,
  {
    ...baseDeal,
    id: 2,
    name: "Support plan",
    stage: "qualified",
    value: 20000,
    probability: 20,
    is_late: false,
    close_date: null,
    expected_revenue: 4000,
  },
  {
    ...baseDeal,
    id: 3,
    name: "Old win",
    stage: "won",
    value: 5000,
    probability: 100,
    is_late: false,
    expected_revenue: 5000,
  },
];
const note: Activity = {
  id: 1,
  type: "note",
  contact_id: 1,
  deal_id: 1,
  description: "Intro chat",
  occurred_at: "2026-11-01T10:00:00",
  follow_up_date: "2026-11-10",
  follow_up_done: false,
  follow_up_state: "overdue",
  deal_name: "Platform rollout",
  contact_name: "Ada Lovelace",
};
export const dashboard: Dashboard = {
  today: "2026-11-17",
  tiles: {
    open_pipeline_value: 30000,
    open_deals: 2,
    expected_revenue: 4500,
    won_this_month_value: 5000,
    won_this_month_count: 1,
    overdue_follow_ups: 1,
  },
  pipeline: [],
  monthly: Array.from({ length: 12 }, (_, i) => ({
    month: `2026-${String(i + 1).padStart(2, "0")}`,
    revenue: i * 1000,
    deals_won: i % 3,
  })),
  funnel: [],
  lost: { count: 0, value: 0 },
  follow_ups: [note],
  recent_activity: [note],
};

export interface Call {
  method: string;
  path: string;
  body: unknown;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** An in-memory stand-in for the backend; `calls` records every request. */
export function fakeBackend(failWith?: Response, dealList: Deal[] = deals) {
  const calls: Call[] = [];
  const route = (method: string, path: string): Response => {
    if (failWith && method !== "GET") return failWith.clone();
    if (path.endsWith("/delete-preview"))
      return json({ contacts: 1, deals: 2, activities: 3, deals_kept: 0 });
    if (method === "DELETE") return new Response(null, { status: 204 });
    if (method !== "GET") return json({ ...note, id: 99 });
    if (path === "/health")
      return json({
        status: "ok",
        today: "2026-11-17",
        now: "2026-11-17T09:00:00",
      });
    if (path === "/dashboard") return json(dashboard);
    if (path === "/organizations") return json([org]);
    if (path === "/contacts") return json([contact]);
    if (path === "/deals") return json(dealList);
    if (path === "/organizations/1")
      return json({ ...org, contacts: [contact], deals, today: "2026-11-17" });
    if (path === "/contacts/1")
      return json({
        ...contact,
        organization: { id: 1, name: org.name },
        deals,
        timeline: [note],
      });
    if (path === "/deals/1") return json({ ...deals[0], timeline: [note] });
    return json({ detail: "Not found" }, 404);
  };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: { method?: string; body?: string }) => {
      const method = init?.method ?? "GET";
      const path = url.replace(/^\/api/, "");
      calls.push({
        method,
        path,
        body: init?.body ? JSON.parse(init.body) : undefined,
      });
      return route(method, path);
    }),
  );
  return calls;
}

export function renderApp(at: string) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[at]}>
        <ToastProvider>
          <App />
        </ToastProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
