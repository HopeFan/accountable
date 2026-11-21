import { useQuery } from "@tanstack/react-query";
import { api } from "./api";

export interface SearchHit {
  id: number;
  name: string;
  context: string;
}

export interface SearchResults {
  organizations: SearchHit[];
  contacts: SearchHit[];
  deals: SearchHit[];
}

export type SearchKind = keyof SearchResults;

/** The groups in the order the dropdown shows them. */
export const SEARCH_GROUPS: { kind: SearchKind; label: string }[] = [
  { kind: "organizations", label: "Organizations" },
  { kind: "contacts", label: "Contacts" },
  { kind: "deals", label: "Deals" },
];

/** Searches for already-debounced text; nothing is requested for a blank one. */
export const useSearch = (query: string) =>
  useQuery({
    queryKey: ["search", query],
    queryFn: () => api<SearchResults>(`/search?q=${encodeURIComponent(query)}`),
    enabled: query !== "",
    staleTime: 30_000,
  });
