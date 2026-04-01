import type { ReactNode } from "react";
import {
  deleteCostTemplateAction,
  saveCostTemplateAction,
} from "@/app/admin/actions";
import {
  describeTemplateSchedule,
  listCostTemplates,
} from "@/lib/services/cost-templates";
import {
  COST_CATEGORY_VALUES,
  COST_FREQUENCY_VALUES,
  COST_TYPE_VALUES,
} from "@/lib/services/cost-validation";
import { formatDateOnly } from "@/lib/utils/date";

type SearchParamsRecord = Record<string, string | string[] | undefined>;

type CostTemplatesPageProps = {
  searchParams?: Promise<SearchParamsRecord>;
};

const COST_TEMPLATE_ERROR_MESSAGES: Record<string, string> = {
  validation: "Please check the cost template fields and try again.",
  not_found: "The selected cost template was not found.",
  in_use: "This cost template cannot be deleted because booked cost entries already reference it.",
  unknown: "The cost template could not be saved.",
};

const COST_TEMPLATE_SUCCESS_MESSAGES: Record<string, string> = {
  saved: "Cost template saved.",
  deleted: "Cost template deleted.",
};

export default async function AdminCostTemplatesPage({
  searchParams,
}: CostTemplatesPageProps) {
  const [costTemplates, resolvedSearchParams] = await Promise.all([
    listCostTemplates(),
    searchParams ?? Promise.resolve({} as SearchParamsRecord),
  ]);
  const editId = readSearchParam(resolvedSearchParams.edit);
  const editingTemplate = editId
    ? costTemplates.find((template) => template.id === editId) ?? null
    : null;
  const successCode = readSearchParam(resolvedSearchParams.success);
  const errorCode = readSearchParam(resolvedSearchParams.error);

  return (
    <main className="grid gap-6 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
      <section className="card-surface p-6">
        <p className="eyebrow">Phase 3</p>
        <h2 className="mt-2 font-serif text-3xl text-bark">
          {editId ? "Edit cost template" : "Create cost template"}
        </h2>
        <p className="mt-3 text-sm leading-6 text-bark/75">
          Templates define recurring cost suggestions only. They never book costs
          until accepted into a real cost entry.
        </p>

        {successCode ? (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {COST_TEMPLATE_SUCCESS_MESSAGES[successCode] ?? "Saved."}
          </div>
        ) : null}

        {errorCode ? (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {COST_TEMPLATE_ERROR_MESSAGES[errorCode] ?? "Something went wrong."}
          </div>
        ) : null}

        <form action={saveCostTemplateAction} className="mt-6 space-y-4">
          <input type="hidden" name="id" value={editId ?? ""} />

          <FormField label="Name">
            <input
              required
              type="text"
              name="name"
              defaultValue={editingTemplate?.name ?? ""}
              className="w-full rounded-2xl border border-soil/20 bg-white/90 px-4 py-3 outline-none transition focus:border-soil/50"
            />
          </FormField>

          <FormField label="Category">
            <select
              required
              name="category"
              defaultValue={editingTemplate?.category ?? "feed"}
              className="w-full rounded-2xl border border-soil/20 bg-white/90 px-4 py-3 outline-none transition focus:border-soil/50"
            >
              {COST_CATEGORY_VALUES.map((value) => (
                <option key={value} value={value}>
                  {formatSelectLabel(value)}
                </option>
              ))}
            </select>
          </FormField>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Cost type">
              <select
                required
                name="cost_type"
                defaultValue={editingTemplate?.cost_type ?? "direct"}
                className="w-full rounded-2xl border border-soil/20 bg-white/90 px-4 py-3 outline-none transition focus:border-soil/50"
              >
                {COST_TYPE_VALUES.map((value) => (
                  <option key={value} value={value}>
                    {formatSelectLabel(value)}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Frequency">
              <select
                required
                name="frequency"
                defaultValue={editingTemplate?.frequency ?? "monthly"}
                className="w-full rounded-2xl border border-soil/20 bg-white/90 px-4 py-3 outline-none transition focus:border-soil/50"
              >
                {COST_FREQUENCY_VALUES.map((value) => (
                  <option key={value} value={value}>
                    {formatSelectLabel(value)}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Default quantity">
              <input
                min={0}
                step="0.01"
                type="number"
                name="default_quantity"
                defaultValue={formatDecimalInput(editingTemplate?.default_quantity)}
                className="w-full rounded-2xl border border-soil/20 bg-white/90 px-4 py-3 outline-none transition focus:border-soil/50"
              />
            </FormField>

            <FormField label="Default unit">
              <input
                type="text"
                name="default_unit"
                defaultValue={editingTemplate?.default_unit ?? ""}
                className="w-full rounded-2xl border border-soil/20 bg-white/90 px-4 py-3 outline-none transition focus:border-soil/50"
              />
            </FormField>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Default unit price">
              <input
                min={0}
                step="0.01"
                type="number"
                name="default_unit_price"
                defaultValue={formatDecimalInput(editingTemplate?.default_unit_price)}
                className="w-full rounded-2xl border border-soil/20 bg-white/90 px-4 py-3 outline-none transition focus:border-soil/50"
              />
            </FormField>

            <FormField label="Default total amount">
              <input
                required
                min={0}
                step="0.01"
                type="number"
                name="default_total_amount"
                defaultValue={formatDecimalInput(
                  editingTemplate?.default_total_amount ?? null,
                )}
                className="w-full rounded-2xl border border-soil/20 bg-white/90 px-4 py-3 outline-none transition focus:border-soil/50"
              />
            </FormField>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Start date">
              <input
                required
                type="date"
                name="start_date"
                defaultValue={
                  editingTemplate ? formatDateOnly(editingTemplate.start_date) : ""
                }
                className="w-full rounded-2xl border border-soil/20 bg-white/90 px-4 py-3 outline-none transition focus:border-soil/50"
              />
            </FormField>

            <FormField label="End date">
              <input
                type="date"
                name="end_date"
                defaultValue={
                  editingTemplate?.end_date
                    ? formatDateOnly(editingTemplate.end_date)
                    : ""
                }
                className="w-full rounded-2xl border border-soil/20 bg-white/90 px-4 py-3 outline-none transition focus:border-soil/50"
              />
            </FormField>
          </div>

          <label className="flex items-center gap-3 rounded-2xl border border-soil/20 bg-white/60 px-4 py-3 text-sm text-bark">
            <input
              type="checkbox"
              name="is_active"
              defaultChecked={editingTemplate?.is_active ?? true}
            />
            <span>Template is active</span>
          </label>

          <FormField label="Note">
            <textarea
              rows={4}
              name="note"
              defaultValue={editingTemplate?.note ?? ""}
              className="w-full rounded-2xl border border-soil/20 bg-white/90 px-4 py-3 outline-none transition focus:border-soil/50"
            />
          </FormField>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              className="rounded-2xl bg-bark px-5 py-3 text-sm font-medium text-parchment transition hover:bg-bark/90"
            >
              {editId ? "Update template" : "Create template"}
            </button>

            <a
              href="/admin/cost-templates"
              className="rounded-2xl border border-soil/20 px-5 py-3 text-sm text-bark transition hover:border-soil/40"
            >
              Reset form
            </a>
          </div>
        </form>
      </section>

      <section className="card-surface overflow-hidden">
        <div className="border-b border-soil/10 px-6 py-5">
          <p className="eyebrow">Templates</p>
          <h2 className="mt-2 font-serif text-3xl text-bark">
            Saved cost templates
          </h2>
        </div>

        {costTemplates.length === 0 ? (
          <div className="px-6 py-8 text-sm text-bark/70">
            No cost templates yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-white/40 text-bark/70">
                <tr>
                  <th className="px-6 py-4 font-medium">Name</th>
                  <th className="px-6 py-4 font-medium">Type</th>
                  <th className="px-6 py-4 font-medium">Default total</th>
                  <th className="px-6 py-4 font-medium">Schedule</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {costTemplates.map((template) => (
                  <tr key={template.id} className="border-t border-soil/10">
                    <td className="px-6 py-4">
                      <div className="font-medium text-bark">{template.name}</div>
                      <div className="mt-1 text-xs text-bark/60">
                        {formatSelectLabel(template.category)}
                      </div>
                    </td>
                    <td className="px-6 py-4">{formatSelectLabel(template.cost_type)}</td>
                    <td className="px-6 py-4">
                      {template.default_total_amount.toString()}
                    </td>
                    <td className="px-6 py-4 text-bark/70">
                      {describeTemplateSchedule(template)}
                    </td>
                    <td className="px-6 py-4">
                      {template.is_active ? "Active" : "Inactive"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        <a
                          href={`/admin/cost-templates?edit=${encodeURIComponent(template.id)}`}
                          className="rounded-full border border-soil/20 px-3 py-1.5 text-xs text-bark transition hover:border-soil/40"
                        >
                          Edit
                        </a>
                        <form action={deleteCostTemplateAction}>
                          <input type="hidden" name="id" value={template.id} />
                          <button
                            type="submit"
                            className="rounded-full border border-red-200 px-3 py-1.5 text-xs text-red-700 transition hover:border-red-300"
                          >
                            Delete
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block text-sm text-bark">
      <span className="mb-1 block font-medium">{label}</span>
      {children}
    </label>
  );
}

function readSearchParam(value: string | string[] | undefined): string | null {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }

  return null;
}

function formatDecimalInput(
  value: { toString(): string } | null | undefined,
): string {
  return value ? value.toString() : "";
}

function formatSelectLabel(value: string): string {
  return value.replaceAll("_", " ");
}
