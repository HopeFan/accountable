import type { AuthClient } from "./auth";

export type Config =
  { testAuth: true } | { supabaseUrl: string; supabasePublishableKey: string };

export async function fetchConfig(): Promise<Config> {
  const res = await fetch("/config.json");
  if (!res.ok) throw new Error("Can't load the app's settings");
  return res.json();
}

export async function createAuthClient(config: Config): Promise<AuthClient> {
  // Each client is code-split and loaded only when needed, so the first
  // download carries neither. The production backend rejects the test sign-in.
  if ("testAuth" in config) {
    const { createTestAuth } = await import("./testAuth");
    return createTestAuth();
  }
  const { createSupabaseAuth } = await import("./supabaseAuth");
  return createSupabaseAuth(config.supabaseUrl, config.supabasePublishableKey);
}
