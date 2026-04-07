import { describe, expect, it } from "vitest";
import {
  NotificationCampaignNoEligibleRecipientsError,
  NotificationCampaignPersistenceError,
  NotificationCampaignReadOnlyError,
  listNotificationCampaigns,
  saveNotificationCampaignDraft,
  sendNotificationCampaign,
} from "@/lib/services/notification-campaigns";
import { FakeNotificationEmailProvider } from "@/lib/services/notification-email-provider";

describe("notification campaign drafts", () => {
  it("creates a draft and persists selected contact membership", async () => {
    const database = createNotificationCampaignTestDatabase({
      contacts: [
        buildContact({ id: "contact_1", full_name: "Ana" }),
        buildContact({ id: "contact_2", full_name: "Boris" }),
      ],
    });

    const campaign = await saveNotificationCampaignDraft(
      {
        title: "Spring update",
        channel: "email",
        audience_type: "selected_contacts",
        sender_label: "Jajce",
        subject: "Fresh eggs this week",
        body: "We have fresh eggs available this week.",
        selected_contact_ids: ["contact_1", "contact_2"],
      },
      {
        database: database as never,
      },
    );

    expect(campaign.status).toBe("draft");
    expect(campaign.selected_contact_ids).toEqual(["contact_1", "contact_2"]);
    expect(database.selections).toHaveLength(2);
  });

  it("prevents editing sent campaigns", async () => {
    const database = createNotificationCampaignTestDatabase({
      campaigns: [
        buildCampaign({
          id: "campaign_1",
          status: "sent",
        }),
      ],
    });

    await expect(
      saveNotificationCampaignDraft(
        {
          title: "Updated title",
          channel: "email",
          audience_type: "subscribers",
          sender_label: "Jajce",
          subject: "Updated",
          body: "Updated body",
        },
        {
          campaignId: "campaign_1",
          database: database as never,
        },
      ),
    ).rejects.toBeInstanceOf(NotificationCampaignReadOnlyError);
  });

  it("prevents editing drafts that already have recipient rows", async () => {
    const database = createNotificationCampaignTestDatabase({
      campaigns: [
        buildCampaign({
          id: "campaign_1",
          status: "draft",
        }),
      ],
      recipients: [
        buildRecipient({
          campaign_id: "campaign_1",
          contact_id: "contact_1",
          destination: "ana@example.com",
          delivery_status: "pending",
        }),
      ],
    });

    await expect(
      saveNotificationCampaignDraft(
        {
          title: "Updated title",
          channel: "email",
          audience_type: "subscribers",
          sender_label: "Jajce",
          subject: "Updated",
          body: "Updated body",
        },
        {
          campaignId: "campaign_1",
          database: database as never,
        },
      ),
    ).rejects.toBeInstanceOf(NotificationCampaignReadOnlyError);
  });
});

describe("notification campaign sending", () => {
  it("persists recipient snapshots and marks the campaign failed on mixed delivery outcomes", async () => {
    const database = createNotificationCampaignTestDatabase({
      contacts: [
        buildContact({
          id: "contact_1",
          full_name: "Ana",
          email: "ana@example.com",
          email_opt_in: true,
          is_subscriber: true,
        }),
        buildContact({
          id: "contact_2",
          full_name: "Boris",
          email: "boris@example.com",
          email_opt_in: true,
          is_subscriber: true,
        }),
      ],
      campaigns: [
        buildCampaign({
          id: "campaign_1",
          title: "Weekly availability",
          audience_type: "subscribers",
          status: "draft",
        }),
      ],
    });
    const emailProvider = new FakeNotificationEmailProvider(async (request) => {
      if (request.destination === "boris@example.com") {
        throw new Error("Mailbox unavailable.");
      }

      return {
        provider_message_id: `provider-${request.destination}`,
      };
    });

    const result = await sendNotificationCampaign("campaign_1", {
      database: database as never,
      emailProvider,
      now: new Date("2026-04-05T10:00:00.000Z"),
    });

    expect(result).toEqual({
      campaign_id: "campaign_1",
      status: "failed",
      recipient_count: 2,
      sent_recipient_count: 1,
      failed_recipient_count: 1,
    });
    expect(database.recipients).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          campaign_id: "campaign_1",
          contact_id: "contact_1",
          destination: "ana@example.com",
          delivery_status: "sent",
          provider_message_id: "provider-ana@example.com",
        }),
        expect.objectContaining({
          campaign_id: "campaign_1",
          contact_id: "contact_2",
          destination: "boris@example.com",
          delivery_status: "failed",
          error_message: "Mailbox unavailable.",
        }),
      ]),
    );
    expect(database.campaigns[0].status).toBe("failed");
    expect(database.campaigns[0].sent_at).toEqual(
      new Date("2026-04-05T10:00:00.000Z"),
    );

    const campaigns = await listNotificationCampaigns(database as never);
    expect(campaigns[0]).toMatchObject({
      id: "campaign_1",
      recipient_count: 2,
      sent_recipient_count: 1,
      failed_recipient_count: 1,
    });
  });

  it("fails safely when zero eligible email recipients remain at send time", async () => {
    const database = createNotificationCampaignTestDatabase({
      contacts: [
        buildContact({
          id: "contact_1",
          full_name: "Ana",
          email: "ana@example.com",
          email_opt_in: false,
        }),
      ],
      campaigns: [
        buildCampaign({
          id: "campaign_1",
          audience_type: "selected_contacts",
          status: "draft",
        }),
      ],
      selections: [
        buildSelection({
          campaign_id: "campaign_1",
          contact_id: "contact_1",
        }),
      ],
    });

    await expect(
      sendNotificationCampaign("campaign_1", {
        database: database as never,
        emailProvider: new FakeNotificationEmailProvider(),
      }),
    ).rejects.toBeInstanceOf(NotificationCampaignNoEligibleRecipientsError);
    expect(database.recipients).toHaveLength(0);
    expect(database.campaigns[0].status).toBe("draft");
  });

  it("recovers a draft with pending recipients by sending only pending rows", async () => {
    const database = createNotificationCampaignTestDatabase({
      campaigns: [
        buildCampaign({
          id: "campaign_1",
          status: "draft",
        }),
      ],
      recipients: [
        buildRecipient({
          id: "recipient_1",
          campaign_id: "campaign_1",
          contact_id: "contact_1",
          destination: "ana@example.com",
          delivery_status: "sent",
          provider_message_id: "provider-ana@example.com",
          sent_at: new Date("2026-04-05T09:00:00.000Z"),
        }),
        buildRecipient({
          id: "recipient_2",
          campaign_id: "campaign_1",
          contact_id: "contact_2",
          destination: "boris@example.com",
          delivery_status: "pending",
        }),
      ],
    });
    const emailProvider = new FakeNotificationEmailProvider(async (request) => ({
      provider_message_id: `provider-${request.destination}`,
    }));

    const result = await sendNotificationCampaign("campaign_1", {
      database: database as never,
      emailProvider,
      now: new Date("2026-04-05T10:00:00.000Z"),
    });

    expect(result).toEqual({
      campaign_id: "campaign_1",
      status: "sent",
      recipient_count: 2,
      sent_recipient_count: 2,
      failed_recipient_count: 0,
    });
    expect(database.recipients.find((row) => row.id === "recipient_1")).toMatchObject({
      delivery_status: "sent",
      provider_message_id: "provider-ana@example.com",
    });
    expect(database.recipients.find((row) => row.id === "recipient_2")).toMatchObject({
      delivery_status: "sent",
      provider_message_id: "provider-boris@example.com",
    });
    expect(database.campaigns[0].status).toBe("sent");

    const campaigns = await listNotificationCampaigns(database as never);
    expect(campaigns[0].is_recoverable_send_only).toBe(false);
  });

  it("finalizes a recoverable draft without resending when no pending rows remain", async () => {
    const database = createNotificationCampaignTestDatabase({
      campaigns: [
        buildCampaign({
          id: "campaign_1",
          status: "draft",
        }),
      ],
      recipients: [
        buildRecipient({
          campaign_id: "campaign_1",
          contact_id: "contact_1",
          destination: "ana@example.com",
          delivery_status: "sent",
          provider_message_id: "provider-ana@example.com",
          sent_at: new Date("2026-04-05T09:00:00.000Z"),
        }),
        buildRecipient({
          campaign_id: "campaign_1",
          contact_id: "contact_2",
          destination: "boris@example.com",
          delivery_status: "failed",
          error_message: "Mailbox unavailable.",
        }),
      ],
    });

    const result = await sendNotificationCampaign("campaign_1", {
      database: database as never,
      emailProvider: new FakeNotificationEmailProvider(async () => {
        throw new Error("Provider should not be called.");
      }),
      now: new Date("2026-04-05T10:00:00.000Z"),
    });

    expect(result).toEqual({
      campaign_id: "campaign_1",
      status: "failed",
      recipient_count: 2,
      sent_recipient_count: 1,
      failed_recipient_count: 1,
    });
    expect(database.campaigns[0].status).toBe("failed");
  });

  it("does not rewrite a successful provider delivery as failed when sent-state persistence breaks", async () => {
    const database = createNotificationCampaignTestDatabase({
      contacts: [
        buildContact({
          id: "contact_1",
          full_name: "Ana",
          email: "ana@example.com",
          email_opt_in: true,
          is_subscriber: true,
        }),
      ],
      campaigns: [
        buildCampaign({
          id: "campaign_1",
          audience_type: "subscribers",
          status: "draft",
        }),
      ],
      failRecipientUpdateFor: {
        campaign_id: "campaign_1",
        contact_id: "contact_1",
        delivery_status: "sent",
      },
    });

    await expect(
      sendNotificationCampaign("campaign_1", {
        database: database as never,
        emailProvider: new FakeNotificationEmailProvider(async () => ({
          provider_message_id: "provider-ana@example.com",
        })),
        now: new Date("2026-04-05T10:00:00.000Z"),
      }),
    ).rejects.toBeInstanceOf(NotificationCampaignPersistenceError);

    expect(database.recipients).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          campaign_id: "campaign_1",
          contact_id: "contact_1",
          destination: "ana@example.com",
          delivery_status: "pending",
          provider_message_id: null,
          error_message: null,
        }),
      ]),
    );
    expect(database.campaigns[0].status).toBe("draft");
    expect(database.campaigns[0].sent_at).toBeNull();
  });
});

function createNotificationCampaignTestDatabase(options?: {
  contacts?: Array<ReturnType<typeof buildContact>>;
  campaigns?: Array<ReturnType<typeof buildCampaign>>;
  selections?: Array<ReturnType<typeof buildSelection>>;
  recipients?: Array<ReturnType<typeof buildRecipient>>;
  failRecipientUpdateFor?: {
    campaign_id: string;
    contact_id: string;
    delivery_status: "pending" | "sent" | "failed";
  };
}) {
  const contacts = [...(options?.contacts ?? [])];
  const campaigns = [...(options?.campaigns ?? [])];
  const selections = [...(options?.selections ?? [])];
  const recipients = [...(options?.recipients ?? [])];
  let campaignSequence = campaigns.length;
  let selectionSequence = selections.length;
  let recipientSequence = recipients.length;

  const tx = {
    $queryRaw: async () => undefined,
    contact: {
      findMany: async ({
        where,
        select,
      }: {
        where:
          | { id: { in: string[] } }
          | { is_subscriber: boolean }
          | { is_waiting_list: boolean }
          | { is_active_customer: boolean };
        select?: { id?: boolean };
      }) => {
        let filteredContacts = contacts;

        if ("id" in where) {
          filteredContacts = filteredContacts.filter((contact) =>
            where.id.in.includes(contact.id),
          );
        } else if ("is_subscriber" in where) {
          filteredContacts = filteredContacts.filter(
            (contact) => contact.is_subscriber === where.is_subscriber,
          );
        } else if ("is_waiting_list" in where) {
          filteredContacts = filteredContacts.filter(
            (contact) => contact.is_waiting_list === where.is_waiting_list,
          );
        } else {
          filteredContacts = filteredContacts.filter(
            (contact) =>
              contact.is_active_customer === where.is_active_customer,
          );
        }

        if (
          select?.id &&
          !("full_name" in select) &&
          !("email" in select) &&
          !("email_opt_in" in select)
        ) {
          return filteredContacts.map((contact) => ({ id: contact.id }));
        }

        return filteredContacts
          .slice()
          .sort((left, right) => left.full_name.localeCompare(right.full_name))
          .map((contact) => ({
            id: contact.id,
            full_name: contact.full_name,
            email: contact.email,
            email_opt_in: contact.email_opt_in,
          }));
      },
    },
    notificationCampaign: {
      findMany: async () =>
        campaigns
          .slice()
          .sort(
            (left, right) => right.created_at.getTime() - left.created_at.getTime(),
          )
          .map((campaign) => hydrateCampaign(campaign, selections, recipients)),
      findUnique: async ({
        where,
        select,
        include,
      }: {
        where: { id: string };
        select?: {
          id?: boolean;
          status?: boolean;
          notification_recipients?: {
            select: {
              delivery_status: boolean;
            };
          };
          _count?: {
            select: {
              notification_recipients: boolean;
            };
          };
        };
        include?: {
          selected_contacts?: boolean | { select: { contact_id: boolean } };
          notification_recipients?:
            | boolean
            | {
                select: {
                  id?: boolean;
                  contact_id?: boolean;
                  destination?: boolean;
                  delivery_status?: boolean;
                };
              };
        };
      }) => {
        const campaign = campaigns.find((row) => row.id === where.id) ?? null;

        if (!campaign) {
          return null;
        }

        if (select) {
          return {
            ...(select.id ? { id: campaign.id } : {}),
            ...(select.status ? { status: campaign.status } : {}),
            ...(select.notification_recipients
              ? {
                  notification_recipients: recipients
                    .filter((recipient) => recipient.campaign_id === campaign.id)
                    .map((recipient) => ({
                      delivery_status: recipient.delivery_status,
                    })),
                }
              : {}),
            ...(select._count
              ? {
                  _count: {
                    notification_recipients: recipients.filter(
                      (recipient) => recipient.campaign_id === campaign.id,
                    ).length,
                  },
                }
              : {}),
          };
        }

        if (include) {
          return hydrateCampaign(campaign, selections, recipients);
        }

        return { ...campaign };
      },
      create: async ({
        data,
      }: {
        data: {
          title: string;
          channel: string;
          audience_type: string;
          sender_label: string;
          subject: string | null;
          body: string;
          status: "draft" | "sent" | "failed";
        };
      }) => {
        campaignSequence += 1;
        const campaign = buildCampaign({
          id: `campaign_${campaignSequence}`,
          ...data,
        });
        campaigns.push(campaign);
        return hydrateCampaign(campaign, selections, recipients);
      },
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: Partial<ReturnType<typeof buildCampaign>>;
      }) => {
        const index = campaigns.findIndex((campaign) => campaign.id === where.id);

        if (index === -1) {
          throw new Error("Missing campaign");
        }

        campaigns[index] = {
          ...campaigns[index],
          ...data,
          updated_at: data.updated_at ?? new Date("2026-04-05T10:00:00.000Z"),
        };

        return hydrateCampaign(campaigns[index], selections, recipients);
      },
    },
    notificationCampaignSelection: {
      deleteMany: async ({ where }: { where: { campaign_id: string } }) => {
        for (let index = selections.length - 1; index >= 0; index -= 1) {
          if (selections[index].campaign_id === where.campaign_id) {
            selections.splice(index, 1);
          }
        }
      },
      createMany: async ({
        data,
      }: {
        data: Array<{ campaign_id: string; contact_id: string }>;
      }) => {
        for (const row of data) {
          selectionSequence += 1;
          selections.push(
            buildSelection({
              id: `selection_${selectionSequence}`,
              campaign_id: row.campaign_id,
              contact_id: row.contact_id,
            }),
          );
        }
      },
    },
    notificationRecipient: {
      createMany: async ({
        data,
      }: {
        data: Array<{
          campaign_id: string;
          contact_id: string;
          channel: string;
          destination: string;
          delivery_status: "pending" | "sent" | "failed";
        }>;
      }) => {
        for (const row of data) {
          recipientSequence += 1;
          recipients.push(
            buildRecipient({
              id: `recipient_${recipientSequence}`,
              campaign_id: row.campaign_id,
              contact_id: row.contact_id,
              channel: row.channel,
              destination: row.destination,
              delivery_status: row.delivery_status,
            }),
          );
        }
      },
      update: async ({
        where,
        data,
      }: {
        where: {
          campaign_id_contact_id: {
            campaign_id: string;
            contact_id: string;
          };
        };
        data: Partial<ReturnType<typeof buildRecipient>>;
      }) => {
        const index = recipients.findIndex(
          (recipient) =>
            recipient.campaign_id === where.campaign_id_contact_id.campaign_id &&
            recipient.contact_id === where.campaign_id_contact_id.contact_id,
        );

        if (index === -1) {
          throw new Error("Missing recipient");
        }

        if (
          options?.failRecipientUpdateFor &&
          options.failRecipientUpdateFor.campaign_id ===
            where.campaign_id_contact_id.campaign_id &&
          options.failRecipientUpdateFor.contact_id ===
            where.campaign_id_contact_id.contact_id &&
          options.failRecipientUpdateFor.delivery_status === data.delivery_status
        ) {
          throw new Error("Recipient persistence failed");
        }

        recipients[index] = {
          ...recipients[index],
          ...data,
        };

        return recipients[index];
      },
    },
  };

  return {
    contacts,
    campaigns,
    selections,
    recipients,
    $transaction: async <T>(callback: (database: typeof tx) => Promise<T>) =>
      callback(tx),
    ...tx,
  };
}

function hydrateCampaign(
  campaign: ReturnType<typeof buildCampaign>,
  selections: Array<ReturnType<typeof buildSelection>>,
  recipients: Array<ReturnType<typeof buildRecipient>>,
) {
  return {
    ...campaign,
    selected_contacts: selections
      .filter((selection) => selection.campaign_id === campaign.id)
      .sort((left, right) => left.created_at.getTime() - right.created_at.getTime())
      .map((selection) => ({
        contact_id: selection.contact_id,
      })),
    notification_recipients: recipients
      .filter((recipient) => recipient.campaign_id === campaign.id)
      .map((recipient) => ({
        id: recipient.id,
        contact_id: recipient.contact_id,
        destination: recipient.destination,
        delivery_status: recipient.delivery_status,
      })),
  };
}

function buildContact(
  overrides?: Partial<{
    id: string;
    full_name: string;
    email: string | null;
    email_opt_in: boolean;
    is_subscriber: boolean;
    is_waiting_list: boolean;
    is_active_customer: boolean;
  }>,
) {
  return {
    id: overrides?.id ?? "contact_seed",
    full_name: overrides?.full_name ?? "Seed Contact",
    email: overrides?.email ?? null,
    email_opt_in: overrides?.email_opt_in ?? false,
    is_subscriber: overrides?.is_subscriber ?? false,
    is_waiting_list: overrides?.is_waiting_list ?? false,
    is_active_customer: overrides?.is_active_customer ?? false,
  };
}

function buildCampaign(
  overrides?: Partial<{
    id: string;
    title: string;
    channel: string;
    audience_type: string;
    sender_label: string;
    subject: string | null;
    body: string;
    status: "draft" | "sent" | "failed";
    sent_at: Date | null;
    created_at: Date;
    updated_at: Date;
  }>,
) {
  return {
    id: overrides?.id ?? "campaign_seed",
    title: overrides?.title ?? "Seed Campaign",
    channel: overrides?.channel ?? "email",
    audience_type: overrides?.audience_type ?? "subscribers",
    sender_label: overrides?.sender_label ?? "Jajce",
    subject: overrides?.subject ?? "Fresh eggs this week",
    body: overrides?.body ?? "Fresh eggs are available.",
    status: overrides?.status ?? "draft",
    sent_at: overrides?.sent_at ?? null,
    created_at: overrides?.created_at ?? new Date("2026-04-05T08:00:00.000Z"),
    updated_at: overrides?.updated_at ?? new Date("2026-04-05T08:00:00.000Z"),
  };
}

function buildSelection(
  overrides?: Partial<{
    id: string;
    campaign_id: string;
    contact_id: string;
    created_at: Date;
  }>,
) {
  return {
    id: overrides?.id ?? "selection_seed",
    campaign_id: overrides?.campaign_id ?? "campaign_seed",
    contact_id: overrides?.contact_id ?? "contact_seed",
    created_at: overrides?.created_at ?? new Date("2026-04-05T08:00:00.000Z"),
  };
}

function buildRecipient(
  overrides?: Partial<{
    id: string;
    campaign_id: string;
    contact_id: string;
    channel: string;
    destination: string;
    delivery_status: "pending" | "sent" | "failed";
    sent_at: Date | null;
    provider_message_id: string | null;
    error_message: string | null;
    created_at: Date;
  }>,
) {
  return {
    id: overrides?.id ?? "recipient_seed",
    campaign_id: overrides?.campaign_id ?? "campaign_seed",
    contact_id: overrides?.contact_id ?? "contact_seed",
    channel: overrides?.channel ?? "email",
    destination: overrides?.destination ?? "seed@example.com",
    delivery_status: overrides?.delivery_status ?? "pending",
    sent_at: overrides?.sent_at ?? null,
    provider_message_id: overrides?.provider_message_id ?? null,
    error_message: overrides?.error_message ?? null,
    created_at: overrides?.created_at ?? new Date("2026-04-05T08:00:00.000Z"),
  };
}
