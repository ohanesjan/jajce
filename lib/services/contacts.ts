import { Contact, PrismaClient } from "@prisma/client";
import { getDb } from "@/lib/db";
import {
  ContactValidationError,
  parseBooleanLike,
  parseCustomerStage,
  parseNotificationFrequency,
  parseOptionalDateOnly,
  parseOptionalEmail,
  parseOptionalPhone,
  parseOptionalPositiveInteger,
  parseOptionalText,
  parsePreferenceUnit,
  parsePreferredChannel,
  parseRequiredText,
} from "@/lib/services/contact-validation";

export class ContactNotFoundError extends Error {}
export class ContactInUseError extends Error {}

export type ContactMutationInput = {
  full_name: unknown;
  email?: unknown;
  phone?: unknown;
  is_subscriber?: unknown;
  is_waiting_list?: unknown;
  is_active_customer?: unknown;
  email_opt_in?: unknown;
  phone_opt_in?: unknown;
  preferred_channel?: unknown;
  preferred_quantity?: unknown;
  preference_unit?: unknown;
  notification_frequency?: unknown;
  customer_stage?: unknown;
  source?: unknown;
  joined_waiting_list_at?: unknown;
  became_customer_at?: unknown;
  notes?: unknown;
};

export type ContactWriteInput = Pick<
  Contact,
  | "full_name"
  | "email"
  | "phone"
  | "is_subscriber"
  | "is_waiting_list"
  | "is_active_customer"
  | "email_opt_in"
  | "phone_opt_in"
  | "preferred_channel"
  | "preferred_quantity"
  | "preference_unit"
  | "notification_frequency"
  | "customer_stage"
  | "source"
  | "joined_waiting_list_at"
  | "became_customer_at"
  | "notes"
>;

type ContactDb = Pick<
  PrismaClient,
  | "$transaction"
  | "contact"
  | "notificationCampaignSelection"
  | "notificationRecipient"
  | "order"
>;
type ContactListDb = Pick<PrismaClient, "contact">;
type ContactTransactionDb = Parameters<
  Parameters<ContactDb["$transaction"]>[0]
>[0];

export function validateContactInput(
  input: ContactMutationInput,
): ContactWriteInput {
  const email = parseOptionalEmail(input.email);
  const phone = parseOptionalPhone(input.phone);
  const preferred_channel = parsePreferredChannel(input.preferred_channel);
  const email_opt_in = parseBooleanLike(input.email_opt_in, "Email opt-in");
  const phone_opt_in = parseBooleanLike(input.phone_opt_in, "Phone opt-in");

  enforcePreferredChannelRequirements(preferred_channel, { email, phone });
  enforceOptInDestinationRequirements({ email, phone, email_opt_in, phone_opt_in });

  return {
    full_name: parseRequiredText(input.full_name, "Full name"),
    email,
    phone,
    is_subscriber: parseBooleanLike(input.is_subscriber, "Subscriber flag"),
    is_waiting_list: parseBooleanLike(
      input.is_waiting_list,
      "Waiting list flag",
    ),
    is_active_customer: parseBooleanLike(
      input.is_active_customer,
      "Active customer flag",
    ),
    email_opt_in,
    phone_opt_in,
    preferred_channel,
    preferred_quantity: parseOptionalPositiveInteger(
      input.preferred_quantity,
      "Preferred quantity",
    ),
    preference_unit: parsePreferenceUnit(input.preference_unit),
    notification_frequency: parseNotificationFrequency(
      input.notification_frequency,
    ),
    customer_stage:
      input.customer_stage === undefined
        ? "lead"
        : parseCustomerStage(input.customer_stage),
    source: parseOptionalText(input.source),
    joined_waiting_list_at: parseOptionalDateOnly(
      input.joined_waiting_list_at,
      "Joined waiting list at",
    ),
    became_customer_at: parseOptionalDateOnly(
      input.became_customer_at,
      "Became customer at",
    ),
    notes: parseOptionalText(input.notes),
  };
}

export async function listContacts(
  database: ContactListDb = getDb(),
): Promise<Contact[]> {
  return database.contact.findMany({
    orderBy: [{ full_name: "asc" }, { created_at: "desc" }],
  });
}

export async function createContact(
  input: ContactMutationInput,
  database: ContactDb = getDb(),
): Promise<Contact> {
  const validatedInput = validateContactInput(input);

  return database.$transaction((tx) =>
    tx.contact.create({
      data: validatedInput,
    }),
  );
}

export async function updateContact(
  contactId: string,
  input: ContactMutationInput,
  database: ContactDb = getDb(),
): Promise<Contact> {
  const validatedInput = validateContactInput(input);

  return database.$transaction(async (tx) => {
    const existingContact = await tx.contact.findUnique({
      where: { id: contactId },
      select: { id: true },
    });

    if (!existingContact) {
      throw new ContactNotFoundError("Contact not found.");
    }

    return tx.contact.update({
      where: { id: contactId },
      data: validatedInput,
    });
  });
}

export async function deleteContact(
  contactId: string,
  database: ContactDb = getDb(),
): Promise<void> {
  try {
    await database.$transaction(async (tx) => {
      const existingContact = await tx.contact.findUnique({
        where: { id: contactId },
        select: { id: true },
      });

      if (!existingContact) {
        throw new ContactNotFoundError("Contact not found.");
      }

      await assertContactCanBeDeleted(tx, contactId);

      await tx.contact.delete({
        where: { id: contactId },
      });
    });
  } catch (error) {
    throw normalizeContactMutationError(error);
  }
}

function enforcePreferredChannelRequirements(
  selectedChannel: Contact["preferred_channel"],
  {
    email,
    phone,
  }: {
    email: string | null;
    phone: string | null;
  },
): void {
  if (selectedChannel === "email" && !email) {
    throw new ContactValidationError(
      "Preferred channel email requires an email address.",
    );
  }

  if (
    (selectedChannel === "viber" || selectedChannel === "whatsapp") &&
    !phone
  ) {
    throw new ContactValidationError(
      "Preferred phone channels require a phone number.",
    );
  }

  if (selectedChannel === "all" && (!email || !phone)) {
    throw new ContactValidationError(
      "Preferred channel all requires both email and phone.",
    );
  }
}

function enforceOptInDestinationRequirements({
  email,
  phone,
  email_opt_in,
  phone_opt_in,
}: {
  email: string | null;
  phone: string | null;
  email_opt_in: boolean;
  phone_opt_in: boolean;
}): void {
  if (email_opt_in && !email) {
    throw new ContactValidationError(
      "Email opt-in requires an email address.",
    );
  }

  if (phone_opt_in && !phone) {
    throw new ContactValidationError(
      "Phone opt-in requires a phone number.",
    );
  }
}

function normalizeContactMutationError(error: unknown): Error {
  if (
    error instanceof ContactValidationError ||
    error instanceof ContactNotFoundError ||
    error instanceof ContactInUseError
  ) {
    return error;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2003"
  ) {
    return new ContactInUseError(
      "This contact is already referenced by another record.",
    );
  }

  return error instanceof Error ? error : new Error("Unknown contact error.");
}

async function assertContactCanBeDeleted(
  database: Pick<
    ContactTransactionDb,
    "notificationCampaignSelection" | "notificationRecipient" | "order"
  >,
  contactId: string,
): Promise<void> {
  const [
    orderCount,
    notificationRecipientCount,
    notificationSelectionCount,
  ] = await Promise.all([
    database.order.count({
      where: { contact_id: contactId },
    }),
    database.notificationRecipient.count({
      where: { contact_id: contactId },
    }),
    database.notificationCampaignSelection.count({
      where: { contact_id: contactId },
    }),
  ]);
  const blockers: string[] = [];

  if (orderCount > 0) {
    blockers.push(orderCount === 1 ? "1 order" : `${orderCount} orders`);
  }

  if (notificationRecipientCount > 0) {
    blockers.push(
      notificationRecipientCount === 1
        ? "1 notification history row"
        : `${notificationRecipientCount} notification history rows`,
    );
  }

  if (notificationSelectionCount > 0) {
    blockers.push(
      notificationSelectionCount === 1
        ? "1 saved notification draft selection"
        : `${notificationSelectionCount} saved notification draft selections`,
    );
  }

  if (blockers.length === 0) {
    return;
  }

  throw new ContactInUseError(
    `This contact cannot be deleted because it is still referenced by ${blockers.join(", ")}.`,
  );
}
