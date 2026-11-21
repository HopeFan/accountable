import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AuthContext, InvalidCredentials, type Auth } from "../lib/auth";
import { SignIn } from "./SignIn";

function renderSignIn(signIn: Auth["signIn"]) {
  const auth: Auth = { session: null, signIn, signOut: async () => {} };
  return render(
    <AuthContext.Provider value={auth}>
      <SignIn />
    </AuthContext.Provider>,
  );
}

async function fillIn() {
  await userEvent.type(screen.getByLabelText("Email"), "ada@example.com");
  await userEvent.type(screen.getByLabelText("Password"), "secret");
}

describe("SignIn", () => {
  it("has both fields and the button, and nothing about sign-up", () => {
    renderSignIn(vi.fn());
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
    expect(
      screen.queryByText(/sign up|forgot|reset|create account/i),
    ).toBeNull();
  });

  it("submits with Enter", async () => {
    const signIn = vi.fn(async () => {});
    renderSignIn(signIn);
    await fillIn();
    await userEvent.keyboard("{Enter}");
    expect(signIn).toHaveBeenCalledWith("ada@example.com", "secret");
  });

  it("shows the error line on a wrong password", async () => {
    renderSignIn(
      vi.fn(async () => {
        throw new InvalidCredentials();
      }),
    );
    await fillIn();
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Email or password is wrong",
    );
    expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
  });

  it("says something else when sign-in can't be reached", async () => {
    renderSignIn(
      vi.fn(async () => {
        throw new Error("network");
      }),
    );
    await fillIn();
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("alert")).not.toHaveTextContent(
      "Email or password is wrong",
    );
  });

  it("can't be pressed twice while working", async () => {
    let finish: () => void = () => {};
    const signIn = vi.fn(
      () => new Promise<void>((resolve) => (finish = resolve)),
    );
    renderSignIn(signIn);
    await fillIn();
    const button = screen.getByRole("button", { name: "Sign in" });
    await userEvent.click(button);
    expect(button).toBeDisabled();
    await userEvent.keyboard("{Enter}");
    expect(signIn).toHaveBeenCalledTimes(1);
    finish();
    await waitFor(() => expect(signIn).toHaveBeenCalledTimes(1));
  });
});
