import Link from "next/link";
import type { ReactNode } from "react";
import {
  deleteCostTemplateAction,
  saveCostTemplateAction,
} from "@/app/admin/actions";
import { getAdminLanguage } from "@/lib/admin-language";
import {
  getAdminCopy,
  formatAdminActiveState,
  formatAdminRecurringSchedule,
  formatAdminValueLabel,
} from "@/lib/admin-localization";
import {
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

export default async function AdminCostTemplatesPage({
  searchParams,
}: CostTemplatesPageProps) {
  const [costTemplates, resolvedSearchParams, language] = await Promise.all([
    listCostTemplates(),
    searchParams ?? Promise.resolve({} as SearchParamsRecord),
    getAdminLanguage(),
  ]);
  const copy = getAdminCopy(language);
  const costTemplateErrorMessages: Record<string, string> = {
    ...copy.costTemplates.errors,
  };
  const costTemplateSuccessMessages: Record<string, string> = {
    ...copy.costTemplates.success,
  };
  const editId = readSearchParam(resolvedSearchParams.edit);
  const editingTemplate = editId
    ? costTemplates.find((template) => template.id === editId) ?? null
    : null;
  const successCode = readSearchParam(resolvedSearchParams.success);
  const errorCode = readSearchParam(resolvedSearchParams.error);

  return (
    <main className="grid gap-6 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
      <section className="card-surface p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">{copy.costTemplates.eyebrow}</p>
            <h2 className="mt-2 font-serif text-3xl text-bark">
              {editId
                ? copy.costTemplates.editTitle
                : copy.costTemplates.createTitle}
            </h2>
          </div>
          <Link
            href="/admin/costs"
            className="rounded-2xl border border-soil/20 px-4 py-2 text-sm text-bark transition hover:border-soil/40"
          >
            {copy.costTemplates.backToCosts}
          </Link>
        </div>
        <p className="mt-3 text-sm leading-6 text-bark/75">
          {copy.costTemplates.description}
        </p>

        {successCode ? (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {costTemplateSuccessMessages[successCode] ?? copy.common.saveFallback}
          </div>
        ) : null}

        {errorCode ? (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {costTemplateErrorMessages[errorCode] ?? copy.common.unknownError}
          </div>
        ) : null}

        <form action={saveCostTemplateAction} className="mt-6 space-y-4">
          <input type="hidden" name="id" value={editId ?? ""} />

          <FormField label={copy.costTemplates.name}>
            <input
              required
              type="text"
              name="name"
              defaultValue={editingTemplate?.name ?? ""}
              className="w-full rounded-2xl border border-soil/20 bg-white/90 px-4 py-3 outline-none transition focus:border-soil/50"
            />
          </FormField>

          <FormField label={copy.costTemplates.category}>
            <select
              required
              name="category"
              defaultValue={editingTemplate?.category ?? "feed"}
              className="w-full rounded-2xl border border-soil/20 bg-white/90 px-4 py-3 outline-none transition focus:border-soil/50"
            >
              {COST_CATEGORY_VALUES.map((value) => (
                <option key={value} value={value}>
                  {formatAdminValueLabel(value, language)}
                </option>
              ))}
            </select>
          </FormField>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField label={copy.costTemplates.costType}>
              <select
                required
                name="cost_type"
                defaultValue={editingTemplate?.cost_type ?? "direct"}
                className="w-full rounded-2xl border border-soil/20 bg-white/90 px-4 py-3 outline-none transition focus:border-soil/50"
              >
                {COST_TYPE_VALUES.map((value) => (
                  <option key={value} value={value}>
                    {formatAdminValueLabel(value, language)}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label={copy.costTemplates.frequency}>
              <select
                required
                name="frequency"
                defaultValue={editingTemplate?.frequency ?? "monthly"}
                className="w-full rounded-2xl border border-soil/20 bg-white/90 px-4 py-3 outline-none transition focus:border-soil/50"
              >
                {COST_FREQUENCY_VALUES.map((value) => (
                  <option key={value} value={value}>
                    {formatAdminValueLabel(value, language)}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField label={copy.costTemplates.defaultQuantity}>
              <input
                min={0}
                step="0.01"
                type="number"
                name="default_quantity"
                defaultValue={formatDecimalInput(editingTemplate?.default_quantity)}
                className="w-full rounded-2xl border border-soil/20 bg-white/90 px-4 py-3 outline-none transition focus:border-soil/50"
              />
            </FormField>

            <FormField label={copy.costTemplates.defaultUnit}>
              <input
                type="text"
                name="default_unit"
                defaultValue={editingTemplate?.default_unit ?? ""}
                className="w-full rounded-2xl border border-soil/20 bg-white/90 px-4 py-3 outline-none transition focus:border-soil/50"
              />
            </FormField>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField label={copy.costTemplates.defaultUnitPrice}>
              <input
                min={0}
                step="0.01"
                type="number"
                name="default_unit_price"
                defaultValue={formatDecimalInput(editingTemplate?.default_unit_price)}
                className="w-full rounded-2xl border border-soil/20 bg-white/90 px-4 py-3 outline-none transition focus:border-soil/50"
              />
            </FormField>

            <FormField label={copy.costTemplates.defaultTotalAmount}>
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
            <FormField label={copy.costTemplates.startDate}>
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

            <FormField label={copy.costTemplates.endDate}>
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
            <span>{copy.costTemplates.templateIsActive}</span>
          </label>

          <FormField label={copy.costTemplates.note}>
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
              {editId ? copy.costTemplates.update : copy.costTemplates.create}
            </button>

            <a
              href="/admin/cost-templates"
              className="rounded-2xl border border-soil/20 px-5 py-3 text-sm text-bark transition hover:border-soil/40"
            >
              {copy.common.resetForm}
            </a>
          </div>
        </form>
      </section>

      <section className="card-surface overflow-hidden">
        <div className="border-b border-soil/10 px-6 py-5">
          <p className="eyebrow">{copy.costTemplates.templatesEyebrow}</p>
          <h2 className="mt-2 font-serif text-3xl text-bark">
            {copy.costTemplates.templatesTitle}
          </h2>
        </div>

        {costTemplates.length === 0 ? (
          <div className="px-6 py-8 text-sm text-bark/70">
            {copy.costTemplates.empty}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-white/40 text-bark/70">
                <tr>
                  <th className="px-6 py-4 font-medium">{copy.costTemplates.name}</th>
                  <th className="px-6 py-4 font-medium">{copy.costTemplates.type}</th>
                  <th className="px-6 py-4 font-medium">
                    {copy.costTemplates.defaultTotal}
                  </th>
                  <th className="px-6 py-4 font-medium">
                    {copy.costTemplates.schedule}
                  </th>
                  <th className="px-6 py-4 font-medium">
                    {copy.costTemplates.bookedCosts}
                  </th>
                  <th className="px-6 py-4 font-medium">{copy.costTemplates.status}</th>
                  <th className="px-6 py-4 font-medium">{copy.costTemplates.actions}</th>
                </tr>
              </thead>
              <tbody>
                {costTemplates.map((template) => (
                  <tr key={template.id} className="border-t border-soil/10">
                    <td className="px-6 py-4">
                      <div className="font-medium text-bark">{template.name}</div>
                      <div className="mt-1 text-xs text-bark/60">
                        {formatAdminValueLabel(template.category, language)}
                      </div>
                    </td>
                    <td className="px-6 py-4">{formatAdminValueLabel(template.cost_type, language)}</td>
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
                        <a
                          href={`/admin/cost-templates?edit=${encodeURIComponent(template.id)}`}
                          className="rounded-full border border-soil/20 px-3 py-1.5 text-xs text-bark transition hover:border-soil/40"
                        >
                          {copy.costTemplates.edit}
                        </a>
                        <form action={deleteCostTemplateAction}>
                          <input type="hidden" name="id" value={template.id} />
                          <button
                            type="submit"
                            disabled={template._count.cost_entries > 0}
                            className="rounded-full border border-red-200 px-3 py-1.5 text-xs text-red-700 transition hover:border-red-300"
                          >
                            {template._count.cost_entries > 0
                              ? copy.costTemplates.deleteDisabledAfterBooking
                              : copy.costTemplates.deleteUnusedTemplate}
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
