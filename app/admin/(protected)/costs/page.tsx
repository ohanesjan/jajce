import type { ReactNode } from "react";
import {
  acceptCostSuggestionAction,
  deleteCostEntryAction,
  saveCostEntryAction,
} from "@/app/admin/actions";
import { listCostEntries } from "@/lib/services/cost-entries";
import { listRecurringCostSuggestionsForDate } from "@/lib/services/cost-templates";
import {
  COST_CATEGORY_VALUES,
  COST_TYPE_VALUES,
} from "@/lib/services/cost-validation";
import { formatDateOnly, getDateOnlyInTimeZone, parseDateOnly } from "@/lib/utils/date";

type SearchParamsRecord = Record<string, string | string[] | undefined>;

type CostsPageProps = {
  searchParams?: Promise<SearchParamsRecord>;
};

const ADMIN_COSTS_TIME_ZONE =
  process.env.ADMIN_DASHBOARD_TIME_ZONE ?? "Europe/Amsterdam";

const COST_ENTRY_ERROR_MESSAGES: Record<string, string> = {
  validation: "Please check the cost entry fields and try again.",
  not_found: "The selected cost entry was not found.",
  suggestion_unavailable: "That recurring suggestion is not available for the selected date.",
  duplicate_template_date:
    "That template has already been accepted into a booked cost for the selected date.",
  template_origin_locked:
    "Template-origin booked costs can only be created through suggestion acceptance and cannot be edited here.",
  unknown: "The cost entry could not be saved.",
};

const COST_ENTRY_SUCCESS_MESSAGES: Record<string, string> = {
  saved: "Cost entry saved.",
  deleted: "Cost entry deleted.",
  accepted: "Recurring suggestion accepted into booked costs.",
};

export default async function AdminCostsPage({ searchParams }: CostsPageProps) {
  const resolvedSearchParams =
    (await searchParams) ?? ({} as SearchParamsRecord);
  const suggestionDateParam =
    readSearchParam(resolvedSearchParams.suggestionDate) ??
    getDateOnlyInTimeZone(new Date(), ADMIN_COSTS_TIME_ZONE);
  const suggestionDate = formatDateOnly(parseDateOnly(suggestionDateParam));
  const [costEntries, suggestions] = await Promise.all([
    listCostEntries(),
    listRecurringCostSuggestionsForDate(suggestionDate),
  ]);
  const editId = readSearchParam(resolvedSearchParams.edit);
  const editingEntry = editId
    ? costEntries.find((entry) => entry.id === editId) ?? null
    : null;
  const isTemplateOriginEditing = editingEntry?.source_type === "template";
  const successCode = readSearchParam(resolvedSearchParams.success);
  const errorCode = readSearchParam(resolvedSearchParams.error);

  return (
    <main className="space-y-6">
      <section className="grid gap-6 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
        <section className="card-surface p-6">
          <p className="eyebrow">Phase 3</p>
          <h2 className="mt-2 font-serif text-3xl text-bark">
            {editId ? "Edit cost entry" : "Book cost entry"}
          </h2>
          <p className="mt-3 text-sm leading-6 text-bark/75">
            Booked costs live only in cost entries. Manual entries default to
            `source_type = manual`, while accepted suggestions keep
            `source_type = template`.
          </p>

          {successCode ? (
            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {COST_ENTRY_SUCCESS_MESSAGES[successCode] ?? "Saved."}
            </div>
          ) : null}

          {errorCode ? (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {COST_ENTRY_ERROR_MESSAGES[errorCode] ?? "Something went wrong."}
            </div>
          ) : null}

          <form action={saveCostEntryAction} className="mt-6 space-y-4">
            <input type="hidden" name="id" value={editId ?? ""} />
            <input type="hidden" name="suggestion_date" value={suggestionDate} />

            {isTemplateOriginEditing ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                This booked cost came from template{" "}
                <strong>{editingEntry.cost_template?.name ?? "Unknown template"}</strong>.
                Edit this type of entry by changing the template and accepting a
                fresh suggestion instead.
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Date">
                <input
                  required
                  type="date"
                  name="date"
                  defaultValue={editingEntry ? formatDateOnly(editingEntry.date) : ""}
                  className="w-full rounded-2xl border border-soil/20 bg-white/90 px-4 py-3 outline-none transition focus:border-soil/50"
                />
              </FormField>

              <FormField label="Total amount">
                <input
                  required
                  min={0}
                  step="0.01"
                  type="number"
                  name="total_amount"
                  defaultValue={formatDecimalInput(editingEntry?.total_amount)}
                  className="w-full rounded-2xl border border-soil/20 bg-white/90 px-4 py-3 outline-none transition focus:border-soil/50"
                />
              </FormField>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Category">
                <select
                  required
                  name="category"
                  defaultValue={editingEntry?.category ?? "feed"}
                  className="w-full rounded-2xl border border-soil/20 bg-white/90 px-4 py-3 outline-none transition focus:border-soil/50"
                >
                  {COST_CATEGORY_VALUES.map((value) => (
                    <option key={value} value={value}>
                      {formatSelectLabel(value)}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Cost type">
                <select
                  required
                  name="cost_type"
                  defaultValue={editingEntry?.cost_type ?? "direct"}
                  className="w-full rounded-2xl border border-soil/20 bg-white/90 px-4 py-3 outline-none transition focus:border-soil/50"
                >
                  {COST_TYPE_VALUES.map((value) => (
                    <option key={value} value={value}>
                      {formatSelectLabel(value)}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <FormField label="Quantity">
                <input
                  min={0}
                  step="0.01"
                  type="number"
                  name="quantity"
                  defaultValue={formatDecimalInput(editingEntry?.quantity)}
                  className="w-full rounded-2xl border border-soil/20 bg-white/90 px-4 py-3 outline-none transition focus:border-soil/50"
                />
              </FormField>

              <FormField label="Unit">
                <input
                  type="text"
                  name="unit"
                  defaultValue={editingEntry?.unit ?? ""}
                  className="w-full rounded-2xl border border-soil/20 bg-white/90 px-4 py-3 outline-none transition focus:border-soil/50"
                />
              </FormField>

              <FormField label="Unit price">
                <input
                  min={0}
                  step="0.01"
                  type="number"
                  name="unit_price"
                  defaultValue={formatDecimalInput(editingEntry?.unit_price)}
                  className="w-full rounded-2xl border border-soil/20 bg-white/90 px-4 py-3 outline-none transition focus:border-soil/50"
                />
              </FormField>
            </div>

            <FormField label="Note">
              <textarea
                rows={4}
                name="note"
                defaultValue={editingEntry?.note ?? ""}
                className="w-full rounded-2xl border border-soil/20 bg-white/90 px-4 py-3 outline-none transition focus:border-soil/50"
              />
            </FormField>

            <div className="flex flex-wrap gap-3">
              {isTemplateOriginEditing ? null : (
                <button
                  type="submit"
                  className="rounded-2xl bg-bark px-5 py-3 text-sm font-medium text-parchment transition hover:bg-bark/90"
                >
                  {editId ? "Update cost entry" : "Create cost entry"}
                </button>
              )}

              <a
                href={`/admin/costs?suggestionDate=${encodeURIComponent(suggestionDate)}`}
                className="rounded-2xl border border-soil/20 px-5 py-3 text-sm text-bark transition hover:border-soil/40"
              >
                Reset form
              </a>
            </div>
          </form>
        </section>

        <section className="card-surface p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="eyebrow">Suggestions</p>
              <h2 className="mt-2 font-serif text-3xl text-bark">
                Recurring suggestions
              </h2>
              <p className="mt-3 text-sm leading-6 text-bark/75">
                Active templates for the selected date can be accepted into real
                booked costs.
              </p>
            </div>

            <form className="flex flex-wrap items-end gap-3">
              <FormField label="Suggestion date">
                <input
                  required
                  type="date"
                  name="suggestionDate"
                  defaultValue={suggestionDate}
                  className="rounded-2xl border border-soil/20 bg-white/90 px-4 py-3 outline-none transition focus:border-soil/50"
                />
              </FormField>
              <button
                type="submit"
                className="rounded-2xl border border-soil/20 px-5 py-3 text-sm text-bark transition hover:border-soil/40"
              >
                Load suggestions
              </button>
            </form>
          </div>

          {suggestions.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-soil/20 px-4 py-5 text-sm text-bark/70">
              No recurring suggestions match {suggestionDate}.
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {suggestions.map((suggestion) => (
                <article
                  key={suggestion.template.id}
                  className="rounded-2xl border border-soil/15 bg-white/50 px-4 py-4"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="font-medium text-bark">
                        {suggestion.template.name}
                      </h3>
                      <p className="mt-1 text-sm text-bark/70">
                        {formatSelectLabel(suggestion.template.category)} ·{" "}
                        {formatSelectLabel(suggestion.template.cost_type)} ·{" "}
                        {suggestion.template.default_total_amount.toString()}
                      </p>
                    </div>

                    {suggestion.already_accepted ? (
                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
                        Accepted
                      </span>
                    ) : (
                      <form action={acceptCostSuggestionAction}>
                        <input
                          type="hidden"
                          name="cost_template_id"
                          value={suggestion.template.id}
                        />
                        <input type="hidden" name="date" value={suggestionDate} />
                        <button
                          type="submit"
                          className="rounded-full bg-bark px-4 py-2 text-xs font-medium text-parchment transition hover:bg-bark/90"
                        >
                          Accept into costs
                        </button>
                      </form>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>

      <section className="card-surface overflow-hidden">
        <div className="border-b border-soil/10 px-6 py-5">
          <p className="eyebrow">Booked costs</p>
          <h2 className="mt-2 font-serif text-3xl text-bark">Saved cost entries</h2>
        </div>

        {costEntries.length === 0 ? (
          <div className="px-6 py-8 text-sm text-bark/70">
            No booked costs yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-white/40 text-bark/70">
                <tr>
                  <th className="px-6 py-4 font-medium">Date</th>
                  <th className="px-6 py-4 font-medium">Category</th>
                  <th className="px-6 py-4 font-medium">Type</th>
                  <th className="px-6 py-4 font-medium">Total</th>
                  <th className="px-6 py-4 font-medium">Source</th>
                  <th className="px-6 py-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {costEntries.map((entry) => (
                  <tr key={entry.id} className="border-t border-soil/10">
                    <td className="px-6 py-4">{formatDateOnly(entry.date)}</td>
                    <td className="px-6 py-4">{formatSelectLabel(entry.category)}</td>
                    <td className="px-6 py-4">{formatSelectLabel(entry.cost_type)}</td>
                    <td className="px-6 py-4">{entry.total_amount.toString()}</td>
                    <td className="px-6 py-4">
                      {entry.source_type}
                      {entry.cost_template ? ` · ${entry.cost_template.name}` : ""}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        {entry.source_type === "manual" ? (
                          <a
                            href={`/admin/costs?edit=${encodeURIComponent(entry.id)}&suggestionDate=${encodeURIComponent(suggestionDate)}`}
                            className="rounded-full border border-soil/20 px-3 py-1.5 text-xs text-bark transition hover:border-soil/40"
                          >
                            Edit
                          </a>
                        ) : null}
                        <form action={deleteCostEntryAction}>
                          <input type="hidden" name="id" value={entry.id} />
                          <input
                            type="hidden"
                            name="suggestion_date"
                            value={suggestionDate}
                          />
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
