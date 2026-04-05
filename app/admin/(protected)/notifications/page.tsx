import type { ReactNode } from "react";
import {
  saveNotificationCampaignAction,
  sendNotificationCampaignAction,
} from "@/app/admin/actions";
import { adminCopy, formatAdminValueLabel } from "@/lib/admin-localization";
import { listContacts } from "@/lib/services/contacts";
import { listNotificationCampaigns } from "@/lib/services/notification-campaigns";
import { getSenderLabelDefault } from "@/lib/services/site-settings";
import {
  NOTIFICATION_AUDIENCE_VALUES,
  NOTIFICATION_CHANNEL_VALUES,
} from "@/lib/services/notification-validation";
import { formatDateOnly } from "@/lib/utils/date";

type SearchParamsRecord = Record<string, string | string[] | undefined>;

type NotificationsPageProps = {
  searchParams?: Promise<SearchParamsRecord>;
};

const NOTIFICATION_SUCCESS_MESSAGES: Record<string, string> = {
  ...adminCopy.notifications.success,
};

const NOTIFICATION_ERROR_MESSAGES: Record<string, string> = {
  ...adminCopy.notifications.errors,
};

export default async function AdminNotificationsPage({
  searchParams,
}: NotificationsPageProps) {
  const [contacts, campaigns, defaultSenderLabel, resolvedSearchParams] =
    await Promise.all([
      listContacts(),
      listNotificationCampaigns(),
      getSenderLabelDefault(),
      searchParams ?? Promise.resolve({} as SearchParamsRecord),
    ]);
  const editId = readSearchParam(resolvedSearchParams.edit);
  const requestedCampaign = editId
    ? campaigns.find((campaign) => campaign.id === editId) ?? null
    : null;
  const editingCampaign =
    requestedCampaign?.status === "draft" &&
    !requestedCampaign.is_recoverable_send_only
      ? requestedCampaign
      : null;
  const recoverableCampaign =
    requestedCampaign?.status === "draft" &&
    requestedCampaign.is_recoverable_send_only
      ? requestedCampaign
      : null;
  const successCode = readSearchParam(resolvedSearchParams.success);
  const errorCode = readSearchParam(resolvedSearchParams.error);

  return (
    <main className="grid gap-6 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
      <section className="card-surface p-6">
        <p className="eyebrow">{adminCopy.notifications.eyebrow}</p>
        <h2 className="mt-2 font-serif text-3xl text-bark">
          {editingCampaign
            ? adminCopy.notifications.editTitle
            : adminCopy.notifications.createTitle}
        </h2>
        <p className="mt-3 text-sm leading-6 text-bark/75">
          {adminCopy.notifications.description}
        </p>

        {successCode ? (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {NOTIFICATION_SUCCESS_MESSAGES[successCode] ?? adminCopy.common.saveFallback}
          </div>
        ) : null}

        {errorCode ? (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {NOTIFICATION_ERROR_MESSAGES[errorCode] ?? adminCopy.common.unknownError}
          </div>
        ) : null}

        {recoverableCampaign ? (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {adminCopy.notifications.recoverableDraftWarning}
          </div>
        ) : null}

        {requestedCampaign && !editingCampaign && !recoverableCampaign ? (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {adminCopy.notifications.readOnlyRequestedWarning}
          </div>
        ) : null}

        <form action={saveNotificationCampaignAction} className="mt-6 space-y-4">
          <input type="hidden" name="id" value={editingCampaign?.id ?? ""} />

          <FormField label={adminCopy.notifications.title}>
            <input
              required
              type="text"
              name="title"
              defaultValue={editingCampaign?.title ?? ""}
              className="w-full rounded-2xl border border-soil/20 bg-white/90 px-4 py-3 outline-none transition focus:border-soil/50"
            />
          </FormField>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField label={adminCopy.notifications.channel}>
              <select
                required
                name="channel"
                defaultValue={editingCampaign?.channel ?? "email"}
                className="w-full rounded-2xl border border-soil/20 bg-white/90 px-4 py-3 outline-none transition focus:border-soil/50"
              >
                {NOTIFICATION_CHANNEL_VALUES.map((value) => (
                  <option key={value} value={value}>
                    {formatAdminValueLabel(value)}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label={adminCopy.notifications.audience}>
              <select
                required
                name="audience_type"
                defaultValue={editingCampaign?.audience_type ?? "subscribers"}
                className="w-full rounded-2xl border border-soil/20 bg-white/90 px-4 py-3 outline-none transition focus:border-soil/50"
              >
                {NOTIFICATION_AUDIENCE_VALUES.map((value) => (
                  <option key={value} value={value}>
                    {formatAdminValueLabel(value)}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField label={adminCopy.notifications.senderLabel}>
              <input
                required
                type="text"
                name="sender_label"
                defaultValue={editingCampaign?.sender_label ?? defaultSenderLabel}
                className="w-full rounded-2xl border border-soil/20 bg-white/90 px-4 py-3 outline-none transition focus:border-soil/50"
              />
            </FormField>

            <FormField label={adminCopy.notifications.subject}>
              <input
                type="text"
                name="subject"
                defaultValue={editingCampaign?.subject ?? ""}
                className="w-full rounded-2xl border border-soil/20 bg-white/90 px-4 py-3 outline-none transition focus:border-soil/50"
              />
            </FormField>
          </div>

          <FormField label={adminCopy.notifications.body}>
            <textarea
              required
              rows={8}
              name="body"
              defaultValue={editingCampaign?.body ?? ""}
              className="w-full rounded-2xl border border-soil/20 bg-white/90 px-4 py-3 outline-none transition focus:border-soil/50"
            />
          </FormField>

          <div className="rounded-3xl border border-soil/15 bg-white/45 p-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-medium text-bark">
                  {adminCopy.notifications.selectedContactsTitle}
                </p>
                <p className="mt-1 text-sm leading-6 text-bark/70">
                  {adminCopy.notifications.selectedContactsDescription}
                </p>
              </div>
              <p className="text-xs uppercase tracking-[0.2em] text-bark/50">
                {contacts.length} {adminCopy.notifications.savedContactsSuffix}
              </p>
            </div>

            {contacts.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-soil/20 px-4 py-4 text-sm text-bark/70">
                {adminCopy.notifications.noContactsYet}
              </div>
            ) : (
              <div className="mt-4 max-h-72 space-y-3 overflow-y-auto pr-1">
                {contacts.map((contact) => {
                  const isChecked =
                    editingCampaign?.selected_contact_ids.includes(contact.id) ??
                    false;

                  return (
                    <label
                      key={contact.id}
                      className="flex items-start gap-3 rounded-2xl border border-soil/15 bg-white/70 px-4 py-3 text-sm text-bark"
                    >
                      <input
                        type="checkbox"
                        name="selected_contact_ids"
                        value={contact.id}
                        defaultChecked={isChecked}
                        className="mt-1 h-4 w-4 rounded border-soil/30 text-bark focus:ring-bark/20"
                      />
                      <span className="flex-1">
                        <span className="block font-medium">
                          {contact.full_name}
                        </span>
                        <span className="mt-1 block text-xs text-bark/65">
                          {contact.email ?? adminCopy.notifications.noEmail} ·{" "}
                          {contact.phone ?? adminCopy.notifications.noPhone}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              className="rounded-2xl bg-bark px-5 py-3 text-sm font-medium text-parchment transition hover:bg-bark/90"
            >
              {editingCampaign
                ? adminCopy.notifications.saveDraft
                : adminCopy.notifications.createDraft}
            </button>

            <a
              href="/admin/notifications"
              className="rounded-2xl border border-soil/20 px-5 py-3 text-sm text-bark transition hover:border-soil/40"
            >
              {adminCopy.common.resetForm}
            </a>
          </div>
        </form>

        {editingCampaign || recoverableCampaign ? (
          <div className="mt-6 rounded-3xl border border-soil/15 bg-white/45 p-4">
            <p className="text-sm font-medium text-bark">
              {adminCopy.notifications.sendDraftTitle}
            </p>
            <p className="mt-2 text-sm leading-6 text-bark/70">
              {recoverableCampaign
                ? adminCopy.notifications.recoverableDraftDescription
                : adminCopy.notifications.sendDraftDescription}
            </p>

            {(editingCampaign ?? recoverableCampaign)?.channel === "email" ? (
              <form action={sendNotificationCampaignAction} className="mt-4">
                <input
                  type="hidden"
                  name="id"
                  value={(editingCampaign ?? recoverableCampaign)?.id ?? ""}
                />
                <button
                  type="submit"
                  className="rounded-2xl bg-earth px-5 py-3 text-sm font-medium text-parchment transition hover:bg-earth/90"
                >
                  {recoverableCampaign
                    ? adminCopy.notifications.resumeSending
                    : adminCopy.notifications.sendDraft}
                </button>
              </form>
            ) : (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {adminCopy.notifications.emailOnlyDraftWarning}
              </div>
            )}
          </div>
        ) : null}
      </section>

      <section className="card-surface overflow-hidden">
        <div className="border-b border-soil/10 px-6 py-5">
          <p className="eyebrow">{adminCopy.notifications.historyEyebrow}</p>
          <h2 className="mt-2 font-serif text-3xl text-bark">
            {adminCopy.notifications.historyTitle}
          </h2>
        </div>

        {campaigns.length === 0 ? (
          <div className="px-6 py-8 text-sm text-bark/70">
            {adminCopy.notifications.empty}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-white/40 text-bark/70">
                <tr>
                  <th className="px-6 py-4 font-medium">{adminCopy.notifications.title}</th>
                  <th className="px-6 py-4 font-medium">{adminCopy.notifications.channel}</th>
                  <th className="px-6 py-4 font-medium">{adminCopy.notifications.audience}</th>
                  <th className="px-6 py-4 font-medium">{adminCopy.costs.status}</th>
                  <th className="px-6 py-4 font-medium">{adminCopy.notifications.recipients}</th>
                  <th className="px-6 py-4 font-medium">{adminCopy.notifications.updated}</th>
                  <th className="px-6 py-4 font-medium">{adminCopy.costs.actions}</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((campaign) => (
                  <tr key={campaign.id} className="border-t border-soil/10">
                    <td className="px-6 py-4 align-top">
                      <div className="font-medium text-bark">{campaign.title}</div>
                      {campaign.subject ? (
                        <div className="mt-1 text-xs text-bark/65">
                          {adminCopy.notifications.subject}: {campaign.subject}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-6 py-4 align-top">
                      {formatAdminValueLabel(campaign.channel)}
                    </td>
                    <td className="px-6 py-4 align-top">
                      {formatAdminValueLabel(campaign.audience_type)}
                    </td>
                    <td className="px-6 py-4 align-top">
                      <span className={statusClassName(campaign.status)}>
                        {formatAdminValueLabel(campaign.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 align-top text-xs text-bark/75">
                      <div>{adminCopy.notifications.total}: {campaign.recipient_count}</div>
                      <div>{adminCopy.notifications.sent}: {campaign.sent_recipient_count}</div>
                      <div>{adminCopy.notifications.failed}: {campaign.failed_recipient_count}</div>
                    </td>
                    <td className="px-6 py-4 align-top text-xs text-bark/75">
                      <div>{formatDateOnly(campaign.updated_at)}</div>
                      {campaign.sent_at ? (
                        <div className="mt-1">
                          {adminCopy.notifications.sentOn}: {formatDateOnly(campaign.sent_at)}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-6 py-4 align-top">
                      <div className="flex flex-wrap gap-2">
                        {campaign.status === "draft" &&
                        !campaign.is_recoverable_send_only ? (
                          <a
                            href={`/admin/notifications?edit=${encodeURIComponent(campaign.id)}`}
                            className="rounded-full border border-soil/20 px-3 py-1.5 text-xs text-bark transition hover:border-soil/40"
                          >
                            {adminCopy.notifications.edit}
                          </a>
                        ) : null}

                        {campaign.status === "draft" && campaign.channel === "email" ? (
                          <form action={sendNotificationCampaignAction}>
                            <input type="hidden" name="id" value={campaign.id} />
                            <button
                              type="submit"
                              className="rounded-full bg-earth px-3 py-1.5 text-xs text-parchment transition hover:bg-earth/90"
                            >
                              {campaign.is_recoverable_send_only
                                ? adminCopy.notifications.resume
                                : adminCopy.notifications.send}
                            </button>
                          </form>
                        ) : null}
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
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-bark">{label}</span>
      {children}
    </label>
  );
}

function readSearchParam(value: string | string[] | undefined): string | null {
  if (typeof value === "string") {
    const trimmedValue = value.trim();

    return trimmedValue.length > 0 ? trimmedValue : null;
  }

  if (Array.isArray(value)) {
    return readSearchParam(value[0]);
  }

  return null;
}

function statusClassName(status: string): string {
  if (status === "sent") {
    return "rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700";
  }

  if (status === "failed") {
    return "rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700";
  }

  return "rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800";
}
