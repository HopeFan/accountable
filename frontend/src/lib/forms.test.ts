import { describe, expect, it } from "vitest";
import {
  activitySchema,
  contactSchema,
  dealSchema,
  organizationSchema,
} from "./forms";

const deal = {
  name: "Big sale",
  organization_id: "1",
  contact_id: "",
  stage: "new",
  value: "1000",
  probability: "5",
  close_date: "",
};
const messages = (r: {
  success: boolean;
  error?: { issues: { message: string }[] };
}) => (r.success ? [] : r.error!.issues.map((i) => i.message));

describe("required fields", () => {
  it("needs an organization name", () => {
    const r = organizationSchema.safeParse({
      name: "  ",
      industry: "",
      website: "",
      notes: "",
    });
    expect(messages(r)).toContain("Name is required");
  });
  it("needs both contact names", () => {
    const r = contactSchema.safeParse({
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      job_title: "",
      organization_id: "",
      status: "lead",
    });
    expect(messages(r)).toEqual([
      "First name is required",
      "Last name is required",
    ]);
  });
  it("needs a deal name and an organization", () => {
    const r = dealSchema.safeParse({ ...deal, name: "", organization_id: "" });
    expect(messages(r)).toEqual(["Name is required", "Choose an organization"]);
  });
  it("needs a description for an activity", () => {
    const r = activitySchema.safeParse({
      type: "note",
      description: "",
      occurred_at: "2026-11-17T10:00",
      follow_up_date: "",
    });
    expect(messages(r)).toContain("Describe what happened");
  });
});

describe("email", () => {
  const base = {
    first_name: "A",
    last_name: "B",
    phone: "",
    job_title: "",
    organization_id: "",
    status: "lead",
  };
  it("is optional but must look like an email", () => {
    expect(contactSchema.safeParse({ ...base, email: "" }).success).toBe(true);
    expect(
      contactSchema.safeParse({ ...base, email: "ada@example.com" }).success,
    ).toBe(true);
    expect(
      messages(contactSchema.safeParse({ ...base, email: "ada" })),
    ).toEqual(["Enter a valid email address"]);
    expect(
      contactSchema.safeParse({ ...base, email: "ada@nowhere" }).success,
    ).toBe(false);
  });
});

describe("deal numbers", () => {
  it("accepts a valid deal", () => {
    expect(dealSchema.safeParse(deal).success).toBe(true);
  });
  it("refuses a negative value", () => {
    expect(messages(dealSchema.safeParse({ ...deal, value: "-5" }))).toEqual([
      "Value can't be negative",
    ]);
  });
  it("refuses a value that isn't a whole number", () => {
    expect(messages(dealSchema.safeParse({ ...deal, value: "12.5" }))).toEqual([
      "Value must be a whole number",
    ]);
    expect(messages(dealSchema.safeParse({ ...deal, value: "" }))).toEqual([
      "Value is required",
    ]);
  });
  it("keeps probability within 0 to 100", () => {
    expect(dealSchema.safeParse({ ...deal, probability: "0" }).success).toBe(
      true,
    );
    expect(dealSchema.safeParse({ ...deal, probability: "100" }).success).toBe(
      true,
    );
    expect(
      messages(dealSchema.safeParse({ ...deal, probability: "101" })),
    ).toEqual(["Probability can't be more than 100"]);
    expect(
      messages(dealSchema.safeParse({ ...deal, probability: "-1" })),
    ).toEqual(["Probability can't be negative"]);
  });
});
