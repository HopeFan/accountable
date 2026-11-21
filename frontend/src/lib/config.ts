import { createTestAuth } from "./testAuth";
import type { AuthClient } from "./auth";

export type Config =
  { testAuth: true } | { supabaseUrl: string; supabasePublishableKey: string };

export async function fetchConfig(): Promise<Config> {
  const res = await fetch("/config.json");
  if (!res.ok) throw new Error("Can't load the app's settings");
  return res.json();
}

export async function createAuthClient(config: Config): Promise<AuthClient> {
  if ("testAuth" in config) return createTestAuth();
  // Loaded only when needed, so test mode never pulls in the Supabase client.
  const { createSupabaseAuth } = await import("./supabaseAuth");
  return createSupabaseAuth(config.supabaseUrl, config.supabasePublishableKey);
}
