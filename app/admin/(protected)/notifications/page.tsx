import type { ReactNode } from "react";
import {
  saveNotificationCampaignAction,
  sendNotificationCampaignAction,
} from "@/app/admin/actions";
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
  saved: "Draft saved.",
  sent: "Campaign sent successfully. The recipient snapshot is now locked in history.",
  failed:
    "Send completed with one or more delivery failures. Review the saved recipient counts below.",
};

const NOTIFICATION_ERROR_MESSAGES: Record<string, string> = {
  validation: "Please check the notification fields and try again.",
  not_found: "The selected campaign was not found.",
  read_only: "Only draft campaigns can be edited or sent in Phase 7.",
  unsupported_channel: "Only email sending is supported in Phase 7.",
  no_eligible_recipients:
    "No eligible email recipients remain for this audience.",
  unknown: "The notification campaign could not be saved or sent.",
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
        <p className="eyebrow">Phase 7</p>
        <h2 className="mt-2 font-serif text-3xl text-bark">
          {editingCampaign ? "Edit notification draft" : "Create notification draft"}
        </h2>
        <p className="mt-3 text-sm leading-6 text-bark/75">
          Email sending is live for MVP. Viber and WhatsApp stay schema-ready
          only in this phase. Drafts become read-only once recipient rows are
          persisted so the saved send snapshot stays consistent.
        </p>

        {successCode ? (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {NOTIFICATION_SUCCESS_MESSAGES[successCode] ?? "Saved."}
          </div>
        ) : null}

        {errorCode ? (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {NOTIFICATION_ERROR_MESSAGES[errorCode] ?? "Something went wrong."}
          </div>
        ) : null}

        {recoverableCampaign ? (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            This draft already has persisted recipient rows, so it is send-only
            until finalization completes. Editing is blocked for safety because
            the recipient snapshot is already locked.
          </div>
        ) : null}

        {requestedCampaign && !editingCampaign && !recoverableCampaign ? (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Sent and failed campaigns are read-only. The empty form below is for
            creating a new draft, not editing this campaign.
          </div>
        ) : null}

        <form action={saveNotificationCampaignAction} className="mt-6 space-y-4">
          <input type="hidden" name="id" value={editingCampaign?.id ?? ""} />

          <FormField label="Title">
            <input
              required
              type="text"
              name="title"
              defaultValue={editingCampaign?.title ?? ""}
              className="w-full rounded-2xl border border-soil/20 bg-white/90 px-4 py-3 outline-none transition focus:border-soil/50"
            />
          </FormField>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Channel">
              <select
                required
                name="channel"
                defaultValue={editingCampaign?.channel ?? "email"}
                className="w-full rounded-2xl border border-soil/20 bg-white/90 px-4 py-3 outline-none transition focus:border-soil/50"
              >
                {NOTIFICATION_CHANNEL_VALUES.map((value) => (
                  <option key={value} value={value}>
                    {formatSelectLabel(value)}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Audience">
              <select
                required
                name="audience_type"
                defaultValue={editingCampaign?.audience_type ?? "subscribers"}
                className="w-full rounded-2xl border border-soil/20 bg-white/90 px-4 py-3 outline-none transition focus:border-soil/50"
              >
                {NOTIFICATION_AUDIENCE_VALUES.map((value) => (
                  <option key={value} value={value}>
                    {formatSelectLabel(value)}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Sender label">
              <input
                required
                type="text"
                name="sender_label"
                defaultValue={editingCampaign?.sender_label ?? defaultSenderLabel}
                className="w-full rounded-2xl border border-soil/20 bg-white/90 px-4 py-3 outline-none transition focus:border-soil/50"
              />
            </FormField>

            <FormField label="Subject">
              <input
                type="text"
                name="subject"
                defaultValue={editingCampaign?.subject ?? ""}
                className="w-full rounded-2xl border border-soil/20 bg-white/90 px-4 py-3 outline-none transition focus:border-soil/50"
              />
            </FormField>
          </div>

          <FormField label="Body">
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
                  Selected contacts
                </p>
                <p className="mt-1 text-sm leading-6 text-bark/70">
                  These saved selections are only used when the audience is set
                  to selected contacts.
                </p>
              </div>
              <p className="text-xs uppercase tracking-[0.2em] text-bark/50">
                {contacts.length} saved contacts
              </p>
            </div>

            {contacts.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-soil/20 px-4 py-4 text-sm text-bark/70">
                No contacts yet. Add contacts first to use selected-contacts
                campaigns.
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
                          {contact.email ?? "No email"} · {contact.phone ?? "No phone"}
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
              {editingCampaign ? "Save draft" : "Create draft"}
            </button>

            <a
              href="/admin/notifications"
              className="rounded-2xl border border-soil/20 px-5 py-3 text-sm text-bark transition hover:border-soil/40"
            >
              Reset form
            </a>
          </div>
        </form>

        {editingCampaign || recoverableCampaign ? (
          <div className="mt-6 rounded-3xl border border-soil/15 bg-white/45 p-4">
            <p className="text-sm font-medium text-bark">Send this draft</p>
            <p className="mt-2 text-sm leading-6 text-bark/70">
              {recoverableCampaign
                ? "This draft already has a persisted recipient snapshot. Resuming send will continue with those saved recipients only."
                : "Audience resolution happens again at send time against current contact data. Only contacts with a valid email and explicit email opt-in are eligible."}
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
                    ? "Resume sending saved snapshot"
                    : "Send draft"}
                </button>
              </form>
            ) : (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                This draft can be saved, but only email sending is supported in
                Phase 7.
              </div>
            )}
          </div>
        ) : null}
      </section>

      <section className="card-surface overflow-hidden">
        <div className="border-b border-soil/10 px-6 py-5">
          <p className="eyebrow">History</p>
          <h2 className="mt-2 font-serif text-3xl text-bark">
            Campaigns
          </h2>
        </div>

        {campaigns.length === 0 ? (
          <div className="px-6 py-8 text-sm text-bark/70">
            No notification campaigns yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-white/40 text-bark/70">
                <tr>
                  <th className="px-6 py-4 font-medium">Title</th>
                  <th className="px-6 py-4 font-medium">Channel</th>
                  <th className="px-6 py-4 font-medium">Audience</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Recipients</th>
                  <th className="px-6 py-4 font-medium">Updated</th>
                  <th className="px-6 py-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((campaign) => (
                  <tr key={campaign.id} className="border-t border-soil/10">
                    <td className="px-6 py-4 align-top">
                      <div className="font-medium text-bark">{campaign.title}</div>
                      {campaign.subject ? (
                        <div className="mt-1 text-xs text-bark/65">
                          Subject: {campaign.subject}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-6 py-4 align-top">
                      {formatSelectLabel(campaign.channel)}
                    </td>
                    <td className="px-6 py-4 align-top">
                      {formatSelectLabel(campaign.audience_type)}
                    </td>
                    <td className="px-6 py-4 align-top">
                      <span className={statusClassName(campaign.status)}>
                        {formatSelectLabel(campaign.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 align-top text-xs text-bark/75">
                      <div>Total: {campaign.recipient_count}</div>
                      <div>Sent: {campaign.sent_recipient_count}</div>
                      <div>Failed: {campaign.failed_recipient_count}</div>
                    </td>
                    <td className="px-6 py-4 align-top text-xs text-bark/75">
                      <div>{formatDateOnly(campaign.updated_at)}</div>
                      {campaign.sent_at ? (
                        <div className="mt-1">Sent: {formatDateOnly(campaign.sent_at)}</div>
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
                            Edit
                          </a>
                        ) : null}

                        {campaign.status === "draft" && campaign.channel === "email" ? (
                          <form action={sendNotificationCampaignAction}>
                            <input type="hidden" name="id" value={campaign.id} />
                            <button
                              type="submit"
                              className="rounded-full bg-earth px-3 py-1.5 text-xs text-parchment transition hover:bg-earth/90"
                            >
                              {campaign.is_recoverable_send_only ? "Resume" : "Send"}
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

function formatSelectLabel(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
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
