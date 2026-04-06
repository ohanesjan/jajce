import type { ReactNode } from "react";
import {
  saveNotificationCampaignAction,
  sendNotificationCampaignAction,
} from "@/app/admin/actions";
import { getAdminLanguage } from "@/lib/admin-language.server";
import { getAdminCopy, formatAdminValueLabel } from "@/lib/admin-localization";
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

export default async function AdminNotificationsPage({
  searchParams,
}: NotificationsPageProps) {
  const [contacts, campaigns, defaultSenderLabel, resolvedSearchParams, language] =
    await Promise.all([
      listContacts(),
      listNotificationCampaigns(),
      getSenderLabelDefault(),
      searchParams ?? Promise.resolve({} as SearchParamsRecord),
      getAdminLanguage(),
    ]);
  const copy = getAdminCopy(language);
  const notificationSuccessMessages: Record<string, string> = {
    ...copy.notifications.success,
  };
  const notificationErrorMessages: Record<string, string> = {
    ...copy.notifications.errors,
  };
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
        <p className="eyebrow">{copy.notifications.eyebrow}</p>
        <h2 className="mt-2 font-serif text-3xl text-bark">
          {editingCampaign
            ? copy.notifications.editTitle
            : copy.notifications.createTitle}
        </h2>
        <p className="admin-section-copy">
          {copy.notifications.description}
        </p>

        {successCode ? (
          <div className="admin-alert admin-alert-success mt-5">
            {notificationSuccessMessages[successCode] ?? copy.common.saveFallback}
          </div>
        ) : null}

        {errorCode ? (
          <div className="admin-alert admin-alert-error mt-5">
            {notificationErrorMessages[errorCode] ?? copy.common.unknownError}
          </div>
        ) : null}

        {recoverableCampaign ? (
          <div className="admin-alert admin-alert-warning mt-5">
            {copy.notifications.recoverableDraftWarning}
          </div>
        ) : null}

        {requestedCampaign && !editingCampaign && !recoverableCampaign ? (
          <div className="admin-alert admin-alert-warning mt-5">
            {copy.notifications.readOnlyRequestedWarning}
          </div>
        ) : null}

        <form action={saveNotificationCampaignAction} className="mt-6 space-y-4">
          <input type="hidden" name="id" value={editingCampaign?.id ?? ""} />

          <FormField label={copy.notifications.title}>
            <input
              required
              type="text"
              name="title"
              defaultValue={editingCampaign?.title ?? ""}
              className="w-full rounded-2xl border border-soil/20 bg-white/90 px-4 py-3 outline-none transition focus:border-soil/50"
            />
          </FormField>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField label={copy.notifications.channel}>
              <select
                required
                name="channel"
                defaultValue={editingCampaign?.channel ?? "email"}
                className="w-full rounded-2xl border border-soil/20 bg-white/90 px-4 py-3 outline-none transition focus:border-soil/50"
              >
                {NOTIFICATION_CHANNEL_VALUES.map((value) => (
                  <option key={value} value={value}>
                    {formatAdminValueLabel(value, language)}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label={copy.notifications.audience}>
              <select
                required
                name="audience_type"
                defaultValue={editingCampaign?.audience_type ?? "subscribers"}
                className="w-full rounded-2xl border border-soil/20 bg-white/90 px-4 py-3 outline-none transition focus:border-soil/50"
              >
                {NOTIFICATION_AUDIENCE_VALUES.map((value) => (
                  <option key={value} value={value}>
                    {formatAdminValueLabel(value, language)}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField label={copy.notifications.senderLabel}>
              <input
                required
                type="text"
                name="sender_label"
                defaultValue={editingCampaign?.sender_label ?? defaultSenderLabel}
                className="w-full rounded-2xl border border-soil/20 bg-white/90 px-4 py-3 outline-none transition focus:border-soil/50"
              />
            </FormField>

            <FormField label={copy.notifications.subject}>
              <input
                type="text"
                name="subject"
                defaultValue={editingCampaign?.subject ?? ""}
                className="w-full rounded-2xl border border-soil/20 bg-white/90 px-4 py-3 outline-none transition focus:border-soil/50"
              />
            </FormField>
          </div>

          <FormField label={copy.notifications.body}>
            <textarea
              required
              rows={8}
              name="body"
              defaultValue={editingCampaign?.body ?? ""}
              className="w-full rounded-2xl border border-soil/20 bg-white/90 px-4 py-3 outline-none transition focus:border-soil/50"
            />
          </FormField>

          <div className="admin-subsection-shell">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-medium text-bark">
                  {copy.notifications.selectedContactsTitle}
                </p>
                <p className="admin-helper-text">
                  {copy.notifications.selectedContactsDescription}
                </p>
              </div>
              <p className="text-xs uppercase tracking-[0.2em] text-bark/50">
                {contacts.length} {copy.notifications.savedContactsSuffix}
              </p>
            </div>

            {contacts.length === 0 ? (
              <div className="admin-empty-state mt-4 px-4 py-4">
                {copy.notifications.noContactsYet}
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
                          {contact.email ?? copy.notifications.noEmail} ·{" "}
                          {contact.phone ?? copy.notifications.noPhone}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <div className="admin-action-row">
            <button
              type="submit"
              className="admin-button admin-button-primary"
            >
              {editingCampaign
                ? copy.notifications.saveDraft
                : copy.notifications.createDraft}
            </button>

            <a
              href="/admin/notifications"
              className="admin-button admin-button-secondary"
            >
              {copy.common.resetForm}
            </a>
          </div>
        </form>

        {editingCampaign || recoverableCampaign ? (
          <div className="admin-subsection-shell mt-6">
            <p className="text-sm font-medium text-bark">
              {copy.notifications.sendDraftTitle}
            </p>
            <p className="admin-helper-text mt-2">
              {recoverableCampaign
                ? copy.notifications.recoverableDraftDescription
                : copy.notifications.sendDraftDescription}
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
                  className="admin-button admin-button-primary"
                >
                  {recoverableCampaign
                    ? copy.notifications.resumeSending
                    : copy.notifications.sendDraft}
                </button>
              </form>
            ) : (
              <div className="admin-alert admin-alert-warning mt-4">
                {copy.notifications.emailOnlyDraftWarning}
              </div>
            )}
          </div>
        ) : null}
      </section>

      <section className="card-surface overflow-hidden">
        <div className="border-b border-soil/10 px-6 py-5">
          <p className="eyebrow">{copy.notifications.historyEyebrow}</p>
          <h2 className="mt-2 font-serif text-3xl text-bark">
            {copy.notifications.historyTitle}
          </h2>
        </div>

        {campaigns.length === 0 ? (
          <div className="px-6 py-8">
            <div className="admin-empty-state">
              {copy.notifications.empty}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-white/40 text-bark/70">
                <tr>
                  <th className="px-6 py-4 font-medium">{copy.notifications.title}</th>
                  <th className="px-6 py-4 font-medium">{copy.notifications.channel}</th>
                  <th className="px-6 py-4 font-medium">{copy.notifications.audience}</th>
                  <th className="px-6 py-4 font-medium">{copy.costs.status}</th>
                  <th className="px-6 py-4 font-medium">{copy.notifications.recipients}</th>
                  <th className="px-6 py-4 font-medium">{copy.notifications.updated}</th>
                  <th className="px-6 py-4 font-medium">{copy.costs.actions}</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((campaign) => (
                  <tr key={campaign.id} className="border-t border-soil/10">
                    <td className="px-6 py-4 align-top">
                      <div className="font-medium text-bark">{campaign.title}</div>
                      {campaign.subject ? (
                        <div className="mt-1 text-xs text-bark/65">
                          {copy.notifications.subject}: {campaign.subject}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-6 py-4 align-top">
                      {formatAdminValueLabel(campaign.channel, language)}
                    </td>
                    <td className="px-6 py-4 align-top">
                      {formatAdminValueLabel(campaign.audience_type, language)}
                    </td>
                    <td className="px-6 py-4 align-top">
                      <span className={statusClassName(campaign.status)}>
                        {formatAdminValueLabel(campaign.status, language)}
                      </span>
                    </td>
                    <td className="px-6 py-4 align-top text-xs text-bark/75">
                      <div>{copy.notifications.total}: {campaign.recipient_count}</div>
                      <div>{copy.notifications.sent}: {campaign.sent_recipient_count}</div>
                      <div>{copy.notifications.failed}: {campaign.failed_recipient_count}</div>
                    </td>
                    <td className="px-6 py-4 align-top text-xs text-bark/75">
                      <div>{formatDateOnly(campaign.updated_at)}</div>
                      {campaign.sent_at ? (
                        <div className="mt-1">
                          {copy.notifications.sentOn}: {formatDateOnly(campaign.sent_at)}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-6 py-4 align-top">
                      <div className="flex flex-wrap gap-2">
                        {campaign.status === "draft" &&
                        !campaign.is_recoverable_send_only ? (
                          <a
                            href={`/admin/notifications?edit=${encodeURIComponent(campaign.id)}`}
                            className="admin-button-pill"
                          >
                            {copy.notifications.edit}
                          </a>
                        ) : null}

                        {campaign.status === "draft" && campaign.channel === "email" ? (
                          <form action={sendNotificationCampaignAction}>
                            <input type="hidden" name="id" value={campaign.id} />
                            <button
                              type="submit"
                              className="admin-button-pill bg-bark text-parchment hover:border-bark/90 hover:bg-bark/90"
                            >
                              {campaign.is_recoverable_send_only
                                ? copy.notifications.resume
                                : copy.notifications.send}
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
