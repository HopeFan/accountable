export const STAGES = [
  "new",
  "qualified",
  "proposal",
  "negotiation",
  "won",
  "lost",
] as const;
export type Stage = (typeof STAGES)[number];
export const OPEN_STAGES: Stage[] = [
  "new",
  "qualified",
  "proposal",
  "negotiation",
];
export const STAGE_LABEL: Record<Stage, string> = {
  new: "New",
  qualified: "Qualified",
  proposal: "Proposal",
  negotiation: "Negotiation",
  won: "Won",
  lost: "Lost",
};
export const USUAL_PROBABILITY: Record<Stage, number> = {
  new: 5,
  qualified: 20,
  proposal: 40,
  negotiation: 70,
  won: 100,
  lost: 0,
};
export const CONTACT_STATUSES = ["lead", "qualified", "customer"] as const;
export type ContactStatus = (typeof CONTACT_STATUSES)[number];
export const STATUS_LABEL: Record<ContactStatus, string> = {
  lead: "Lead",
  qualified: "Qualified",
  customer: "Customer",
};

export interface Organization {
  id: number;
  name: string;
  website: string | null;
  industry: string | null;
  notes: string | null;
  contacts_count: number;
  open_deals_count: number;
  open_deals_value: number;
}
export interface Contact {
  id: number;
  first_name: string;
  last_name: string;
  name: string;
  email: string | null;
  phone: string | null;
  job_title: string | null;
  organization_id: number | null;
  organization_name: string | null;
  status: ContactStatus;
}
export interface Deal {
  id: number;
  name: string;
  organization_id: number;
  organization_name: string;
  contact_id: number | null;
  contact_name: string | null;
  stage: Stage;
  value: number;
  probability: number;
  close_date: string | null;
  position: number;
  is_late: boolean;
  expected_revenue: number;
}
export type ActivityType = "note" | "call" | "email" | "stage_change";
export type FollowUpState = "open" | "done" | "overdue" | null;
export interface Activity {
  id: number;
  type: ActivityType;
  contact_id: number | null;
  deal_id: number | null;
  description: string;
  occurred_at: string;
  follow_up_date: string | null;
  follow_up_done: boolean;
  follow_up_state: FollowUpState;
  deal_name: string | null;
  contact_name: string | null;
}
export interface OrganizationDetail extends Organization {
  contacts: Contact[];
  deals: Deal[];
  today: string;
}
export interface ContactDetail extends Contact {
  organization: { id: number; name: string } | null;
  deals: Deal[];
  timeline: Activity[];
}
export interface DealDetail extends Deal {
  timeline: Activity[];
}
export interface DeletePreview {
  contacts: number;
  deals: number;
  activities: number;
  deals_kept: number;
}
export interface Dashboard {
  today: string;
  tiles: {
    open_pipeline_value: number;
    open_deals: number;
    expected_revenue: number;
    won_this_month_value: number;
    won_this_month_count: number;
    overdue_follow_ups: number;
  };
  pipeline: {
    stage: Stage;
    count: number;
    value: number;
    probability: number;
    expected_revenue: number;
  }[];
  monthly: { month: string; revenue: number; deals_won: number }[];
  funnel: { stage: Stage; count: number; value: number }[];
  lost: { count: number; value: number };
  follow_ups: Activity[];
  recent_activity: Activity[];
}
export interface Health {
  status: string;
  today: string;
  now: string;
}
