import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { ThemeToggle } from "./ThemeToggle";

afterEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
});

describe("ThemeToggle", () => {
  it("switches to dark and back, remembering each choice", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);
    await user.click(screen.getByRole("button", { name: "Dark mode" }));
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    expect(localStorage.getItem("accountable-theme")).toBe("dark");

    await user.click(screen.getByRole("button", { name: "Light mode" }));
    expect(document.documentElement).not.toHaveAttribute("data-theme");
    expect(localStorage.getItem("accountable-theme")).toBe("light");
    expect(screen.getByRole("button", { name: "Dark mode" })).toBeVisible();
  });

  it("starts by offering light mode when dark was stored", () => {
    localStorage.setItem("accountable-theme", "dark");
    render(<ThemeToggle />);
    expect(screen.getByRole("button", { name: "Light mode" })).toBeVisible();
  });

  it("works with the keyboard", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);
    await user.tab();
    expect(screen.getByRole("button", { name: "Dark mode" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
  });
});
