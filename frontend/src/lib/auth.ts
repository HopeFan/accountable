import { createContext, useContext } from "react";

export interface Session {
  email: string;
  accessToken: string;
}

/** Thrown by `signIn` when the email or password is wrong. */
export class InvalidCredentials extends Error {}

export interface AuthClient {
  getSession(): Promise<Session | null>;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  /** Calls `listener` whenever the session starts, changes or ends. */
  onChange(listener: (session: Session | null) => void): () => void;
}

export interface Auth {
  session: Session | null;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
}

export const AuthContext = createContext<Auth | null>(null);

export function useAuth(): Auth {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error("useAuth needs an AuthGate above it");
  return auth;
}

export function useSession(): Session | null {
  return useAuth().session;
}

// api.ts has no React context, so it reads the client from here.
let activeClient: AuthClient | null = null;

export function setActiveAuthClient(client: AuthClient | null) {
  activeClient = client;
}

export function getActiveAuthClient(): AuthClient | null {
  return activeClient;
}
