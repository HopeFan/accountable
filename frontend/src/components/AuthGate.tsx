import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AuthContext,
  setActiveAuthClient,
  type Auth,
  type AuthClient,
  type Session,
} from "../lib/auth";
import { SignIn } from "../pages/SignIn";

type State = { loading: true } | { loading: false; session: Session | null };

export function AuthGate({
  client,
  children,
}: {
  client: AuthClient;
  children: ReactNode;
}) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<State>({ loading: true });

  useEffect(() => {
    setActiveAuthClient(client);
    let live = true;
    const show = (session: Session | null) => {
      if (!live) return;
      // Another person may sign in next on this browser.
      if (!session) queryClient.clear();
      setState({ loading: false, session });
    };
    const stop = client.onChange(show);
    client.getSession().then(show);
    return () => {
      live = false;
      stop();
      setActiveAuthClient(null);
    };
  }, [client, queryClient]);

  const session = state.loading ? null : state.session;
  const auth = useMemo<Auth>(
    () => ({
      session,
      signIn: (email, password) => client.signIn(email, password),
      signOut: () => client.signOut(),
    }),
    [client, session],
  );

  if (state.loading)
    return (
      <div className="grid min-h-screen place-items-center bg-page text-muted">
        <p role="status">Loading…</p>
      </div>
    );

  return (
    <AuthContext.Provider value={auth}>
      {session ? children : <SignIn />}
    </AuthContext.Provider>
  );
}
