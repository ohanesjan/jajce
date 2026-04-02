import {
  customer_stage,
  notification_frequency,
  preference_unit,
  preferred_channel,
} from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  ContactInUseError,
  ContactNotFoundError,
  createContact,
  deleteContact,
  updateContact,
  validateContactInput,
} from "@/lib/services/contacts";
import { ContactValidationError } from "@/lib/services/contact-validation";

describe("validateContactInput", () => {
  it("allows overlapping role flags and preserves customer_stage separately", () => {
    const validated = validateContactInput({
      full_name: "  Elena Petrova  ",
      email: "  ELENA@example.com  ",
      phone: " +389 70 123 456 ",
      is_subscriber: "on",
      is_waiting_list: "on",
      is_active_customer: "",
      email_opt_in: "on",
      phone_opt_in: "on",
      preferred_channel: "all",
      preferred_quantity: "30",
      preference_unit: "week",
      notification_frequency: "weekly",
      customer_stage: "subscriber",
      source: "  fair booth  ",
      joined_waiting_list_at: "2026-04-01",
      became_customer_at: "",
      notes: "  Prefers cartons  ",
    });

    expect(validated).toMatchObject({
      full_name: "Elena Petrova",
      email: "elena@example.com",
      phone: "+389 70 123 456",
      is_subscriber: true,
      is_waiting_list: true,
      is_active_customer: false,
      email_opt_in: true,
      phone_opt_in: true,
      preferred_channel: preferred_channel.all,
      preferred_quantity: 30,
      preference_unit: preference_unit.week,
      notification_frequency: notification_frequency.weekly,
      customer_stage: customer_stage.subscriber,
      source: "fair booth",
      notes: "Prefers cartons",
    });
  });

  it("requires email when preferred channel is email", () => {
    expect(() =>
      validateContactInput({
        full_name: "Missing Email",
        preferred_channel: "email",
      }),
    ).toThrow(ContactValidationError);
  });

  it("requires phone when preferred channel is viber", () => {
    expect(() =>
      validateContactInput({
        full_name: "Missing Phone",
        preferred_channel: "viber",
      }),
    ).toThrow(ContactValidationError);
  });

  it("requires both email and phone when preferred channel is all", () => {
    expect(() =>
      validateContactInput({
        full_name: "Missing Both",
        email: "person@example.com",
        preferred_channel: "all",
      }),
    ).toThrow(ContactValidationError);
  });
});

describe("contact mutations", () => {
  it("creates a contact through the service layer", async () => {
    const database = createContactTestDatabase();

    const contact = await createContact(
      {
        full_name: "Ana Trajkovska",
        email: "ana@example.com",
        is_subscriber: "on",
        customer_stage: "lead",
      },
      database as never,
    );

    expect(contact.full_name).toBe("Ana Trajkovska");
    expect(contact.email).toBe("ana@example.com");
    expect(contact.is_subscriber).toBe(true);
    expect(database.contacts).toHaveLength(1);
  });

  it("updates an existing contact", async () => {
    const database = createContactTestDatabase({
      contacts: [
        buildContact({
          id: "contact_1",
          full_name: "Old Name",
          email: "old@example.com",
        }),
      ],
    });

    const updated = await updateContact(
      "contact_1",
      {
        full_name: "New Name",
        email: "new@example.com",
        customer_stage: "active",
      },
      database as never,
    );

    expect(updated.full_name).toBe("New Name");
    expect(updated.email).toBe("new@example.com");
    expect(updated.customer_stage).toBe(customer_stage.active);
  });

  it("throws when updating a missing contact", async () => {
    const database = createContactTestDatabase();

    await expect(
      updateContact(
        "missing",
        {
          full_name: "Nobody",
        },
        database as never,
      ),
    ).rejects.toBeInstanceOf(ContactNotFoundError);
  });

  it("maps foreign key restrictions to ContactInUseError on delete", async () => {
    const database = createContactTestDatabase({
      contacts: [buildContact({ id: "contact_in_use", full_name: "Used Contact" })],
      failDeleteWithForeignKey: true,
    });

    await expect(deleteContact("contact_in_use", database as never)).rejects.toBeInstanceOf(
      ContactInUseError,
    );
  });
});

function createContactTestDatabase(options?: {
  contacts?: ReturnType<typeof buildContact>[];
  failDeleteWithForeignKey?: boolean;
}) {
  const contacts = [...(options?.contacts ?? [])];
  let contactSequence = contacts.length;

  const tx = {
    contact: {
      findMany: async () => [...contacts],
      findUnique: async ({
        where,
      }: {
        where: { id: string };
      }) => contacts.find((contact) => contact.id === where.id) ?? null,
      create: async ({ data }: { data: Omit<ReturnType<typeof buildContact>, "id" | "created_at" | "updated_at"> }) => {
        contactSequence += 1;
        const contact = buildContact({
          id: `contact_${contactSequence}`,
          ...data,
        });
        contacts.push(contact);
        return contact;
      },
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: Partial<ReturnType<typeof buildContact>>;
      }) => {
        const index = contacts.findIndex((contact) => contact.id === where.id);

        if (index === -1) {
          throw new Error("Missing contact");
        }

        const updated = {
          ...contacts[index],
          ...data,
          updated_at: new Date("2026-04-02T10:00:00.000Z"),
        };
        contacts[index] = updated;
        return updated;
      },
      delete: async ({ where }: { where: { id: string } }) => {
        if (options?.failDeleteWithForeignKey) {
          const error = new Error("Foreign key violation") as Error & {
            code?: string;
          };
          error.code = "P2003";
          throw error;
        }

        const index = contacts.findIndex((contact) => contact.id === where.id);

        if (index !== -1) {
          contacts.splice(index, 1);
        }
      },
    },
  };

  return {
    contacts,
    $transaction: async <T>(callback: (transaction: typeof tx) => Promise<T>) =>
      callback(tx),
    contact: tx.contact,
  };
}

function buildContact(
  overrides?: Partial<{
    id: string;
    full_name: string;
    email: string | null;
    phone: string | null;
    is_subscriber: boolean;
    is_waiting_list: boolean;
    is_active_customer: boolean;
    email_opt_in: boolean;
    phone_opt_in: boolean;
    preferred_channel: preferred_channel | null;
    preferred_quantity: number | null;
    preference_unit: preference_unit | null;
    notification_frequency: notification_frequency | null;
    customer_stage: customer_stage;
    source: string | null;
    joined_waiting_list_at: Date | null;
    became_customer_at: Date | null;
    notes: string | null;
    created_at: Date;
    updated_at: Date;
  }>,
) {
  return {
    id: overrides?.id ?? "contact_seed",
    full_name: overrides?.full_name ?? "Seed Contact",
    email: overrides?.email ?? null,
    phone: overrides?.phone ?? null,
    is_subscriber: overrides?.is_subscriber ?? false,
    is_waiting_list: overrides?.is_waiting_list ?? false,
    is_active_customer: overrides?.is_active_customer ?? false,
    email_opt_in: overrides?.email_opt_in ?? false,
    phone_opt_in: overrides?.phone_opt_in ?? false,
    preferred_channel: overrides?.preferred_channel ?? null,
    preferred_quantity: overrides?.preferred_quantity ?? null,
    preference_unit: overrides?.preference_unit ?? null,
    notification_frequency: overrides?.notification_frequency ?? null,
    customer_stage: overrides?.customer_stage ?? customer_stage.lead,
    source: overrides?.source ?? null,
    joined_waiting_list_at: overrides?.joined_waiting_list_at ?? null,
    became_customer_at: overrides?.became_customer_at ?? null,
    notes: overrides?.notes ?? null,
    created_at: overrides?.created_at ?? new Date("2026-04-01T08:00:00.000Z"),
    updated_at: overrides?.updated_at ?? new Date("2026-04-01T08:00:00.000Z"),
  };
}
