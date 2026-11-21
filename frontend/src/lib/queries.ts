import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { api } from "./api";
import type {
  Activity,
  Contact,
  ContactDetail,
  Dashboard,
  Deal,
  DealDetail,
  DeletePreview,
  Health,
  Organization,
  OrganizationDetail,
  Stage,
} from "./types";

export const keys = {
  health: ["health"] as const,
  organizations: ["organizations"] as const,
  organization: (id: number) => ["organizations", id] as const,
  contacts: ["contacts"] as const,
  contact: (id: number) => ["contacts", id] as const,
  deals: ["deals"] as const,
  deal: (id: number) => ["deals", id] as const,
  dashboard: ["dashboard"] as const,
  followUps: ["follow-ups"] as const,
  preview: (kind: string, id: number) => ["preview", kind, id] as const,
};

export const useHealth = () =>
  useQuery({ queryKey: keys.health, queryFn: () => api<Health>("/health"), staleTime: Infinity });
export const useOrganizations = () =>
  useQuery({ queryKey: keys.organizations, queryFn: () => api<Organization[]>("/organizations") });
export const useOrganization = (id: number) =>
  useQuery({ queryKey: keys.organization(id), queryFn: () => api<OrganizationDetail>(`/organizations/${id}`) });
export const useContacts = () => useQuery({ queryKey: keys.contacts, queryFn: () => api<Contact[]>("/contacts") });
export const useContact = (id: number) =>
  useQuery({ queryKey: keys.contact(id), queryFn: () => api<ContactDetail>(`/contacts/${id}`) });
export const useDeals = () => useQuery({ queryKey: keys.deals, queryFn: () => api<Deal[]>("/deals") });
export const useDeal = (id: number) =>
  useQuery({ queryKey: keys.deal(id), queryFn: () => api<DealDetail>(`/deals/${id}`) });
export const useDashboard = () => useQuery({ queryKey: keys.dashboard, queryFn: () => api<Dashboard>("/dashboard") });

export type RecordKind = "organizations" | "contacts" | "deals";
export const useDeletePreview = (kind: RecordKind, id: number | null) =>
  useQuery({
    queryKey: keys.preview(kind, id ?? 0),
    queryFn: () => api<DeletePreview>(`/${kind}/${id}/delete-preview`),
    enabled: id !== null,
    gcTime: 0,
  });

/** Every change refreshes everything on screen, including the dashboard (R15). */
export function useSave<TBody, TResult = unknown>(
  build: (body: TBody) => { path: string; method: string; body?: unknown },
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: TBody) => {
      const { path, method, body } = build(input);
      return api<TResult>(path, { method, body });
    },
    onSettled: () => refreshAll(qc),
  });
}

/** Refetch what's on screen, but not delete previews, which describe a record that may be gone. */
function refreshAll(qc: QueryClient) {
  return qc.invalidateQueries({ predicate: (q) => q.queryKey[0] !== "preview" });
}

export const useCreate = <T = unknown,>(kind: RecordKind | "activities") =>
  useSave<unknown, T>((body) => ({ path: `/${kind}`, method: "POST", body }));
export const useUpdate = <T = unknown,>(kind: RecordKind | "activities") =>
  useSave<{ id: number; body: unknown }, T>(({ id, body }) => ({ path: `/${kind}/${id}`, method: "PATCH", body }));
/** Deletes a record. The page of the deleted record is left alone, so nothing asks for it again. */
export function useRemove(kind: RecordKind | "activities") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api<void>(`/${kind}/${id}`, { method: "DELETE" }),
    onSettled: (_d, _e, id) =>
      qc.invalidateQueries({
        predicate: (q) => q.queryKey[0] !== "preview" && !(q.queryKey[0] === kind && q.queryKey[1] === id),
      }),
  });
}
export const useMoveDeal = () =>
  useSave<{ id: number; stage: Stage; position: number }, Deal>(({ id, stage, position }) => ({
    path: `/deals/${id}/move`,
    method: "POST",
    body: { stage, position },
  }));

/** Marks a follow-up done or reopens it. The dashboard list updates at once. */
export function useToggleFollowUp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, done }: { id: number; done: boolean }) =>
      api<Activity>(`/activities/${id}`, { method: "PATCH", body: { follow_up_done: done } }),
    onMutate: async ({ id, done }) => {
      await qc.cancelQueries({ queryKey: keys.dashboard });
      const previous = qc.getQueryData<Dashboard>(keys.dashboard);
      if (previous && done) {
        const gone = previous.follow_ups.find((f) => f.id === id);
        qc.setQueryData<Dashboard>(keys.dashboard, {
          ...previous,
          follow_ups: previous.follow_ups.filter((f) => f.id !== id),
          tiles: {
            ...previous.tiles,
            overdue_follow_ups: previous.tiles.overdue_follow_ups - (gone?.follow_up_state === "overdue" ? 1 : 0),
          },
        });
      }
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(keys.dashboard, ctx.previous);
    },
    onSettled: () => refreshAll(qc),
  });
}
