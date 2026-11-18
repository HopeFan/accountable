import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ConfirmDelete, deleteMessage } from "./ConfirmDelete";

const preview = { contacts: 4, deals: 3, activities: 17, deals_kept: 0 };

describe("deleteMessage", () => {
  it("names the record and lists what else goes", () => {
    expect(deleteMessage("organizations", "Northwind Logistics", preview)).toBe(
      "Delete Northwind Logistics? This also deletes 4 contacts, 3 deals and 17 activities. This can't be undone.",
    );
  });
  it("skips things that aren't there and uses the singular", () => {
    expect(deleteMessage("deals", "Big sale", { contacts: 0, deals: 0, activities: 1, deals_kept: 0 })).toBe(
      "Delete Big sale? This also deletes 1 activity. This can't be undone.",
    );
    expect(deleteMessage("deals", "Big sale", { contacts: 0, deals: 0, activities: 0, deals_kept: 0 })).toBe(
      "Delete Big sale? This can't be undone.",
    );
  });
  it("says that a contact's deals stay", () => {
    const text = deleteMessage("contacts", "Priya Nair", { contacts: 0, deals: 0, activities: 2, deals_kept: 1 });
    expect(text).toContain("This also deletes 2 activities.");
    expect(text).toContain("1 deal stays, with no main contact.");
    expect(deleteMessage("contacts", "P", { contacts: 0, deals: 0, activities: 0, deals_kept: 3 })).toContain("3 deals stay");
  });
});

describe("ConfirmDelete", () => {
  it("shows the message and deletes nothing until confirmed", async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(<ConfirmDelete kind="organizations" name="Northwind Logistics" preview={preview} onConfirm={onConfirm} onCancel={onCancel} />);
    expect(screen.getByTestId("delete-message")).toHaveTextContent("Delete Northwind Logistics? This also deletes 4 contacts, 3 deals and 17 activities.");
    expect(onConfirm).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("cancels without deleting", async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(<ConfirmDelete kind="deals" name="X" preview={preview} onConfirm={onConfirm} onCancel={onCancel} />);
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("can't be confirmed before the preview has loaded", () => {
    render(<ConfirmDelete kind="deals" name="X" preview={undefined} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Delete" })).toBeDisabled();
  });
});
