import type { ReactNode } from "react";
import { deleteContactAction, saveContactAction } from "@/app/admin/actions";
import { getAdminLanguage } from "@/lib/admin-language.server";
import { getAdminCopy, formatAdminValueLabel } from "@/lib/admin-localization";
import { listContacts } from "@/lib/services/contacts";
import {
  CUSTOMER_STAGE_VALUES,
  NOTIFICATION_FREQUENCY_VALUES,
  PREFERENCE_UNIT_VALUES,
  PREFERRED_CHANNEL_VALUES,
} from "@/lib/services/contact-validation";
import { formatDateOnly } from "@/lib/utils/date";

type SearchParamsRecord = Record<string, string | string[] | undefined>;

type ContactsPageProps = {
  searchParams?: Promise<SearchParamsRecord>;
};

export default async function AdminContactsPage({
  searchParams,
}: ContactsPageProps) {
  const [contacts, resolvedSearchParams, language] = await Promise.all([
    listContacts(),
    searchParams ?? Promise.resolve({} as SearchParamsRecord),
    getAdminLanguage(),
  ]);
  const copy = getAdminCopy(language);
  const contactErrorMessages: Record<string, string> = {
    ...copy.contacts.errors,
  };
  const contactSuccessMessages: Record<string, string> = {
    ...copy.contacts.success,
  };
  const editId = readSearchParam(resolvedSearchParams.edit);
  const editingContact = editId
    ? contacts.find((contact) => contact.id === editId) ?? null
    : null;
  const successCode = readSearchParam(resolvedSearchParams.success);
  const errorCode = readSearchParam(resolvedSearchParams.error);

  return (
    <main className="grid gap-6 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
      <section className="card-surface p-6">
        <p className="eyebrow">{copy.contacts.eyebrow}</p>
        <h2 className="mt-2 font-serif text-3xl text-bark">
          {editId ? copy.contacts.editTitle : copy.contacts.createTitle}
        </h2>
        <p className="mt-3 text-sm leading-6 text-bark/75">
          {copy.contacts.description}
        </p>

        {successCode ? (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {contactSuccessMessages[successCode] ?? copy.common.saveFallback}
          </div>
        ) : null}

        {errorCode ? (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {contactErrorMessages[errorCode] ?? copy.common.unknownError}
          </div>
        ) : null}

        <form action={saveContactAction} className="mt-6 space-y-4">
          <input type="hidden" name="id" value={editId ?? ""} />

          <FormField label={copy.contacts.fullName}>
            <input
              required
              type="text"
              name="full_name"
              defaultValue={editingContact?.full_name ?? ""}
              className="w-full rounded-2xl border border-soil/20 bg-white/90 px-4 py-3 outline-none transition focus:border-soil/50"
            />
          </FormField>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField label={copy.contacts.email}>
              <input
                type="email"
                name="email"
                defaultValue={editingContact?.email ?? ""}
                className="w-full rounded-2xl border border-soil/20 bg-white/90 px-4 py-3 outline-none transition focus:border-soil/50"
              />
            </FormField>

            <FormField label={copy.contacts.phone}>
              <input
                type="text"
                name="phone"
                defaultValue={editingContact?.phone ?? ""}
                className="w-full rounded-2xl border border-soil/20 bg-white/90 px-4 py-3 outline-none transition focus:border-soil/50"
              />
            </FormField>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <CheckboxField
              name="is_subscriber"
              label={copy.contacts.subscriber}
              defaultChecked={editingContact?.is_subscriber ?? false}
            />
            <CheckboxField
              name="is_waiting_list"
              label={copy.contacts.waitingList}
              defaultChecked={editingContact?.is_waiting_list ?? false}
            />
            <CheckboxField
              name="is_active_customer"
              label={copy.contacts.activeCustomer}
              defaultChecked={editingContact?.is_active_customer ?? false}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <CheckboxField
              name="email_opt_in"
              label={copy.contacts.emailOptIn}
              defaultChecked={editingContact?.email_opt_in ?? false}
            />
            <CheckboxField
              name="phone_opt_in"
              label={copy.contacts.phoneOptIn}
              defaultChecked={editingContact?.phone_opt_in ?? false}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField label={copy.contacts.preferredChannel}>
              <select
                name="preferred_channel"
                defaultValue={editingContact?.preferred_channel ?? ""}
                className="w-full rounded-2xl border border-soil/20 bg-white/90 px-4 py-3 outline-none transition focus:border-soil/50"
              >
                <option value="">{copy.contacts.none}</option>
                {PREFERRED_CHANNEL_VALUES.map((value) => (
                  <option key={value} value={value}>
                    {formatAdminValueLabel(value, language)}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label={copy.contacts.customerStage}>
              <select
                required
                name="customer_stage"
                defaultValue={editingContact?.customer_stage ?? "lead"}
                className="w-full rounded-2xl border border-soil/20 bg-white/90 px-4 py-3 outline-none transition focus:border-soil/50"
              >
                {CUSTOMER_STAGE_VALUES.map((value) => (
                  <option key={value} value={value}>
                    {formatAdminValueLabel(value, language)}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <FormField label={copy.contacts.preferredQuantity}>
              <input
                min={1}
                step={1}
                type="number"
                name="preferred_quantity"
                defaultValue={editingContact?.preferred_quantity ?? ""}
                className="w-full rounded-2xl border border-soil/20 bg-white/90 px-4 py-3 outline-none transition focus:border-soil/50"
              />
            </FormField>

            <FormField label={copy.contacts.preferenceUnit}>
              <select
                name="preference_unit"
                defaultValue={editingContact?.preference_unit ?? ""}
                className="w-full rounded-2xl border border-soil/20 bg-white/90 px-4 py-3 outline-none transition focus:border-soil/50"
              >
                <option value="">{copy.contacts.none}</option>
                {PREFERENCE_UNIT_VALUES.map((value) => (
                  <option key={value} value={value}>
                    {formatAdminValueLabel(value, language)}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label={copy.contacts.notificationFrequency}>
              <select
                name="notification_frequency"
                defaultValue={editingContact?.notification_frequency ?? ""}
                className="w-full rounded-2xl border border-soil/20 bg-white/90 px-4 py-3 outline-none transition focus:border-soil/50"
              >
                <option value="">{copy.contacts.none}</option>
                {NOTIFICATION_FREQUENCY_VALUES.map((value) => (
                  <option key={value} value={value}>
                    {formatAdminValueLabel(value, language)}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField label={copy.contacts.joinedWaitingListAt}>
              <input
                type="date"
                name="joined_waiting_list_at"
                defaultValue={
                  editingContact?.joined_waiting_list_at
                    ? formatDateOnly(editingContact.joined_waiting_list_at)
                    : ""
                }
                className="w-full rounded-2xl border border-soil/20 bg-white/90 px-4 py-3 outline-none transition focus:border-soil/50"
              />
            </FormField>

            <FormField label={copy.contacts.becameCustomerAt}>
              <input
                type="date"
                name="became_customer_at"
                defaultValue={
                  editingContact?.became_customer_at
                    ? formatDateOnly(editingContact.became_customer_at)
                    : ""
                }
                className="w-full rounded-2xl border border-soil/20 bg-white/90 px-4 py-3 outline-none transition focus:border-soil/50"
              />
            </FormField>
          </div>

          <FormField label={copy.contacts.source}>
            <input
              type="text"
              name="source"
              defaultValue={editingContact?.source ?? ""}
              className="w-full rounded-2xl border border-soil/20 bg-white/90 px-4 py-3 outline-none transition focus:border-soil/50"
            />
          </FormField>

          <FormField label={copy.contacts.notes}>
            <textarea
              rows={4}
              name="notes"
              defaultValue={editingContact?.notes ?? ""}
              className="w-full rounded-2xl border border-soil/20 bg-white/90 px-4 py-3 outline-none transition focus:border-soil/50"
            />
          </FormField>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              className="rounded-2xl bg-bark px-5 py-3 text-sm font-medium text-parchment transition hover:bg-bark/90"
            >
              {editId ? copy.contacts.update : copy.contacts.create}
            </button>

            <a
              href="/admin/contacts"
              className="rounded-2xl border border-soil/20 px-5 py-3 text-sm text-bark transition hover:border-soil/40"
            >
              {copy.common.resetForm}
            </a>
          </div>
        </form>
      </section>

      <section className="card-surface overflow-hidden">
        <div className="border-b border-soil/10 px-6 py-5">
          <p className="eyebrow">{copy.contacts.recordsEyebrow}</p>
          <h2 className="mt-2 font-serif text-3xl text-bark">
            {copy.contacts.recordsTitle}
          </h2>
        </div>

        {contacts.length === 0 ? (
          <div className="px-6 py-8 text-sm text-bark/70">{copy.contacts.empty}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-white/40 text-bark/70">
                <tr>
                  <th className="px-6 py-4 font-medium">{copy.contacts.name}</th>
                  <th className="px-6 py-4 font-medium">{copy.contacts.email}</th>
                  <th className="px-6 py-4 font-medium">{copy.contacts.phone}</th>
                  <th className="px-6 py-4 font-medium">{copy.contacts.stage}</th>
                  <th className="px-6 py-4 font-medium">{copy.contacts.flags}</th>
                  <th className="px-6 py-4 font-medium">{copy.contacts.actions}</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((contact) => (
                  <tr key={contact.id} className="border-t border-soil/10">
                    <td className="px-6 py-4">{contact.full_name}</td>
                    <td className="px-6 py-4">{contact.email ?? copy.common.noValue}</td>
                    <td className="px-6 py-4">{contact.phone ?? copy.common.noValue}</td>
                    <td className="px-6 py-4">
                      {formatAdminValueLabel(contact.customer_stage, language)}
                    </td>
                    <td className="px-6 py-4 text-xs text-bark/75">
                      {[
                        contact.is_subscriber ? "subscriber" : null,
                        contact.is_waiting_list ? "waiting_list" : null,
                        contact.is_active_customer ? "active_customer" : null,
                      ]
                        .filter(Boolean)
                        .map((value) => formatAdminValueLabel(value as string, language))
                        .join(", ") || copy.common.noValue}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        <a
                          href={`/admin/contacts?edit=${encodeURIComponent(contact.id)}`}
                          className="rounded-full border border-soil/20 px-3 py-1.5 text-xs text-bark transition hover:border-soil/40"
                        >
                          {copy.contacts.edit}
                        </a>
                        <form action={deleteContactAction}>
                          <input type="hidden" name="id" value={contact.id} />
                          <button
                            type="submit"
                            className="rounded-full border border-red-200 px-3 py-1.5 text-xs text-red-700 transition hover:border-red-300"
                          >
                            {copy.contacts.delete}
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

function CheckboxField({
  name,
  label,
  defaultChecked,
}: {
  name: string;
  label: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex items-center gap-3 rounded-2xl border border-soil/15 bg-white/50 px-4 py-3 text-sm text-bark">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="h-4 w-4 rounded border-soil/30 text-bark focus:ring-0"
      />
      <span>{label}</span>
    </label>
  );
}

function readSearchParam(value: string | string[] | undefined): string | null {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }

  return null;
}
