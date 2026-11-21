import { useState, type FormEvent } from "react";
import { Button, Field, inputClass } from "../components/ui";
import { InvalidCredentials, useAuth } from "../lib/auth";

const WRONG = "Email or password is wrong";
const UNAVAILABLE = "Can't sign in right now. Try again in a moment.";

export function SignIn() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await signIn(email.trim(), password);
    } catch (err) {
      setError(err instanceof InvalidCredentials ? WRONG : UNAVAILABLE);
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-page p-6">
      <form
        onSubmit={submit}
        className="flex w-full max-w-sm flex-col gap-4 rounded-xl bg-panel p-8 shadow-panel"
      >
        <div className="flex items-center gap-2.5 text-[19px] font-bold tracking-tight text-ink">
          <span className="grid size-[30px] place-items-center rounded-[9px] bg-primary text-[17px] text-on-accent">
            A
          </span>
          Accountable
        </div>
        <Field label="Email" htmlFor="email">
          <input
            id="email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Password" htmlFor="password">
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Button type="submit" busy={busy} className="text-on-accent!">
          Sign in
        </Button>
        {error && (
          <p role="alert" className="text-sm font-medium text-alert-text">
            {error}
          </p>
        )}
      </form>
    </main>
  );
}
