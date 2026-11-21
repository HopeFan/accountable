import { z } from "zod";
import { CONTACT_STATUSES, STAGES } from "./types";

function wholeNumber(label: string, max?: number) {
  return z
    .string()
    .trim()
    .superRefine((v, ctx) => {
      if (v === "")
        return ctx.addIssue({
          code: "custom",
          message: `${label} is required`,
        });
      if (/^-/.test(v))
        return ctx.addIssue({
          code: "custom",
          message: `${label} can't be negative`,
        });
      if (!/^\d+$/.test(v))
        return ctx.addIssue({
          code: "custom",
          message: `${label} must be a whole number`,
        });
      if (max !== undefined && Number(v) > max)
        ctx.addIssue({
          code: "custom",
          message: `${label} can't be more than ${max}`,
        });
    });
}

const optionalEmail = z
  .string()
  .trim()
  .refine(
    (v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
    "Enter a valid email address",
  );

export const organizationSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  industry: z.string().trim(),
  website: z.string().trim(),
  notes: z.string().trim(),
});
export type OrganizationValues = z.infer<typeof organizationSchema>;

export const contactSchema = z.object({
  first_name: z.string().trim().min(1, "First name is required"),
  last_name: z.string().trim().min(1, "Last name is required"),
  email: optionalEmail,
  phone: z.string().trim(),
  job_title: z.string().trim(),
  organization_id: z.string(),
  status: z.enum(CONTACT_STATUSES),
});
export type ContactValues = z.infer<typeof contactSchema>;

export const dealSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  organization_id: z.string().min(1, "Choose an organization"),
  contact_id: z.string(),
  stage: z.enum(STAGES),
  value: wholeNumber("Value"),
  probability: wholeNumber("Probability", 100),
  close_date: z.string(),
});
export type DealValues = z.infer<typeof dealSchema>;

export const activitySchema = z.object({
  type: z.enum(["note", "call", "email"]),
  description: z.string().trim().min(1, "Describe what happened"),
  occurred_at: z.string().min(1, "Choose when it happened"),
  follow_up_date: z.string(),
});
export type ActivityValues = z.infer<typeof activitySchema>;

/** Empty string to null, for optional fields sent to the API. */
export const orNull = (v: string): string | null =>
  v.trim() === "" ? null : v.trim();
export const idOrNull = (v: string): number | null =>
  v === "" ? null : Number(v);
