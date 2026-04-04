import { describe, expect, it } from "vitest";
import { resolveNotificationEmailAudience } from "@/lib/services/notification-audiences";

describe("resolveNotificationEmailAudience", () => {
  it("returns only email-eligible subscribers", async () => {
    const database = createAudienceTestDatabase({
      contacts: [
        buildContact({
          id: "contact_1",
          full_name: "Ana",
          is_subscriber: true,
          email: "ana@example.com",
          email_opt_in: true,
        }),
        buildContact({
          id: "contact_2",
          full_name: "Boris",
          is_subscriber: true,
          email: "boris@example.com",
          email_opt_in: false,
        }),
        buildContact({
          id: "contact_3",
          full_name: "Cveta",
          is_subscriber: true,
          email: "not-an-email",
          email_opt_in: true,
        }),
      ],
    });

    const recipients = await resolveNotificationEmailAudience(
      {
        audience_type: "subscribers",
        selected_contact_ids: [],
      },
      database as never,
    );

    expect(recipients).toEqual([
      {
        contact_id: "contact_1",
        full_name: "Ana",
        destination: "ana@example.com",
      },
    ]);
  });

  it("resolves selected contacts against current contact data without using preferred_channel", async () => {
    const database = createAudienceTestDatabase({
      contacts: [
        buildContact({
          id: "contact_1",
          full_name: "Ana",
          email: "ana@example.com",
          email_opt_in: true,
          preferred_channel: "viber",
        }),
        buildContact({
          id: "contact_2",
          full_name: "Boris",
          email: "boris@example.com",
          email_opt_in: false,
          preferred_channel: "email",
        }),
      ],
    });

    const recipients = await resolveNotificationEmailAudience(
      {
        audience_type: "selected_contacts",
        selected_contact_ids: ["contact_2", "contact_1"],
      },
      database as never,
    );

    expect(recipients).toEqual([
      {
        contact_id: "contact_1",
        full_name: "Ana",
        destination: "ana@example.com",
      },
    ]);
  });
});

function createAudienceTestDatabase(options?: {
  contacts?: Array<ReturnType<typeof buildContact>>;
}) {
  const contacts = [...(options?.contacts ?? [])];

  return {
    contact: {
      findMany: async ({
        where,
      }: {
        where:
          | { is_subscriber: boolean }
          | { is_waiting_list: boolean }
          | { is_active_customer: boolean }
          | { id: { in: string[] } };
      }) => {
        let filteredContacts = contacts;

        if ("is_subscriber" in where) {
          filteredContacts = filteredContacts.filter(
            (contact) => contact.is_subscriber === where.is_subscriber,
          );
        } else if ("is_waiting_list" in where) {
          filteredContacts = filteredContacts.filter(
            (contact) => contact.is_waiting_list === where.is_waiting_list,
          );
        } else if ("is_active_customer" in where) {
          filteredContacts = filteredContacts.filter(
            (contact) =>
              contact.is_active_customer === where.is_active_customer,
          );
        } else {
          filteredContacts = filteredContacts.filter((contact) =>
            where.id.in.includes(contact.id),
          );
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
  };
}

function buildContact(
  overrides?: Partial<{
    id: string;
    full_name: string;
    email: string | null;
    is_subscriber: boolean;
    is_waiting_list: boolean;
    is_active_customer: boolean;
    email_opt_in: boolean;
    preferred_channel: string | null;
  }>,
) {
  return {
    id: overrides?.id ?? "contact_seed",
    full_name: overrides?.full_name ?? "Seed Contact",
    email: overrides?.email ?? null,
    is_subscriber: overrides?.is_subscriber ?? false,
    is_waiting_list: overrides?.is_waiting_list ?? false,
    is_active_customer: overrides?.is_active_customer ?? false,
    email_opt_in: overrides?.email_opt_in ?? false,
    preferred_channel: overrides?.preferred_channel ?? null,
  };
}
