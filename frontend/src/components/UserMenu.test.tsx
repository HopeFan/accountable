import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthContext, type Auth } from "../lib/auth";
import { UserMenu, initialsOf } from "./UserMenu";

const signOut = vi.fn(async () => {});

function setup(email = "ada@example.com") {
  const auth: Auth = {
    session: { email, accessToken: "t" },
    signIn: async () => {},
    signOut,
  };
  render(
    <AuthContext.Provider value={auth}>
      <UserMenu />
    </AuthContext.Provider>,
  );
  return userEvent.setup();
}

const trigger = () => screen.getByRole("button", { name: "User menu" });

afterEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  signOut.mockClear();
});

describe("initialsOf", () => {
  it("is the first two letters in capitals", () => {
    expect(initialsOf("ada@example.com")).toBe("AD");
    expect(initialsOf("x@y.com")).toBe("X@");
  });
});

describe("UserMenu", () => {
  it("shows the initials on the button", () => {
    setup("ada@example.com");
    expect(trigger()).toHaveTextContent("AD");
  });

  it("shows the email, three theme choices with one selected, and Sign out", async () => {
    const user = setup();
    await user.click(trigger());
    expect(screen.getByText("ada@example.com")).toBeVisible();
    const items = screen.getAllByRole("menuitemradio");
    expect(items.map((i) => i.textContent)).toEqual([
      "Light",
      "Dark",
      "System",
    ]);
    expect(items.map((i) => i.getAttribute("aria-checked"))).toEqual([
      "false",
      "false",
      "true",
    ]);
    expect(screen.getByRole("menuitem", { name: "Sign out" })).toBeVisible();
  });

  it("choosing a theme applies it, stores it and marks it", async () => {
    const user = setup();
    await user.click(trigger());
    await user.click(screen.getByRole("menuitemradio", { name: "Dark" }));
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    expect(localStorage.getItem("accountable-theme")).toBe("dark");

    await user.click(trigger());
    expect(screen.getByRole("menuitemradio", { name: "Dark" })).toBeChecked();
    await user.click(screen.getByRole("menuitemradio", { name: "Light" }));
    expect(document.documentElement).not.toHaveAttribute("data-theme");
    expect(localStorage.getItem("accountable-theme")).toBe("light");
  });

  it("starts with the stored choice selected", async () => {
    localStorage.setItem("accountable-theme", "light");
    const user = setup();
    await user.click(trigger());
    expect(screen.getByRole("menuitemradio", { name: "Light" })).toBeChecked();
  });

  it("Sign out calls the auth client", async () => {
    const user = setup();
    await user.click(trigger());
    await user.click(screen.getByRole("menuitem", { name: "Sign out" }));
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it("opens with the keyboard and closes on Escape", async () => {
    const user = setup();
    await user.tab();
    expect(trigger()).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("menu")).toBeVisible();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).toBeNull();
    expect(trigger()).toHaveFocus();
  });

  it("closes on a click outside", async () => {
    const user = setup();
    await user.click(trigger());
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole("menu")).toBeNull();
  });
});
