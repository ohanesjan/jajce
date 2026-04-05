import type { ReactNode } from "react";
import { deleteDailyLogAction, saveDailyLogAction } from "@/app/admin/actions";
import { DailyLogEggFields } from "@/app/admin/(protected)/daily-logs/daily-log-egg-fields";
import { getAdminLanguage } from "@/lib/admin-language.server";
import { getAdminCopy } from "@/lib/admin-localization";
import { listDailyLogs } from "@/lib/services/daily-logs";
import { formatDateOnly } from "@/lib/utils/date";

type SearchParamsRecord = Record<string, string | string[] | undefined>;

type DailyLogsPageProps = {
  searchParams?: Promise<SearchParamsRecord>;
};

export default async function AdminDailyLogsPage({
  searchParams,
}: DailyLogsPageProps) {
  const [dailyLogs, resolvedSearchParams, language] = await Promise.all([
    listDailyLogs(),
    searchParams ?? Promise.resolve({} as SearchParamsRecord),
    getAdminLanguage(),
  ]);
  const copy = getAdminCopy(language);
  const dailyLogErrorMessages: Record<string, string> = {
    ...copy.dailyLogs.errors,
  };
  const dailyLogSuccessMessages: Record<string, string> = {
    ...copy.dailyLogs.success,
  };
  const editId = readSearchParam(resolvedSearchParams.edit);
  const editingLog = editId
    ? dailyLogs.find((dailyLog) => dailyLog.id === editId) ?? null
    : null;
  const successCode = readSearchParam(resolvedSearchParams.success);
  const errorCode = readSearchParam(resolvedSearchParams.error);

  return (
    <main className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
      <section className="card-surface p-6">
        <p className="eyebrow">{copy.dailyLogs.eyebrow}</p>
        <h2 className="mt-2 font-serif text-3xl text-bark">
          {editId ? copy.dailyLogs.editTitle : copy.dailyLogs.createTitle}
        </h2>
        <p className="mt-3 text-sm leading-6 text-bark/75">
          {copy.dailyLogs.description}
        </p>

        {successCode ? (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {dailyLogSuccessMessages[successCode] ?? copy.common.saveFallback}
          </div>
        ) : null}

        {errorCode ? (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {dailyLogErrorMessages[errorCode] ?? copy.common.unknownError}
          </div>
        ) : null}

        <form action={saveDailyLogAction} className="mt-6 space-y-4">
          <input type="hidden" name="id" value={editId ?? ""} />

          <FormField label={copy.dailyLogs.date}>
            <input
              required
              type="date"
              name="date"
              defaultValue={editingLog ? formatDateOnly(editingLog.date) : ""}
              className="w-full rounded-2xl border border-soil/20 bg-white/90 px-4 py-3 outline-none transition focus:border-soil/50"
            />
          </FormField>

          <DailyLogEggFields
            copy={copy.dailyLogs.eggFields}
            initialValues={{
              eggs_collected_for_sale: editingLog?.eggs_collected_for_sale ?? 0,
              eggs_used_other_purpose: editingLog?.eggs_used_other_purpose ?? 0,
              eggs_broken: editingLog?.eggs_broken ?? 0,
              eggs_unusable_other: editingLog?.eggs_unusable_other ?? 0,
            }}
          />

          <FormField label={copy.dailyLogs.chickenCount}>
            <input
              required
              min={0}
              step={1}
              type="number"
              name="chicken_count"
              defaultValue={editingLog?.chicken_count ?? 0}
              className="w-full rounded-2xl border border-soil/20 bg-white/90 px-4 py-3 outline-none transition focus:border-soil/50"
            />
          </FormField>

          <FormField label={copy.dailyLogs.publicNote}>
            <textarea
              rows={3}
              name="public_note"
              defaultValue={editingLog?.public_note ?? ""}
              className="w-full rounded-2xl border border-soil/20 bg-white/90 px-4 py-3 outline-none transition focus:border-soil/50"
            />
          </FormField>

          <FormField label={copy.dailyLogs.internalNotes}>
            <textarea
              rows={4}
              name="notes"
              defaultValue={editingLog?.notes ?? ""}
              className="w-full rounded-2xl border border-soil/20 bg-white/90 px-4 py-3 outline-none transition focus:border-soil/50"
            />
          </FormField>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              className="rounded-2xl bg-bark px-5 py-3 text-sm font-medium text-parchment transition hover:bg-bark/90"
            >
              {editId ? copy.dailyLogs.update : copy.dailyLogs.create}
            </button>

            <a
              href="/admin/daily-logs"
              className="rounded-2xl border border-soil/20 px-5 py-3 text-sm text-bark transition hover:border-soil/40"
            >
              {copy.common.resetForm}
            </a>
          </div>
        </form>
      </section>

      <section className="card-surface overflow-hidden">
        <div className="border-b border-soil/10 px-6 py-5">
          <p className="eyebrow">{copy.dailyLogs.recordsEyebrow}</p>
          <h2 className="mt-2 font-serif text-3xl text-bark">
            {copy.dailyLogs.recordsTitle}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-bark/70">
            {copy.dailyLogs.recordsDescription}
          </p>
        </div>

        {dailyLogs.length === 0 ? (
          <div className="px-6 py-8 text-sm text-bark/70">
            {copy.dailyLogs.empty}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-white/40 text-bark/70">
                <tr>
                  <th className="px-6 py-4 font-medium">{copy.dailyLogs.date}</th>
                  <th className="px-6 py-4 font-medium">
                    {copy.dailyLogs.totalYield}
                  </th>
                  <th className="px-6 py-4 font-medium">
                    {copy.dailyLogs.collected}
                  </th>
                  <th className="px-6 py-4 font-medium">
                    {copy.dailyLogs.chickenCount}
                  </th>
                  <th className="px-6 py-4 font-medium">
                    {copy.dailyLogs.actions}
                  </th>
                </tr>
              </thead>
              <tbody>
                {dailyLogs.map((dailyLog) => (
                  <tr key={dailyLog.id} className="border-t border-soil/10">
                    <td className="px-6 py-4">{formatDateOnly(dailyLog.date)}</td>
                    <td className="px-6 py-4">{dailyLog.eggs_total_yield}</td>
                    <td className="px-6 py-4">
                      {dailyLog.eggs_collected_for_sale}
                    </td>
                    <td className="px-6 py-4">{dailyLog.chicken_count}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        <a
                          href={`/admin/daily-logs?edit=${encodeURIComponent(dailyLog.id)}`}
                          className="rounded-full border border-soil/20 px-3 py-1.5 text-xs text-bark transition hover:border-soil/40"
                        >
                          {copy.dailyLogs.edit}
                        </a>
                        <form action={deleteDailyLogAction}>
                          <input type="hidden" name="id" value={dailyLog.id} />
                          <button
                            type="submit"
                            className="rounded-full border border-red-200 px-3 py-1.5 text-xs text-red-700 transition hover:border-red-300"
                          >
                            {copy.dailyLogs.delete}
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
