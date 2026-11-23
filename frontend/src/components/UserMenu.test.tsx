import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthContext, type Auth } from "../lib/auth";
import { getCurrency } from "../lib/currency";
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
    const all = screen.getAllByRole("menuitemradio");
    expect(all.map((i) => i.textContent)).toEqual([
      "Light",
      "Dark",
      "System",
      "🇺🇸US dollar",
      "🇦🇺Australian dollar",
    ]);
    const items = all.slice(0, 3);
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

describe("UserMenu currency", () => {
  it("lists both currencies with US dollar selected by default", async () => {
    const user = setup();
    await user.click(trigger());
    expect(screen.getByText("Currency")).toBeVisible();
    expect(
      screen.getByRole("menuitemradio", { name: /US dollar/ }),
    ).toBeChecked();
    expect(
      screen.getByRole("menuitemradio", { name: /Australian dollar/ }),
    ).not.toBeChecked();
  });

  it("choosing Australian dollar stores it and changes the badge and tooltip", async () => {
    const user = setup();
    expect(screen.getByTestId("currency-badge")).toHaveAttribute(
      "data-flag",
      "🇺🇸",
    );
    await user.click(trigger());
    await user.click(
      screen.getByRole("menuitemradio", { name: /Australian dollar/ }),
    );
    expect(getCurrency()).toBe("AUD");
    expect(localStorage.getItem("accountable-currency")).toBe("AUD");
    expect(screen.getByTestId("currency-badge")).toHaveAttribute(
      "data-flag",
      "🇦🇺",
    );
    expect(trigger()).toHaveAttribute("title", "Australian dollar");

    await user.click(trigger());
    expect(
      screen.getByRole("menuitemradio", { name: /Australian dollar/ }),
    ).toBeChecked();
  });

  it("choosing US dollar again restores it", async () => {
    const user = setup();
    await user.click(trigger());
    await user.click(
      screen.getByRole("menuitemradio", { name: /Australian dollar/ }),
    );
    await user.click(trigger());
    await user.click(screen.getByRole("menuitemradio", { name: /US dollar/ }));
    expect(getCurrency()).toBe("USD");
    expect(trigger()).toHaveAttribute("title", "US dollar");
  });

  it("works with the keyboard", async () => {
    const user = setup();
    await user.tab();
    await user.keyboard("{Enter}");
    const aud = screen.getByRole("menuitemradio", {
      name: /Australian dollar/,
    });
    for (let i = 0; i < 10 && document.activeElement !== aud; i++) {
      await user.keyboard("{ArrowDown}");
    }
    expect(aud).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(getCurrency()).toBe("AUD");
  });

  it("keeps the accessible name of the button", () => {
    setup();
    expect(trigger()).toHaveAccessibleName("User menu");
  });
});
