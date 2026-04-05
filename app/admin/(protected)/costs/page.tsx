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
import type { AdminLanguage } from "@/lib/admin-language";
import { getAdminLanguage } from "@/lib/admin-language.server";
import {
  getAdminCopy,
  formatAdminActiveState,
  formatAdminRecurringSchedule,
  formatAdminValueLabel,
} from "@/lib/admin-localization";
import { listCostEntries } from "@/lib/services/cost-entries";
import {
  COST_CATEGORY_VALUES,
  COST_FREQUENCY_VALUES,
  COST_TYPE_VALUES,
} from "@/lib/services/cost-validation";
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

export default async function AdminCostsPage({ searchParams }: CostsPageProps) {
  const resolvedSearchParams =
    (await searchParams) ?? ({} as SearchParamsRecord);
  const language = await getAdminLanguage();
  const copy = getAdminCopy(language);
  const costEntryErrorMessages: Record<string, string> = {
    ...copy.costs.errors,
  };
  const costEntrySuccessMessages: Record<string, string> = {
    ...copy.costs.success,
  };
  const costEntryFormCopy = copy.costs.form;
  const categoryOptions = COST_CATEGORY_VALUES.map((value) => ({
    value,
    label: formatAdminValueLabel(value, language),
  }));
  const costTypeOptions = COST_TYPE_VALUES.map((value) => ({
    value,
    label: formatAdminValueLabel(value, language),
  }));
  const frequencyOptions = COST_FREQUENCY_VALUES.map((value) => ({
    value,
    label: formatAdminValueLabel(value, language),
  }));
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
          <p className="eyebrow">{copy.costs.eyebrow}</p>
          <h2 className="mt-2 font-serif text-3xl text-bark">
            {editingEntry
              ? copy.costs.editTitle
              : acceptingSuggestion
                ? copy.costs.acceptTitle
                : copy.costs.bookTitle}
          </h2>
          <p className="mt-3 text-sm leading-6 text-bark/75">
            {copy.costs.description}
          </p>

          {successCode ? (
            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {costEntrySuccessMessages[successCode] ?? copy.common.saveFallback}
            </div>
          ) : null}

          {errorCode ? (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {costEntryErrorMessages[errorCode] ?? copy.common.unknownError}
            </div>
          ) : null}

          {!editingEntry && acceptTemplateId && !acceptingSuggestion ? (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {copy.costs.suggestionNoLongerPending}
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
                {copy.costs.templateOriginLockedPrefix}{" "}
                <strong>
                  {editingEntry.cost_template?.name ?? copy.costs.unknownTemplate}
                </strong>
                . {copy.costs.templateOriginLockedSuffix}
              </div>
            ) : null}

            {acceptingSuggestion ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {copy.costs.acceptingSuggestionNote}
              </div>
            ) : null}

            <CostEntryForm
              key={formKey}
              copy={costEntryFormCopy}
              categoryOptions={categoryOptions}
              costTypeOptions={costTypeOptions}
              frequencyOptions={frequencyOptions}
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
                    ? copy.costs.update
                    : acceptingSuggestion
                      ? copy.costs.saveEditedAcceptance
                      : copy.costs.create}
                </button>
              )}

              <a
                href={`/admin/costs?suggestionDate=${encodeURIComponent(suggestionDate)}`}
                className="rounded-2xl border border-soil/20 px-5 py-3 text-sm text-bark transition hover:border-soil/40"
              >
                {copy.common.resetForm}
              </a>
            </div>
          </form>
        </section>

        <section className="card-surface p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="eyebrow">{copy.costs.suggestionsEyebrow}</p>
              <h2 className="mt-2 font-serif text-3xl text-bark">
                {copy.costs.suggestionsTitle}
              </h2>
              <p className="mt-3 text-sm leading-6 text-bark/75">
                {copy.costs.suggestionsDescription}
              </p>
            </div>

            <form className="flex flex-wrap items-end gap-3">
              <FormField label={copy.costs.suggestionDate}>
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
                {copy.costs.loadSuggestions}
              </button>
            </form>
          </div>

          {suggestions.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-soil/20 px-4 py-5 text-sm text-bark/70">
              {copy.costs.noSuggestionsMatchPrefix} {suggestionDate}.
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
                        {formatAdminValueLabel(suggestion.template.category, language)} ·{" "}
                        {formatAdminValueLabel(suggestion.template.cost_type, language)} ·{" "}
                        {suggestion.template.default_total_amount.toString()}
                      </p>
                      <p className="mt-1 text-xs text-bark/55">
                        {formatAdminRecurringSchedule(suggestion.template, language)}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {renderSuggestionActions(suggestion, suggestionDate, language)}
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
            <p className="eyebrow">{copy.costs.recurringPreviewEyebrow}</p>
            <h2 className="mt-2 font-serif text-3xl text-bark">
              {copy.costs.recurringPreviewTitle}
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-bark/75">
              {copy.costs.recurringPreviewDescription}
            </p>
          </div>
          <p className="text-sm text-bark/60">
            {copy.costs.referenceDate}: {todayDateLabel}
          </p>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <RecurringOverviewCard
            title={copy.costs.next7Days}
            occurrences={nextSevenDayOccurrences}
            language={language}
          />
          <RecurringOverviewCard
            title={copy.costs.next30Days}
            occurrences={pendingOverviewOccurrences}
            language={language}
          />
        </div>
      </section>

      <section className="card-surface overflow-hidden">
        <div className="border-b border-soil/10 px-6 py-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="eyebrow">{copy.costs.recurringTemplatesEyebrow}</p>
              <h2 className="mt-2 font-serif text-3xl text-bark">
                {copy.costs.recurringTemplatesTitle}
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-bark/70">
                {copy.costs.recurringTemplatesDescription}
              </p>
            </div>

            <Link
              href="/admin/cost-templates"
              className="rounded-2xl border border-soil/20 px-4 py-2 text-sm text-bark transition hover:border-soil/40"
            >
              {copy.costs.openMaintenanceView}
            </Link>
          </div>
        </div>

        {costTemplates.length === 0 ? (
          <div className="px-6 py-8 text-sm text-bark/70">
            {copy.costs.noRecurringTemplatesYet}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-white/40 text-bark/70">
                <tr>
                  <th className="px-6 py-4 font-medium">{copy.costs.template}</th>
                  <th className="px-6 py-4 font-medium">
                    {copy.costs.defaultTotal}
                  </th>
                  <th className="px-6 py-4 font-medium">{copy.costs.schedule}</th>
                  <th className="px-6 py-4 font-medium">
                    {copy.costs.bookedCosts}
                  </th>
                  <th className="px-6 py-4 font-medium">{copy.costs.status}</th>
                  <th className="px-6 py-4 font-medium">{copy.costs.actions}</th>
                </tr>
              </thead>
              <tbody>
                {costTemplates.map((template) => (
                  <tr key={template.id} className="border-t border-soil/10">
                    <td className="px-6 py-4">
                      <div className="font-medium text-bark">{template.name}</div>
                      <div className="mt-1 text-xs text-bark/60">
                        {formatAdminValueLabel(template.category, language)} ·{" "}
                        {formatAdminValueLabel(template.cost_type, language)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {template.default_total_amount.toString()}
                    </td>
                    <td className="px-6 py-4 text-bark/70">
                      {formatAdminRecurringSchedule(template, language)}
                    </td>
                    <td className="px-6 py-4">{template._count.cost_entries}</td>
                    <td className="px-6 py-4">
                      {formatAdminActiveState(template.is_active, language)}
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
                              ? copy.costs.markInactive
                              : copy.costs.markActive}
                          </button>
                        </form>

                        <Link
                          href={`/admin/cost-templates?edit=${encodeURIComponent(template.id)}`}
                          className="rounded-full border border-soil/20 px-3 py-1.5 text-xs text-bark transition hover:border-soil/40"
                        >
                          {copy.costs.maintenanceEdit}
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
                              {copy.costs.deleteUnused}
                            </button>
                          </form>
                        ) : (
                          <span className="rounded-full border border-soil/15 bg-white/50 px-3 py-1.5 text-xs text-bark/55">
                            {copy.costs.deleteDisabledAfterBooking}
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
          <p className="eyebrow">{copy.costs.bookedCostsEyebrow}</p>
          <h2 className="mt-2 font-serif text-3xl text-bark">
            {copy.costs.bookedCostsTitle}
          </h2>
        </div>

        {costEntries.length === 0 ? (
          <div className="px-6 py-8 text-sm text-bark/70">
            {copy.costs.noBookedCostsYet}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-white/40 text-bark/70">
                <tr>
                  <th className="px-6 py-4 font-medium">{copy.costs.date}</th>
                  <th className="px-6 py-4 font-medium">{copy.costs.category}</th>
                  <th className="px-6 py-4 font-medium">{copy.costs.type}</th>
                  <th className="px-6 py-4 font-medium">{copy.costs.total}</th>
                  <th className="px-6 py-4 font-medium">{copy.costs.source}</th>
                  <th className="px-6 py-4 font-medium">{copy.costs.actions}</th>
                </tr>
              </thead>
              <tbody>
                {costEntries.map((entry) => (
                  <tr key={entry.id} className="border-t border-soil/10">
                    <td className="px-6 py-4">{formatDateOnly(entry.date)}</td>
                    <td className="px-6 py-4">{formatAdminValueLabel(entry.category, language)}</td>
                    <td className="px-6 py-4">{formatAdminValueLabel(entry.cost_type, language)}</td>
                    <td className="px-6 py-4">{entry.total_amount.toString()}</td>
                    <td className="px-6 py-4">
                      {formatAdminValueLabel(entry.source_type, language)}
                      {entry.cost_template ? ` · ${entry.cost_template.name}` : ""}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        {entry.source_type === "manual" ? (
                          <a
                            href={`/admin/costs?edit=${encodeURIComponent(entry.id)}&suggestionDate=${encodeURIComponent(suggestionDate)}`}
                            className="rounded-full border border-soil/20 px-3 py-1.5 text-xs text-bark transition hover:border-soil/40"
                          >
                            {copy.costs.edit}
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
                            {copy.costs.deleteBookedCost}
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
  language,
}: {
  title: string;
  occurrences: RecurringCostOccurrence[];
  language: AdminLanguage;
}) {
  const copy = getAdminCopy(language);
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
          ? copy.costs.pendingOccurrenceCountSingular
          : copy.costs.pendingOccurrenceCountPlural}
      </p>
      <p className="mt-1 text-sm text-bark/70">
        {copy.costs.scheduledTotal}: {totalAmount.toFixed(2)}
      </p>

      {previewOccurrences.length === 0 ? (
        <p className="mt-4 text-sm text-bark/55">
          {copy.costs.noPendingRecurringCosts}
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
  language: AdminLanguage,
) {
  const copy = getAdminCopy(language);

  if (suggestion.status === "accepted") {
    return (
      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
        {copy.costs.accepted}
      </span>
    );
  }

  if (suggestion.status === "skipped") {
    return (
      <span className="rounded-full border border-soil/20 bg-white/60 px-3 py-1.5 text-xs font-medium text-bark/70">
        {copy.costs.skipped}
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
          {copy.costs.accept}
        </button>
      </form>

      <Link
        href={`/admin/costs?acceptTemplate=${encodeURIComponent(suggestion.template.id)}&suggestionDate=${encodeURIComponent(suggestionDate)}`}
        className="rounded-full border border-soil/20 px-3 py-2 text-xs text-bark transition hover:border-soil/40"
      >
        {copy.costs.editAndAccept}
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
          {copy.costs.skip}
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
