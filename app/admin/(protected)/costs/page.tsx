import Link from "next/link";
import type { ReactNode } from "react";
import {
  acceptCostSuggestionAction,
  deleteCostEntryAction,
  deleteCostTemplateAction,
  saveCostEntryAction,
  skipCostSuggestionAction,
  toggleCostTemplateActiveAction,
} from "@/app/admin/actions";
import { CostEntryForm } from "@/app/admin/(protected)/costs/cost-entry-form";
import {
  adminCopy,
  formatAdminActiveState,
  formatAdminRecurringSchedule,
  formatAdminValueLabel,
} from "@/lib/admin-localization";
import { listCostEntries } from "@/lib/services/cost-entries";
import {
  buildCostEntryFormKey,
  type CostEntryFormMode,
} from "@/app/admin/(protected)/costs/cost-entry-form-helpers";
import {
  listCostTemplates,
  listRecurringCostOccurrencesInRange,
  listRecurringCostSuggestionsForDate,
  type RecurringCostOccurrence,
} from "@/lib/services/cost-templates";
import { addUtcDays, formatDateOnly, getDateOnlyInTimeZone, parseDateOnly } from "@/lib/utils/date";

type SearchParamsRecord = Record<string, string | string[] | undefined>;

type CostsPageProps = {
  searchParams?: Promise<SearchParamsRecord>;
};

const ADMIN_COSTS_TIME_ZONE =
  process.env.ADMIN_DASHBOARD_TIME_ZONE ?? "Europe/Amsterdam";

const COST_ENTRY_ERROR_MESSAGES: Record<string, string> = {
  ...adminCopy.costs.errors,
};

const COST_ENTRY_SUCCESS_MESSAGES: Record<string, string> = {
  ...adminCopy.costs.success,
};

export default async function AdminCostsPage({ searchParams }: CostsPageProps) {
  const resolvedSearchParams =
    (await searchParams) ?? ({} as SearchParamsRecord);
  const todayDateLabel = getDateOnlyInTimeZone(new Date(), ADMIN_COSTS_TIME_ZONE);
  const todayDate = parseDateOnly(todayDateLabel);
  const suggestionDateParam =
    readSearchParam(resolvedSearchParams.suggestionDate) ?? todayDateLabel;
  const suggestionDate = formatDateOnly(parseDateOnly(suggestionDateParam));
  const overviewEndDate = addUtcDays(todayDate, 29);
  const [costEntries, suggestions, costTemplates, pendingOverviewOccurrences] =
    await Promise.all([
      listCostEntries(),
      listRecurringCostSuggestionsForDate(suggestionDate),
      listCostTemplates(),
      listRecurringCostOccurrencesInRange({
        startDate: todayDate,
        endDate: overviewEndDate,
        statuses: ["pending"],
      }),
    ]);

  const editId = readSearchParam(resolvedSearchParams.edit);
  const acceptTemplateId = readSearchParam(resolvedSearchParams.acceptTemplate);
  const editingEntry = editId
    ? costEntries.find((entry) => entry.id === editId) ?? null
    : null;
  const acceptingSuggestion =
    !editId && acceptTemplateId
      ? suggestions.find(
          (suggestion) =>
            suggestion.template.id === acceptTemplateId &&
            suggestion.status === "pending",
        ) ?? null
      : null;
  const isTemplateOriginEditing = editingEntry?.source_type === "template";
  const successCode = readSearchParam(resolvedSearchParams.success);
  const errorCode = readSearchParam(resolvedSearchParams.error);
  const nextSevenDayOccurrences = pendingOverviewOccurrences.filter(
    (occurrence) => occurrence.date.getTime() <= addUtcDays(todayDate, 6).getTime(),
  );
  const formMode: CostEntryFormMode = editingEntry
    ? "edit"
    : acceptingSuggestion
      ? "accept"
      : "create";
  const formKey = buildCostEntryFormKey({
    mode: formMode,
    todayDate: todayDateLabel,
    editId: editingEntry?.id ?? null,
    acceptTemplateId: acceptingSuggestion?.template.id ?? null,
    acceptDate: acceptingSuggestion ? formatDateOnly(acceptingSuggestion.date) : null,
  });

  return (
    <main className="space-y-6">
      <section className="grid gap-6 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
        <section className="card-surface p-6">
          <p className="eyebrow">{adminCopy.costs.eyebrow}</p>
          <h2 className="mt-2 font-serif text-3xl text-bark">
            {editingEntry
              ? adminCopy.costs.editTitle
              : acceptingSuggestion
                ? adminCopy.costs.acceptTitle
                : adminCopy.costs.bookTitle}
          </h2>
          <p className="mt-3 text-sm leading-6 text-bark/75">
            {adminCopy.costs.description}
          </p>

          {successCode ? (
            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {COST_ENTRY_SUCCESS_MESSAGES[successCode] ?? adminCopy.common.saveFallback}
            </div>
          ) : null}

          {errorCode ? (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {COST_ENTRY_ERROR_MESSAGES[errorCode] ?? adminCopy.common.unknownError}
            </div>
          ) : null}

          {!editingEntry && acceptTemplateId && !acceptingSuggestion ? (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {adminCopy.costs.suggestionNoLongerPending}
            </div>
          ) : null}

          <form action={saveCostEntryAction} className="mt-6 space-y-4">
            <input type="hidden" name="id" value={editId ?? ""} />
            <input type="hidden" name="suggestion_date" value={suggestionDate} />
            <input
              type="hidden"
              name="accept_cost_template_id"
              value={acceptingSuggestion?.template.id ?? ""}
            />

            {isTemplateOriginEditing ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {adminCopy.costs.templateOriginLockedPrefix}{" "}
                <strong>
                  {editingEntry.cost_template?.name ?? adminCopy.costs.unknownTemplate}
                </strong>
                .
                {" "}
                {adminCopy.costs.templateOriginLockedSuffix}
              </div>
            ) : null}

            {acceptingSuggestion ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {adminCopy.costs.acceptingSuggestionNote}
              </div>
            ) : null}

            <CostEntryForm
              key={formKey}
              mode={formMode}
              todayDate={todayDateLabel}
              initialValues={buildFormInitialValues({
                todayDate: todayDateLabel,
                editingEntry,
                acceptingSuggestion,
              })}
            />

            <div className="flex flex-wrap gap-3">
              {isTemplateOriginEditing ? null : (
                <button
                  type="submit"
                  className="rounded-2xl bg-bark px-5 py-3 text-sm font-medium text-parchment transition hover:bg-bark/90"
                >
                  {editingEntry
                    ? adminCopy.costs.update
                    : acceptingSuggestion
                      ? adminCopy.costs.saveEditedAcceptance
                      : adminCopy.costs.create}
                </button>
              )}

              <a
                href={`/admin/costs?suggestionDate=${encodeURIComponent(suggestionDate)}`}
                className="rounded-2xl border border-soil/20 px-5 py-3 text-sm text-bark transition hover:border-soil/40"
              >
                {adminCopy.common.resetForm}
              </a>
            </div>
          </form>
        </section>

        <section className="card-surface p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="eyebrow">{adminCopy.costs.suggestionsEyebrow}</p>
              <h2 className="mt-2 font-serif text-3xl text-bark">
                {adminCopy.costs.suggestionsTitle}
              </h2>
              <p className="mt-3 text-sm leading-6 text-bark/75">
                {adminCopy.costs.suggestionsDescription}
              </p>
            </div>

            <form className="flex flex-wrap items-end gap-3">
              <FormField label={adminCopy.costs.suggestionDate}>
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
                {adminCopy.costs.loadSuggestions}
              </button>
            </form>
          </div>

          {suggestions.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-soil/20 px-4 py-5 text-sm text-bark/70">
              {adminCopy.costs.noSuggestionsMatchPrefix} {suggestionDate}.
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {suggestions.map((suggestion) => (
                <article
                  key={`${suggestion.template.id}:${formatDateOnly(suggestion.date)}`}
                  className="rounded-2xl border border-soil/15 bg-white/50 px-4 py-4"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <h3 className="font-medium text-bark">
                        {suggestion.template.name}
                      </h3>
                      <p className="mt-1 text-sm text-bark/70">
                        {formatAdminValueLabel(suggestion.template.category)} ·{" "}
                        {formatAdminValueLabel(suggestion.template.cost_type)} ·{" "}
                        {suggestion.template.default_total_amount.toString()}
                      </p>
                      <p className="mt-1 text-xs text-bark/55">
                        {formatAdminRecurringSchedule(suggestion.template)}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {renderSuggestionActions(suggestion, suggestionDate)}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>

      <section className="card-surface p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow">{adminCopy.costs.recurringPreviewEyebrow}</p>
            <h2 className="mt-2 font-serif text-3xl text-bark">
              {adminCopy.costs.recurringPreviewTitle}
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-bark/75">
              {adminCopy.costs.recurringPreviewDescription}
            </p>
          </div>
          <p className="text-sm text-bark/60">
            {adminCopy.costs.referenceDate}: {todayDateLabel}
          </p>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <RecurringOverviewCard
            title={adminCopy.costs.next7Days}
            occurrences={nextSevenDayOccurrences}
          />
          <RecurringOverviewCard
            title={adminCopy.costs.next30Days}
            occurrences={pendingOverviewOccurrences}
          />
        </div>
      </section>

      <section className="card-surface overflow-hidden">
        <div className="border-b border-soil/10 px-6 py-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="eyebrow">{adminCopy.costs.recurringTemplatesEyebrow}</p>
              <h2 className="mt-2 font-serif text-3xl text-bark">
                {adminCopy.costs.recurringTemplatesTitle}
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-bark/70">
                {adminCopy.costs.recurringTemplatesDescription}
              </p>
            </div>

            <Link
              href="/admin/cost-templates"
              className="rounded-2xl border border-soil/20 px-4 py-2 text-sm text-bark transition hover:border-soil/40"
            >
              {adminCopy.costs.openMaintenanceView}
            </Link>
          </div>
        </div>

        {costTemplates.length === 0 ? (
          <div className="px-6 py-8 text-sm text-bark/70">
            {adminCopy.costs.noRecurringTemplatesYet}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-white/40 text-bark/70">
                <tr>
                  <th className="px-6 py-4 font-medium">{adminCopy.costs.template}</th>
                  <th className="px-6 py-4 font-medium">
                    {adminCopy.costs.defaultTotal}
                  </th>
                  <th className="px-6 py-4 font-medium">{adminCopy.costs.schedule}</th>
                  <th className="px-6 py-4 font-medium">
                    {adminCopy.costs.bookedCosts}
                  </th>
                  <th className="px-6 py-4 font-medium">{adminCopy.costs.status}</th>
                  <th className="px-6 py-4 font-medium">{adminCopy.costs.actions}</th>
                </tr>
              </thead>
              <tbody>
                {costTemplates.map((template) => (
                  <tr key={template.id} className="border-t border-soil/10">
                    <td className="px-6 py-4">
                      <div className="font-medium text-bark">{template.name}</div>
                      <div className="mt-1 text-xs text-bark/60">
                        {formatAdminValueLabel(template.category)} ·{" "}
                        {formatAdminValueLabel(template.cost_type)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {template.default_total_amount.toString()}
                    </td>
                    <td className="px-6 py-4 text-bark/70">
                      {formatAdminRecurringSchedule(template)}
                    </td>
                    <td className="px-6 py-4">{template._count.cost_entries}</td>
                    <td className="px-6 py-4">
                      {formatAdminActiveState(template.is_active)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        <form action={toggleCostTemplateActiveAction}>
                          <input type="hidden" name="id" value={template.id} />
                          <input
                            type="hidden"
                            name="suggestion_date"
                            value={suggestionDate}
                          />
                          <input type="hidden" name="return_to" value="/admin/costs" />
                          {template.is_active ? null : (
                            <input type="hidden" name="is_active" value="on" />
                          )}
                          <button
                            type="submit"
                            className="rounded-full border border-soil/20 px-3 py-1.5 text-xs text-bark transition hover:border-soil/40"
                          >
                            {template.is_active
                              ? adminCopy.costs.markInactive
                              : adminCopy.costs.markActive}
                          </button>
                        </form>

                        <Link
                          href={`/admin/cost-templates?edit=${encodeURIComponent(template.id)}`}
                          className="rounded-full border border-soil/20 px-3 py-1.5 text-xs text-bark transition hover:border-soil/40"
                        >
                          {adminCopy.costs.maintenanceEdit}
                        </Link>

                        {template._count.cost_entries === 0 ? (
                          <form action={deleteCostTemplateAction}>
                            <input type="hidden" name="id" value={template.id} />
                            <input
                              type="hidden"
                              name="suggestion_date"
                              value={suggestionDate}
                            />
                            <input
                              type="hidden"
                              name="return_to"
                              value="/admin/costs"
                            />
                            <button
                              type="submit"
                              className="rounded-full border border-red-200 px-3 py-1.5 text-xs text-red-700 transition hover:border-red-300"
                            >
                              {adminCopy.costs.deleteUnused}
                            </button>
                          </form>
                        ) : (
                          <span className="rounded-full border border-soil/15 bg-white/50 px-3 py-1.5 text-xs text-bark/55">
                            {adminCopy.costs.deleteDisabledAfterBooking}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card-surface overflow-hidden">
        <div className="border-b border-soil/10 px-6 py-5">
          <p className="eyebrow">{adminCopy.costs.bookedCostsEyebrow}</p>
          <h2 className="mt-2 font-serif text-3xl text-bark">
            {adminCopy.costs.bookedCostsTitle}
          </h2>
        </div>

        {costEntries.length === 0 ? (
          <div className="px-6 py-8 text-sm text-bark/70">
            {adminCopy.costs.noBookedCostsYet}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-white/40 text-bark/70">
                <tr>
                  <th className="px-6 py-4 font-medium">{adminCopy.costs.date}</th>
                  <th className="px-6 py-4 font-medium">{adminCopy.costs.category}</th>
                  <th className="px-6 py-4 font-medium">{adminCopy.costs.type}</th>
                  <th className="px-6 py-4 font-medium">{adminCopy.costs.total}</th>
                  <th className="px-6 py-4 font-medium">{adminCopy.costs.source}</th>
                  <th className="px-6 py-4 font-medium">{adminCopy.costs.actions}</th>
                </tr>
              </thead>
              <tbody>
                {costEntries.map((entry) => (
                  <tr key={entry.id} className="border-t border-soil/10">
                    <td className="px-6 py-4">{formatDateOnly(entry.date)}</td>
                    <td className="px-6 py-4">{formatAdminValueLabel(entry.category)}</td>
                    <td className="px-6 py-4">{formatAdminValueLabel(entry.cost_type)}</td>
                    <td className="px-6 py-4">{entry.total_amount.toString()}</td>
                    <td className="px-6 py-4">
                      {formatAdminValueLabel(entry.source_type)}
                      {entry.cost_template ? ` · ${entry.cost_template.name}` : ""}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        {entry.source_type === "manual" ? (
                          <a
                            href={`/admin/costs?edit=${encodeURIComponent(entry.id)}&suggestionDate=${encodeURIComponent(suggestionDate)}`}
                            className="rounded-full border border-soil/20 px-3 py-1.5 text-xs text-bark transition hover:border-soil/40"
                          >
                            {adminCopy.costs.edit}
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
                            {adminCopy.costs.deleteBookedCost}
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

function RecurringOverviewCard({
  title,
  occurrences,
}: {
  title: string;
  occurrences: RecurringCostOccurrence[];
}) {
  const totalAmount = occurrences.reduce(
    (sum, occurrence) =>
      sum + decimalLikeToNumber(occurrence.template.default_total_amount),
    0,
  );
  const previewOccurrences = occurrences.slice(0, 4);

  return (
    <article className="rounded-2xl border border-soil/15 bg-white/50 px-4 py-4">
      <h3 className="font-medium text-bark">{title}</h3>
      <p className="mt-2 text-sm text-bark/70">
        {occurrences.length}{" "}
        {occurrences.length === 1
          ? adminCopy.costs.pendingOccurrenceCountSingular
          : adminCopy.costs.pendingOccurrenceCountPlural}
      </p>
      <p className="mt-1 text-sm text-bark/70">
        {adminCopy.costs.scheduledTotal}: {totalAmount.toFixed(2)}
      </p>

      {previewOccurrences.length === 0 ? (
        <p className="mt-4 text-sm text-bark/55">
          {adminCopy.costs.noPendingRecurringCosts}
        </p>
      ) : (
        <ul className="mt-4 space-y-2 text-sm text-bark/70">
          {previewOccurrences.map((occurrence) => (
            <li
              key={`${occurrence.template.id}:${formatDateOnly(occurrence.date)}`}
              className="flex items-center justify-between gap-4"
            >
              <span>
                {formatDateOnly(occurrence.date)} · {occurrence.template.name}
              </span>
              <span>{occurrence.template.default_total_amount.toString()}</span>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

function renderSuggestionActions(
  suggestion: RecurringCostOccurrence,
  suggestionDate: string,
) {
  if (suggestion.status === "accepted") {
    return (
      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
        {adminCopy.costs.accepted}
      </span>
    );
  }

  if (suggestion.status === "skipped") {
    return (
      <span className="rounded-full border border-soil/20 bg-white/60 px-3 py-1.5 text-xs font-medium text-bark/70">
        {adminCopy.costs.skipped}
      </span>
    );
  }

  return (
    <>
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
          {adminCopy.costs.accept}
        </button>
      </form>

      <Link
        href={`/admin/costs?acceptTemplate=${encodeURIComponent(suggestion.template.id)}&suggestionDate=${encodeURIComponent(suggestionDate)}`}
        className="rounded-full border border-soil/20 px-3 py-2 text-xs text-bark transition hover:border-soil/40"
      >
        {adminCopy.costs.editAndAccept}
      </Link>

      <form action={skipCostSuggestionAction}>
        <input
          type="hidden"
          name="cost_template_id"
          value={suggestion.template.id}
        />
        <input type="hidden" name="date" value={suggestionDate} />
        <button
          type="submit"
          className="rounded-full border border-soil/20 px-3 py-2 text-xs text-bark transition hover:border-soil/40"
        >
          {adminCopy.costs.skip}
        </button>
      </form>
    </>
  );
}

function buildFormInitialValues({
  todayDate,
  editingEntry,
  acceptingSuggestion,
}: {
  todayDate: string;
  editingEntry: Awaited<ReturnType<typeof listCostEntries>>[number] | null;
  acceptingSuggestion: RecurringCostOccurrence | null;
}) {
  if (editingEntry) {
    return {
      date: formatDateOnly(editingEntry.date),
      category: editingEntry.category,
      cost_type: editingEntry.cost_type,
      quantity: formatDecimalInput(editingEntry.quantity),
      unit: editingEntry.unit ?? "",
      unit_price: formatDecimalInput(editingEntry.unit_price),
      total_amount: formatDecimalInput(editingEntry.total_amount),
      note: editingEntry.note ?? "",
    };
  }

  if (acceptingSuggestion) {
    return {
      date: formatDateOnly(acceptingSuggestion.date),
      category: acceptingSuggestion.template.category,
      cost_type: acceptingSuggestion.template.cost_type,
      quantity: formatDecimalInput(acceptingSuggestion.template.default_quantity),
      unit: acceptingSuggestion.template.default_unit ?? "",
      unit_price: formatDecimalInput(
        acceptingSuggestion.template.default_unit_price,
      ),
      total_amount: formatDecimalInput(
        acceptingSuggestion.template.default_total_amount,
      ),
      note: acceptingSuggestion.template.note ?? "",
    };
  }

  return {
    date: todayDate,
  };
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

function decimalLikeToNumber(value: { toString(): string } | number): number {
  return typeof value === "number" ? value : Number.parseFloat(value.toString());
}
