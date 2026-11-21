import {
  createClient,
  type Session as SupabaseSession,
} from "@supabase/supabase-js";
import { InvalidCredentials, type AuthClient, type Session } from "./auth";

function toSession(session: SupabaseSession | null): Session | null {
  if (!session?.user.email) return null;
  return { email: session.user.email, accessToken: session.access_token };
}

export function createSupabaseAuth(url: string, key: string): AuthClient {
  const supabase = createClient(url, key);
  return {
    async getSession() {
      const { data } = await supabase.auth.getSession();
      return toSession(data.session);
    },
    async signIn(email, password) {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (!error) return;
      if (error.status === 400) throw new InvalidCredentials();
      throw error;
    },
    async signOut() {
      await supabase.auth.signOut();
    },
    onChange(listener) {
      const { data } = supabase.auth.onAuthStateChange((_event, session) =>
        listener(toSession(session)),
      );
      return () => data.subscription.unsubscribe();
    },
  };
}
