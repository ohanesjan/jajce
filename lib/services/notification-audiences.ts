import { PrismaClient, audience_type } from "@prisma/client";
import { getDb } from "@/lib/db";
import { parseOptionalEmail } from "@/lib/services/contact-validation";

export type ResolvedNotificationEmailRecipient = {
  contact_id: string;
  full_name: string;
  destination: string;
};

type NotificationAudienceDb = Pick<PrismaClient, "contact">;

type AudienceContactRecord = {
  id: string;
  full_name: string;
  email: string | null;
  email_opt_in: boolean;
};

export async function resolveNotificationEmailAudience(
  {
    audience_type,
    selected_contact_ids,
  }: {
    audience_type: audience_type;
    selected_contact_ids: string[];
  },
  database: NotificationAudienceDb = getDb(),
): Promise<ResolvedNotificationEmailRecipient[]> {
  const contacts = await database.contact.findMany({
    where: buildAudienceWhereClause(audience_type, selected_contact_ids),
    select: {
      id: true,
      full_name: true,
      email: true,
      email_opt_in: true,
    },
    orderBy: [{ full_name: "asc" }, { created_at: "asc" }, { id: "asc" }],
  });

  return contacts
    .map((contact) => buildResolvedEmailRecipient(contact))
    .filter((contact): contact is ResolvedNotificationEmailRecipient => contact !== null);
}

function buildAudienceWhereClause(
  audienceType: audience_type,
  selectedContactIds: string[],
) {
  switch (audienceType) {
    case "subscribers":
      return { is_subscriber: true };
    case "waiting_list":
      return { is_waiting_list: true };
    case "active_customers":
      return { is_active_customer: true };
    case "selected_contacts":
      return selectedContactIds.length === 0
        ? { id: { in: ["__no_selected_contacts__"] } }
        : { id: { in: selectedContactIds } };
  }
}

function buildResolvedEmailRecipient(
  contact: AudienceContactRecord,
): ResolvedNotificationEmailRecipient | null {
  if (!contact.email_opt_in) {
    return null;
  }

  const email = normalizeEligibleEmail(contact.email);

  if (!email) {
    return null;
  }

  return {
    contact_id: contact.id,
    full_name: contact.full_name,
    destination: email,
  };
}

function normalizeEligibleEmail(value: string | null): string | null {
  try {
    return parseOptionalEmail(value);
  } catch {
    return null;
  }
}
