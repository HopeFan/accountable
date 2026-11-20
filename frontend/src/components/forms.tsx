import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, type ReactNode } from "react";
import {
  useForm,
  useWatch,
  type UseFormReturn,
  type FieldValues,
  type Path,
  type UseFormSetError,
} from "react-hook-form";
import { ApiError } from "../lib/api";
import {
  activitySchema,
  contactSchema,
  dealSchema,
  idOrNull,
  orNull,
  organizationSchema,
  type ActivityValues,
  type ContactValues,
  type DealValues,
  type OrganizationValues,
} from "../lib/forms";
import { toLocalInput } from "../lib/format";
import {
  useContacts,
  useCreate,
  useHealth,
  useOrganizations,
  useUpdate,
} from "../lib/queries";
import {
  CONTACT_STATUSES,
  STAGES,
  STAGE_LABEL,
  STATUS_LABEL,
  USUAL_PROBABILITY,
  type Activity,
  type Contact,
  type Deal,
  type Organization,
  type Stage,
} from "../lib/types";
import { FormActions } from "./RecordDialog";
import { useToast } from "./Toast";
import { Field, inputClass } from "./ui";

function useServerErrors<T extends FieldValues>(setError: UseFormSetError<T>) {
  const toast = useToast();
  return (e: unknown) => {
    if (e instanceof ApiError && e.fields.length) {
      for (const f of e.fields)
        setError(f.field as Path<T>, { message: f.message });
    } else {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    }
  };
}

function FormShell({
  onSubmit,
  children,
}: {
  onSubmit: () => void;
  children: ReactNode;
}) {
  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {children}
    </form>
  );
}

// ---- Organization ----------------------------------------------------------------

export function OrganizationForm({
  initial,
  onDone,
  onCancel,
}: {
  initial?: Organization;
  onDone: (saved: Organization) => void;
  onCancel: () => void;
}) {
  const toast = useToast();
  const create = useCreate<Organization>("organizations");
  const update = useUpdate<Organization>("organizations");
  const form = useForm<OrganizationValues>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      name: initial?.name ?? "",
      industry: initial?.industry ?? "",
      website: initial?.website ?? "",
      notes: initial?.notes ?? "",
    },
  });
  const { register, handleSubmit, setError, formState } = form;
  const onError = useServerErrors(setError);
  const e = formState.errors;
  const busy = create.isPending || update.isPending;

  const submit = handleSubmit(async (v) => {
    const body = {
      name: v.name,
      industry: orNull(v.industry),
      website: orNull(v.website),
      notes: orNull(v.notes),
    };
    try {
      const saved = initial
        ? await update.mutateAsync({ id: initial.id, body })
        : await create.mutateAsync(body);
      toast.success(initial ? "Organization saved" : "Organization added");
      onDone(saved);
    } catch (err) {
      onError(err);
    }
  });

  return (
    <FormShell onSubmit={submit}>
      <Field label="Name" required htmlFor="org-name" error={e.name?.message}>
        <input
          id="org-name"
          className={inputClass}
          aria-invalid={!!e.name}
          {...register("name")}
        />
      </Field>
      <Field label="Industry" htmlFor="org-industry">
        <input
          id="org-industry"
          className={inputClass}
          {...register("industry")}
        />
      </Field>
      <Field label="Website" htmlFor="org-website">
        <input
          id="org-website"
          className={inputClass}
          placeholder="example.com"
          {...register("website")}
        />
      </Field>
      <Field label="Notes" htmlFor="org-notes">
        <textarea
          id="org-notes"
          rows={3}
          className={`${inputClass} h-auto py-2`}
          {...register("notes")}
        />
      </Field>
      <FormActions
        onCancel={onCancel}
        busy={busy}
        submitLabel={initial ? "Save" : "Add organization"}
      />
    </FormShell>
  );
}

// ---- Contact ---------------------------------------------------------------------

function contactDefaults(
  initial: Partial<Contact> = {},
  organizationId?: number,
): ContactValues {
  return {
    first_name: initial.first_name ?? "",
    last_name: initial.last_name ?? "",
    email: initial.email ?? "",
    phone: initial.phone ?? "",
    job_title: initial.job_title ?? "",
    organization_id: String(initial.organization_id ?? organizationId ?? ""),
    status: initial.status ?? "lead",
  };
}

function contactBody(v: ContactValues) {
  return {
    first_name: v.first_name,
    last_name: v.last_name,
    email: orNull(v.email),
    phone: orNull(v.phone),
    job_title: orNull(v.job_title),
    organization_id: idOrNull(v.organization_id),
    status: v.status,
  };
}

function ContactNameFields({ form }: { form: UseFormReturn<ContactValues> }) {
  const { register } = form;
  const e = form.formState.errors;
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <Field
          label="First name"
          required
          htmlFor="c-first"
          error={e.first_name?.message}
        >
          <input
            id="c-first"
            className={inputClass}
            aria-invalid={!!e.first_name}
            {...register("first_name")}
          />
        </Field>
        <Field
          label="Last name"
          required
          htmlFor="c-last"
          error={e.last_name?.message}
        >
          <input
            id="c-last"
            className={inputClass}
            aria-invalid={!!e.last_name}
            {...register("last_name")}
          />
        </Field>
      </div>
      <Field label="Email" htmlFor="c-email" error={e.email?.message}>
        <input
          id="c-email"
          type="email"
          className={inputClass}
          aria-invalid={!!e.email}
          {...register("email")}
        />
      </Field>
    </>
  );
}

function ContactWorkFields({ form }: { form: UseFormReturn<ContactValues> }) {
  const { register } = form;
  const e = form.formState.errors;
  const orgs = useOrganizations();
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Phone" htmlFor="c-phone">
          <input id="c-phone" className={inputClass} {...register("phone")} />
        </Field>
        <Field label="Job title" htmlFor="c-title">
          <input
            id="c-title"
            className={inputClass}
            {...register("job_title")}
          />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field
          label="Organization"
          htmlFor="c-org"
          error={e.organization_id?.message}
        >
          <select
            id="c-org"
            className={inputClass}
            {...register("organization_id")}
          >
            <option value="">None</option>
            {orgs.data?.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Status" htmlFor="c-status">
          <select id="c-status" className={inputClass} {...register("status")}>
            {CONTACT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </Field>
      </div>
    </>
  );
}

export function ContactForm({
  initial,
  organizationId,
  onDone,
  onCancel,
}: {
  initial?: Contact;
  organizationId?: number;
  onDone: (saved: Contact) => void;
  onCancel: () => void;
}) {
  const toast = useToast();
  const create = useCreate<Contact>("contacts");
  const update = useUpdate<Contact>("contacts");
  const form = useForm<ContactValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: contactDefaults(initial, organizationId),
  });
  const onError = useServerErrors(form.setError);

  const submit = form.handleSubmit(async (v) => {
    const body = contactBody(v);
    try {
      const saved = initial
        ? await update.mutateAsync({ id: initial.id, body })
        : await create.mutateAsync(body);
      toast.success(initial ? "Contact saved" : "Contact added");
      onDone(saved);
    } catch (err) {
      onError(err);
    }
  });

  return (
    <FormShell onSubmit={submit}>
      <ContactNameFields form={form} />
      <ContactWorkFields form={form} />
      <FormActions
        onCancel={onCancel}
        busy={create.isPending || update.isPending}
        submitLabel={initial ? "Save" : "Add contact"}
      />
    </FormShell>
  );
}

// ---- Deal ------------------------------------------------------------------------

function dealDefaults(
  initial: Deal | undefined,
  startStage: Stage,
  organizationId?: number,
  contactId?: number,
): DealValues {
  return {
    name: initial?.name ?? "",
    organization_id: String(initial?.organization_id ?? organizationId ?? ""),
    contact_id: String(initial?.contact_id ?? contactId ?? ""),
    stage: startStage,
    value: String(initial?.value ?? 0),
    probability: String(initial?.probability ?? USUAL_PROBABILITY[startStage]),
    close_date: initial?.close_date ?? "",
  };
}

function dealBody(v: DealValues) {
  return {
    name: v.name,
    organization_id: Number(v.organization_id),
    contact_id: idOrNull(v.contact_id),
    stage: v.stage,
    value: Number(v.value),
    probability: Number(v.probability),
    close_date: orNull(v.close_date),
  };
}

/** A new stage brings its usual probability; the person can still change it afterwards. */
function useUsualProbability(
  form: UseFormReturn<DealValues>,
  startStage: Stage,
  initial?: Deal,
) {
  const { control, setValue } = form;
  const stageValue = useWatch({ control, name: "stage" });
  useEffect(() => {
    if (stageValue !== startStage)
      setValue("probability", String(USUAL_PROBABILITY[stageValue]));
    else if (initial) setValue("probability", String(initial.probability));
  }, [stageValue, startStage, initial, setValue]);
}

function DealNameField({ form }: { form: UseFormReturn<DealValues> }) {
  const e = form.formState.errors;
  return (
    <Field label="Name" required htmlFor="d-name" error={e.name?.message}>
      <input
        id="d-name"
        className={inputClass}
        aria-invalid={!!e.name}
        {...form.register("name")}
      />
    </Field>
  );
}

function DealWhoFields({ form }: { form: UseFormReturn<DealValues> }) {
  const { register, setValue, control } = form;
  const e = form.formState.errors;
  const orgs = useOrganizations();
  const contacts = useContacts();
  const orgId = useWatch({ control, name: "organization_id" });
  const contactOptions = (contacts.data ?? []).filter(
    (c) => String(c.organization_id) === orgId,
  );
  return (
    <div className="grid grid-cols-2 gap-4">
      <Field
        label="Organization"
        required
        htmlFor="d-org"
        error={e.organization_id?.message}
      >
        <select
          id="d-org"
          className={inputClass}
          aria-invalid={!!e.organization_id}
          {...register("organization_id", {
            onChange: () => setValue("contact_id", ""),
          })}
        >
          <option value="">Choose…</option>
          {orgs.data?.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </Field>
      <Field
        label="Main contact"
        htmlFor="d-contact"
        error={e.contact_id?.message}
      >
        <select
          id="d-contact"
          className={inputClass}
          disabled={!orgId}
          {...register("contact_id")}
        >
          <option value="">None</option>
          {contactOptions.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>
    </div>
  );
}

function DealMoneyFields({ form }: { form: UseFormReturn<DealValues> }) {
  const { register } = form;
  const e = form.formState.errors;
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Stage" htmlFor="d-stage">
          <select id="d-stage" className={inputClass} {...register("stage")}>
            {STAGES.map((s) => (
              <option key={s} value={s}>
                {STAGE_LABEL[s]}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label="Value (USD)"
          required
          htmlFor="d-value"
          error={e.value?.message}
        >
          <input
            id="d-value"
            inputMode="numeric"
            className={`${inputClass} font-mono`}
            aria-invalid={!!e.value}
            {...register("value")}
          />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field
          label="Probability of close (%)"
          required
          htmlFor="d-prob"
          error={e.probability?.message}
        >
          <input
            id="d-prob"
            inputMode="numeric"
            className={`${inputClass} font-mono`}
            aria-invalid={!!e.probability}
            {...register("probability")}
          />
        </Field>
        <Field
          label="Close date"
          htmlFor="d-close"
          error={e.close_date?.message}
        >
          <input
            id="d-close"
            type="date"
            className={`${inputClass} font-mono`}
            {...register("close_date")}
          />
        </Field>
      </div>
    </>
  );
}

export function DealForm({
  initial,
  stage,
  organizationId,
  contactId,
  onDone,
  onCancel,
}: {
  initial?: Deal;
  stage?: Stage;
  organizationId?: number;
  contactId?: number;
  onDone: (saved: Deal) => void;
  onCancel: () => void;
}) {
  const toast = useToast();
  const create = useCreate<Deal>("deals");
  const update = useUpdate<Deal>("deals");
  const startStage = initial?.stage ?? stage ?? "new";
  const form = useForm<DealValues>({
    resolver: zodResolver(dealSchema),
    defaultValues: dealDefaults(initial, startStage, organizationId, contactId),
  });
  const onError = useServerErrors(form.setError);
  useUsualProbability(form, startStage, initial);

  const submit = form.handleSubmit(async (v) => {
    const body = dealBody(v);
    try {
      const saved = initial
        ? await update.mutateAsync({ id: initial.id, body })
        : await create.mutateAsync(body);
      toast.success(initial ? "Deal saved" : "Deal added");
      onDone(saved);
    } catch (err) {
      onError(err);
    }
  });

  return (
    <FormShell onSubmit={submit}>
      <DealNameField form={form} />
      <DealWhoFields form={form} />
      <DealMoneyFields form={form} />
      <FormActions
        onCancel={onCancel}
        busy={create.isPending || update.isPending}
        submitLabel={initial ? "Save" : "Add deal"}
      />
    </FormShell>
  );
}

// ---- Activity --------------------------------------------------------------------

export function ActivityForm({
  initial,
  contactId,
  dealId,
  onDone,
  onCancel,
}: {
  initial?: Activity;
  contactId?: number;
  dealId?: number;
  onDone: () => void;
  onCancel: () => void;
}) {
  const toast = useToast();
  const health = useHealth();
  const create = useCreate<Activity>("activities");
  const update = useUpdate<Activity>("activities");
  const form = useForm<ActivityValues>({
    resolver: zodResolver(activitySchema),
    defaultValues: {
      type: initial && initial.type !== "stage_change" ? initial.type : "note",
      description: initial?.description ?? "",
      occurred_at: initial ? toLocalInput(initial.occurred_at) : "",
      follow_up_date: initial?.follow_up_date ?? "",
    },
  });
  const { register, handleSubmit, setError, setValue, getValues, formState } =
    form;
  const onError = useServerErrors(setError);
  const e = formState.errors;

  // New activities start at the current time, as the server sees it.
  useEffect(() => {
    if (!initial && health.data && !getValues("occurred_at"))
      setValue("occurred_at", toLocalInput(health.data.now));
  }, [initial, health.data, getValues, setValue]);

  const submit = handleSubmit(async (v) => {
    const body = {
      type: v.type,
      description: v.description,
      occurred_at:
        v.occurred_at.length === 16 ? `${v.occurred_at}:00` : v.occurred_at,
      follow_up_date: orNull(v.follow_up_date),
    };
    try {
      if (initial) await update.mutateAsync({ id: initial.id, body });
      else
        await create.mutateAsync({
          ...body,
          contact_id: contactId ?? null,
          deal_id: dealId ?? null,
        });
      toast.success(initial ? "Activity saved" : "Activity logged");
      onDone();
    } catch (err) {
      onError(err);
    }
  });

  return (
    <FormShell onSubmit={submit}>
      <Field label="Type" htmlFor="a-type">
        <select id="a-type" className={inputClass} {...register("type")}>
          <option value="note">Note</option>
          <option value="call">Call</option>
          <option value="email">Email</option>
        </select>
      </Field>
      <Field
        label="What happened"
        required
        htmlFor="a-desc"
        error={e.description?.message}
      >
        <textarea
          id="a-desc"
          rows={4}
          className={`${inputClass} h-auto py-2`}
          aria-invalid={!!e.description}
          {...register("description")}
        />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field
          label="When"
          required
          htmlFor="a-when"
          error={e.occurred_at?.message}
        >
          <input
            id="a-when"
            type="datetime-local"
            className={`${inputClass} font-mono`}
            {...register("occurred_at")}
          />
        </Field>
        <Field
          label="Follow-up date"
          htmlFor="a-follow"
          hint="Optional. Shows on the dashboard until done."
        >
          <input
            id="a-follow"
            type="date"
            className={`${inputClass} font-mono`}
            {...register("follow_up_date")}
          />
        </Field>
      </div>
      <FormActions
        onCancel={onCancel}
        busy={create.isPending || update.isPending}
        submitLabel={initial ? "Save" : "Log activity"}
      />
    </FormShell>
  );
}
