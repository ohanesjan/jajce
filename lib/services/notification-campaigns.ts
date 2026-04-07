import {
  Prisma,
  PrismaClient,
  notification_campaign_status,
  notification_channel,
} from "@prisma/client";
import { getDb } from "@/lib/db";
import { resolveNotificationEmailAudience } from "@/lib/services/notification-audiences";
import {
  NotificationEmailProvider,
  createNotificationEmailProviderFromEnv,
} from "@/lib/services/notification-email-provider";
import {
  NotificationCampaignDraftInput,
  NotificationCampaignDraftValidatedInput,
  NotificationCampaignSendValidatedInput,
  NotificationCampaignValidationError,
  validateNotificationCampaignDraftInput,
  validateNotificationCampaignReadyToSend,
} from "@/lib/services/notification-validation";

const NOTIFICATION_CAMPAIGN_LOCK_PREFIX = "jajce_notification_campaign";

type NotificationCampaignDb = Pick<
  PrismaClient,
  | "$transaction"
  | "contact"
  | "notificationCampaign"
  | "notificationCampaignSelection"
  | "notificationRecipient"
>;

type NotificationCampaignListDb = Pick<
  PrismaClient,
  "notificationCampaign"
>;

type NotificationCampaignTransactionDb = Parameters<
  Parameters<NotificationCampaignDb["$transaction"]>[0]
>[0];

type NotificationCampaignRow = Awaited<
  ReturnType<NotificationCampaignListDb["notificationCampaign"]["findFirst"]>
>;

type NotificationRecipientOutcome = {
  contact_id: string;
  delivery_status: "sent" | "failed";
  sent_at: Date | null;
  provider_message_id: string | null;
  error_message: string | null;
};

type PreparedNotificationSend = {
  campaign_id: string;
  validated_campaign: NotificationCampaignSendValidatedInput;
  recipients: Array<{
    contact_id: string;
    destination: string;
    delivery_status: "pending" | "sent" | "failed";
  }>;
};

export class NotificationCampaignNotFoundError extends Error {}
export class NotificationCampaignReadOnlyError extends Error {}
export class NotificationCampaignNoEligibleRecipientsError extends Error {}
export class NotificationCampaignChannelNotSupportedError extends Error {}
export class NotificationCampaignPersistenceError extends Error {}

export type NotificationCampaignRecord = {
  id: string;
  title: string;
  channel: notification_channel;
  audience_type: string;
  sender_label: string;
  subject: string | null;
  body: string;
  status: notification_campaign_status;
  sent_at: Date | null;
  created_at: Date;
  updated_at: Date;
  selected_contact_ids: string[];
  recipient_count: number;
  pending_recipient_count: number;
  sent_recipient_count: number;
  failed_recipient_count: number;
  is_recoverable_send_only: boolean;
};

export type NotificationCampaignSendResult = {
  campaign_id: string;
  status: notification_campaign_status;
  recipient_count: number;
  sent_recipient_count: number;
  failed_recipient_count: number;
};

export async function listNotificationCampaigns(
  database: NotificationCampaignListDb = getDb(),
): Promise<NotificationCampaignRecord[]> {
  const campaigns = await database.notificationCampaign.findMany({
    include: {
      selected_contacts: {
        select: {
          contact_id: true,
        },
        orderBy: [{ created_at: "asc" }, { id: "asc" }],
      },
      notification_recipients: {
        select: {
          delivery_status: true,
        },
      },
    },
    orderBy: [{ created_at: "desc" }, { id: "desc" }],
  });

  return campaigns.map((campaign) => mapNotificationCampaignRecord(campaign));
}

export async function saveNotificationCampaignDraft(
  input: NotificationCampaignDraftInput,
  {
    campaignId,
    database = getDb(),
  }: {
    campaignId?: string | null;
    database?: NotificationCampaignDb;
  } = {},
): Promise<NotificationCampaignRecord> {
  const validatedInput = validateNotificationCampaignDraftInput(input);

  try {
    return await database.$transaction(async (tx) => {
      if (campaignId) {
        await assertEditableDraftCampaign(tx, campaignId);
        await assertSelectedContactsExist(tx, validatedInput);

        const campaign = await tx.notificationCampaign.update({
          where: { id: campaignId },
          data: {
            title: validatedInput.title,
            channel: validatedInput.channel,
            audience_type: validatedInput.audience_type,
            sender_label: validatedInput.sender_label,
            subject: validatedInput.subject,
            body: validatedInput.body,
          },
          include: {
            selected_contacts: {
              select: {
                contact_id: true,
              },
              orderBy: [{ created_at: "asc" }, { id: "asc" }],
            },
            notification_recipients: {
              select: {
                delivery_status: true,
              },
            },
          },
        });

        await replaceCampaignSelections(tx, {
          campaign_id: campaignId,
          audience_type: validatedInput.audience_type,
          selected_contact_ids: validatedInput.selected_contact_ids,
        });

        const refreshedCampaign = await tx.notificationCampaign.findUnique({
          where: { id: campaign.id },
          include: {
            selected_contacts: {
              select: {
                contact_id: true,
              },
              orderBy: [{ created_at: "asc" }, { id: "asc" }],
            },
            notification_recipients: {
              select: {
                delivery_status: true,
              },
            },
          },
        });

        if (!refreshedCampaign) {
          throw new NotificationCampaignNotFoundError(
            "Notification campaign not found.",
          );
        }

        return mapNotificationCampaignRecord(refreshedCampaign);
      }

      await assertSelectedContactsExist(tx, validatedInput);

      const campaign = await tx.notificationCampaign.create({
        data: {
          title: validatedInput.title,
          channel: validatedInput.channel,
          audience_type: validatedInput.audience_type,
          sender_label: validatedInput.sender_label,
          subject: validatedInput.subject,
          body: validatedInput.body,
          status: "draft",
        },
        include: {
          selected_contacts: {
            select: {
              contact_id: true,
            },
            orderBy: [{ created_at: "asc" }, { id: "asc" }],
          },
          notification_recipients: {
            select: {
              delivery_status: true,
            },
          },
        },
      });

      await replaceCampaignSelections(tx, {
        campaign_id: campaign.id,
        audience_type: validatedInput.audience_type,
        selected_contact_ids: validatedInput.selected_contact_ids,
      });

      const refreshedCampaign = await tx.notificationCampaign.findUnique({
        where: { id: campaign.id },
        include: {
          selected_contacts: {
            select: {
              contact_id: true,
            },
            orderBy: [{ created_at: "asc" }, { id: "asc" }],
          },
          notification_recipients: {
            select: {
              delivery_status: true,
            },
          },
        },
      });

      if (!refreshedCampaign) {
        throw new NotificationCampaignNotFoundError(
          "Notification campaign not found.",
        );
      }

      return mapNotificationCampaignRecord(refreshedCampaign);
    });
  } catch (error) {
    throw normalizeNotificationCampaignError(error);
  }
}

export async function sendNotificationCampaign(
  campaignId: string,
  {
    database = getDb(),
    emailProvider,
    now = new Date(),
  }: {
    database?: NotificationCampaignDb;
    emailProvider?: NotificationEmailProvider;
    now?: Date;
  } = {},
): Promise<NotificationCampaignSendResult> {
  const preparedSend = await prepareNotificationSend(
    campaignId,
    database,
  );
  if (preparedSend.recipients.every((recipient) => recipient.delivery_status !== "pending")) {
    return finalizeNotificationSend(campaignId, database, now);
  }

  let provider: NotificationEmailProvider;

  try {
    provider = emailProvider ?? createNotificationEmailProviderFromEnv();
  } catch (error) {
    await markPendingRecipientsFailed(
      campaignId,
      preparedSend.recipients,
      database,
      getSafeErrorMessage(error),
    );

    return finalizeNotificationSend(campaignId, database, now);
  }

  for (const recipient of preparedSend.recipients) {
    if (recipient.delivery_status !== "pending") {
      continue;
    }

    let result:
      | {
          provider_message_id: string | null;
        }
      | undefined;

    try {
      result = await provider.sendEmail({
        sender_label: preparedSend.validated_campaign.sender_label,
        destination: recipient.destination,
        subject: preparedSend.validated_campaign.subject,
        body: preparedSend.validated_campaign.body,
      });
    } catch (error) {
      await persistRecipientOutcome(
        campaignId,
        {
          contact_id: recipient.contact_id,
          delivery_status: "failed",
          sent_at: null,
          provider_message_id: null,
          error_message: getSafeErrorMessage(error),
        },
        database,
      );

      continue;
    }

    try {
      await persistRecipientOutcome(
        campaignId,
        {
          contact_id: recipient.contact_id,
          delivery_status: "sent",
          sent_at: now,
          provider_message_id: result.provider_message_id,
          error_message: null,
        },
        database,
      );
    } catch (error) {
      throw new NotificationCampaignPersistenceError(
        "Notification delivery succeeded but the send state could not be recorded safely.",
      );
    }
  }

  return finalizeNotificationSend(campaignId, database, now);
}

async function prepareNotificationSend(
  campaignId: string,
  database: NotificationCampaignDb,
): Promise<PreparedNotificationSend> {
  try {
    return await database.$transaction(async (tx) => {
      await acquireNotificationCampaignLock(tx, campaignId);

      const campaign = await tx.notificationCampaign.findUnique({
        where: { id: campaignId },
        include: {
          selected_contacts: {
            select: {
              contact_id: true,
            },
            orderBy: [{ created_at: "asc" }, { id: "asc" }],
          },
          notification_recipients: {
            select: {
              id: true,
              contact_id: true,
              destination: true,
              delivery_status: true,
            },
          },
        },
      });

      if (!campaign) {
        throw new NotificationCampaignNotFoundError(
          "Notification campaign not found.",
        );
      }

      if (campaign.status !== "draft") {
        throw new NotificationCampaignReadOnlyError(
          "Only editable draft campaigns can be changed or sent.",
        );
      }

      const validatedDraft = validateNotificationCampaignDraftInput({
        title: campaign.title,
        channel: campaign.channel,
        audience_type: campaign.audience_type,
        sender_label: campaign.sender_label,
        subject: campaign.subject,
        body: campaign.body,
        selected_contact_ids: campaign.selected_contacts.map(
          (selection) => selection.contact_id,
        ),
      });
      const validatedSend = validateNotificationCampaignReadyToSend(
        validatedDraft,
      );
      if (campaign.notification_recipients.length > 0) {
        return {
          campaign_id: campaign.id,
          validated_campaign: validatedSend,
          recipients: campaign.notification_recipients.map((recipient) => ({
            contact_id: recipient.contact_id,
            destination: recipient.destination,
            delivery_status: recipient.delivery_status,
          })),
        };
      }

      const recipients = await resolveRecipientsForSend(tx, validatedSend);

      if (recipients.length === 0) {
        throw new NotificationCampaignNoEligibleRecipientsError(
          "No eligible email recipients remain for this campaign.",
        );
      }

      await tx.notificationRecipient.createMany({
        data: recipients.map((recipient) => ({
          campaign_id: campaign.id,
          contact_id: recipient.contact_id,
          channel: "email",
          destination: recipient.destination,
          delivery_status: "pending",
        })),
      });

      return {
        campaign_id: campaign.id,
        validated_campaign: validatedSend,
        recipients: recipients.map((recipient) => ({
          contact_id: recipient.contact_id,
          destination: recipient.destination,
          delivery_status: "pending",
        })),
      };
    });
  } catch (error) {
    throw normalizeNotificationCampaignError(error);
  }
}

async function finalizeNotificationSend(
  campaignId: string,
  database: NotificationCampaignDb,
  now: Date,
): Promise<NotificationCampaignSendResult> {
  return database.$transaction(async (tx) => {
    await acquireNotificationCampaignLock(tx, campaignId);
    const campaign = await tx.notificationCampaign.findUnique({
      where: { id: campaignId },
      select: {
        id: true,
        status: true,
        notification_recipients: {
          select: {
            delivery_status: true,
          },
        },
      },
    });

    if (!campaign) {
      throw new NotificationCampaignNotFoundError(
        "Notification campaign not found.",
      );
    }

    const pendingRecipientCount = campaign.notification_recipients.filter(
      (recipient) => recipient.delivery_status === "pending",
    ).length;
    const failedRecipientCount = campaign.notification_recipients.filter(
      (recipient) => recipient.delivery_status === "failed",
    ).length;
    const sentRecipientCount = campaign.notification_recipients.filter(
      (recipient) => recipient.delivery_status === "sent",
    ).length;

    if (pendingRecipientCount === 0) {
      const status = failedRecipientCount === 0 ? "sent" : "failed";

      await tx.notificationCampaign.update({
        where: { id: campaignId },
        data: {
          status,
          sent_at: now,
        },
      });
    }

    return {
      campaign_id: campaignId,
      status:
        pendingRecipientCount === 0
          ? failedRecipientCount === 0
            ? "sent"
            : "failed"
          : campaign.status,
      recipient_count: campaign.notification_recipients.length,
      sent_recipient_count: sentRecipientCount,
      failed_recipient_count: failedRecipientCount,
    };
  });
}

async function resolveRecipientsForSend(
  database: Pick<NotificationCampaignTransactionDb, "contact">,
  validatedCampaign: NotificationCampaignSendValidatedInput,
) {
  if (validatedCampaign.channel !== "email") {
    throw new NotificationCampaignChannelNotSupportedError(
      "Only email sending is supported in Phase 7.",
    );
  }

  return resolveNotificationEmailAudience(
    {
      audience_type: validatedCampaign.audience_type,
      selected_contact_ids: validatedCampaign.selected_contact_ids,
    },
    database,
  );
}

async function assertEditableDraftCampaign(
  database: Pick<
    NotificationCampaignTransactionDb,
    "notificationCampaign"
  >,
  campaignId: string,
): Promise<void> {
  const campaign = await database.notificationCampaign.findUnique({
    where: { id: campaignId },
    select: {
      id: true,
      status: true,
      _count: {
        select: {
          notification_recipients: true,
        },
      },
    },
  });

  if (!campaign) {
    throw new NotificationCampaignNotFoundError(
      "Notification campaign not found.",
    );
  }

  if (campaign.status !== "draft" || campaign._count.notification_recipients > 0) {
    throw new NotificationCampaignReadOnlyError(
      "Only editable draft campaigns can be changed or sent.",
    );
  }
}

async function assertSelectedContactsExist(
  database: Pick<
    NotificationCampaignTransactionDb,
    "contact"
  >,
  validatedInput: NotificationCampaignDraftValidatedInput,
): Promise<void> {
  if (
    validatedInput.audience_type !== "selected_contacts" ||
    validatedInput.selected_contact_ids.length === 0
  ) {
    return;
  }

  const matchingContacts = await database.contact.findMany({
    where: {
      id: {
        in: validatedInput.selected_contact_ids,
      },
    },
    select: {
      id: true,
    },
  });

  if (matchingContacts.length !== validatedInput.selected_contact_ids.length) {
    throw new NotificationCampaignValidationError(
      "Selected contacts contain one or more invalid contacts.",
    );
  }
}

async function replaceCampaignSelections(
  database: Pick<
    NotificationCampaignTransactionDb,
    "notificationCampaignSelection"
  >,
  {
    campaign_id,
    audience_type,
    selected_contact_ids,
  }: {
    campaign_id: string;
    audience_type: string;
    selected_contact_ids: string[];
  },
): Promise<void> {
  await database.notificationCampaignSelection.deleteMany({
    where: { campaign_id },
  });

  if (
    audience_type !== "selected_contacts" ||
    selected_contact_ids.length === 0
  ) {
    return;
  }

  await database.notificationCampaignSelection.createMany({
    data: selected_contact_ids.map((contact_id) => ({
      campaign_id,
      contact_id,
    })),
  });
}

async function acquireNotificationCampaignLock(
  database: Pick<NotificationCampaignTransactionDb, "$queryRaw">,
  campaignId: string,
): Promise<void> {
  await database.$queryRaw(
    Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${`${NOTIFICATION_CAMPAIGN_LOCK_PREFIX}:${campaignId}`}));`,
  );
}

async function assertExistingCampaign(
  database: Pick<NotificationCampaignTransactionDb, "notificationCampaign">,
  campaignId: string,
): Promise<void> {
  const campaign = await database.notificationCampaign.findUnique({
    where: { id: campaignId },
    select: { id: true },
  });

  if (!campaign) {
    throw new NotificationCampaignNotFoundError(
      "Notification campaign not found.",
    );
  }
}

function mapNotificationCampaignRecord(
  campaign: NonNullable<NotificationCampaignRow> & {
    selected_contacts: Array<{ contact_id: string }>;
    notification_recipients: Array<{
      delivery_status: "pending" | "sent" | "failed";
    }>;
  },
): NotificationCampaignRecord {
  const pending_recipient_count = campaign.notification_recipients.filter(
    (recipient) => recipient.delivery_status === "pending",
  ).length;
  const sent_recipient_count = campaign.notification_recipients.filter(
    (recipient) => recipient.delivery_status === "sent",
  ).length;
  const failed_recipient_count = campaign.notification_recipients.filter(
    (recipient) => recipient.delivery_status === "failed",
  ).length;

  return {
    id: campaign.id,
    title: campaign.title,
    channel: campaign.channel,
    audience_type: campaign.audience_type,
    sender_label: campaign.sender_label,
    subject: campaign.subject,
    body: campaign.body,
    status: campaign.status,
    sent_at: campaign.sent_at,
    created_at: campaign.created_at,
    updated_at: campaign.updated_at,
    selected_contact_ids: campaign.selected_contacts.map(
      (selection) => selection.contact_id,
    ),
    recipient_count: campaign.notification_recipients.length,
    pending_recipient_count,
    sent_recipient_count,
    failed_recipient_count,
    is_recoverable_send_only:
      campaign.status === "draft" && campaign.notification_recipients.length > 0,
  };
}

async function persistRecipientOutcome(
  campaignId: string,
  recipientOutcome: NotificationRecipientOutcome,
  database: NotificationCampaignDb,
): Promise<void> {
  await database.$transaction(async (tx) => {
    await acquireNotificationCampaignLock(tx, campaignId);
    await tx.notificationRecipient.update({
      where: {
        campaign_id_contact_id: {
          campaign_id: campaignId,
          contact_id: recipientOutcome.contact_id,
        },
      },
      data: {
        delivery_status: recipientOutcome.delivery_status,
        sent_at: recipientOutcome.sent_at,
        provider_message_id: recipientOutcome.provider_message_id,
        error_message: recipientOutcome.error_message,
      },
    });
  });
}

async function markPendingRecipientsFailed(
  campaignId: string,
  recipients: PreparedNotificationSend["recipients"],
  database: NotificationCampaignDb,
  errorMessage: string,
): Promise<void> {
  for (const recipient of recipients) {
    if (recipient.delivery_status !== "pending") {
      continue;
    }

    await persistRecipientOutcome(
      campaignId,
      {
        contact_id: recipient.contact_id,
        delivery_status: "failed",
        sent_at: null,
        provider_message_id: null,
        error_message: errorMessage,
      },
      database,
    );
  }
}

function normalizeNotificationCampaignError(error: unknown): Error {
  if (
    error instanceof NotificationCampaignValidationError ||
    error instanceof NotificationCampaignNotFoundError ||
    error instanceof NotificationCampaignReadOnlyError ||
    error instanceof NotificationCampaignNoEligibleRecipientsError ||
    error instanceof NotificationCampaignChannelNotSupportedError ||
    error instanceof NotificationCampaignPersistenceError
  ) {
    return error;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  ) {
    return new NotificationCampaignReadOnlyError(
      "This notification campaign can no longer be changed safely.",
    );
  }

  return error instanceof Error ? error : new Error("Unknown notification error.");
}

function getSafeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Notification delivery failed.";
}
