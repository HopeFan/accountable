import { InvalidCredentials, type AuthClient, type Session } from "./auth";

// Test mode only: the backend accepts `test:<email>` as a token when it runs
// with test sign-in, and never does against a real Supabase project.
export const TEST_PASSWORD = "test-password";
export const TEST_SESSION_KEY = "accountable-test-session";

export function testSession(email: string): Session {
  return { email, accessToken: `test:${email}` };
}

type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function createTestAuth(store: Store = localStorage): AuthClient {
  const listeners = new Set<(session: Session | null) => void>();

  function read(): Session | null {
    const email = store.getItem(TEST_SESSION_KEY);
    return email ? testSession(email) : null;
  }

  function announce() {
    const session = read();
    listeners.forEach((listener) => listener(session));
  }

  return {
    async getSession() {
      return read();
    },
    async signIn(email, password) {
      if (password !== TEST_PASSWORD || !email.trim())
        throw new InvalidCredentials();
      store.setItem(TEST_SESSION_KEY, email.trim());
      announce();
    },
    async signOut() {
      store.removeItem(TEST_SESSION_KEY);
      announce();
    },
    onChange(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
