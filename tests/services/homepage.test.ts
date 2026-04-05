import {
  customer_stage,
  preferred_channel,
} from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  getHomepageData,
  HomepageNotifyConflictError,
  HomepageNotifyValidationError,
  submitHomepageNotifySignup,
} from "@/lib/services/homepage";

describe("getHomepageData", () => {
  it("maps homepage cards from daily logs and exposes only soft availability messaging", async () => {
    const database = createHomepageTestDatabase({
      dailyLogs: [
        buildDailyLog({
          id: "daily_log_yesterday",
          date: "2026-04-09",
          eggs_collected_for_sale: 24,
          chicken_count: 15,
          public_note: null,
        }),
        buildDailyLog({
          id: "daily_log_today",
          date: "2026-04-10",
          eggs_collected_for_sale: 31,
          chicken_count: 16,
          public_note: "Freshly collected this morning.",
        }),
      ],
      inventoryTransactions: [
        buildInventoryTransaction({ type: "collected", quantity: 50 }),
        buildInventoryTransaction({ type: "sold", quantity: 19 }),
      ],
      siteSettings: {
        low_stock_threshold: 30,
        homepage_public_note_enabled: true,
      },
    });

    const homepageData = await getHomepageData(
      {
        referenceDate: new Date("2026-04-10T12:00:00.000Z"),
        timeZone: "Europe/Amsterdam",
      },
      database as never,
    );

    expect(homepageData).toEqual({
      today_eggs_collected_for_sale: 31,
      yesterday_eggs_collected_for_sale: 24,
      latest_chicken_count: 16,
      availability: {
        state: "available",
        mk: "Достапни се свежи јајца",
        en: "Fresh eggs are available",
      },
      public_note: "Freshly collected this morning.",
    });
  });

  it("hides the public note unless the homepage setting is enabled while keeping derived values intact", async () => {
    const database = createHomepageTestDatabase({
      dailyLogs: [
        buildDailyLog({
          id: "daily_log_yesterday",
          date: "2026-04-09",
          eggs_collected_for_sale: 14,
          chicken_count: 11,
          public_note: "Yesterday note should never be shown.",
        }),
        buildDailyLog({
          id: "daily_log_today",
          date: "2026-04-10",
          eggs_collected_for_sale: 18,
          chicken_count: 12,
          public_note: "Small batch today.",
        }),
      ],
      inventoryTransactions: [
        buildInventoryTransaction({ type: "collected", quantity: 28 }),
        buildInventoryTransaction({ type: "sold", quantity: 8 }),
      ],
      siteSettings: {
        low_stock_threshold: 30,
        homepage_public_note_enabled: false,
      },
    });

    const homepageData = await getHomepageData(
      {
        referenceDate: new Date("2026-04-10T12:00:00.000Z"),
        timeZone: "Europe/Amsterdam",
      },
      database as never,
    );

    expect(homepageData).toEqual({
      today_eggs_collected_for_sale: 18,
      yesterday_eggs_collected_for_sale: 14,
      latest_chicken_count: 12,
      availability: {
        state: "limited",
        mk: "Ограничена достапност",
        en: "Limited availability",
      },
      public_note: null,
    });
  });
});

describe("submitHomepageNotifySignup", () => {
  it("creates a new subscriber contact from an email signup", async () => {
    const database = createHomepageTestDatabase();

    const contact = await submitHomepageNotifySignup(
      {
        full_name: "Ana Trajkovska",
        email_or_phone: "Ana@example.com",
      },
      database as never,
    );

    expect(contact).toMatchObject({
      full_name: "Ana Trajkovska",
      email: "ana@example.com",
      phone: null,
      is_subscriber: true,
      email_opt_in: true,
      phone_opt_in: false,
      preferred_channel: null,
      customer_stage: customer_stage.subscriber,
      source: "homepage_notify_form",
    });
    expect(database.contacts).toHaveLength(1);
  });

  it("updates exactly one matching phone contact without guessing a preferred channel", async () => {
    const database = createHomepageTestDatabase({
      contacts: [
        buildContact({
          id: "contact_1",
          full_name: "Old Name",
          phone: "+38970111222",
          is_subscriber: false,
          phone_opt_in: false,
          preferred_channel: null,
          customer_stage: customer_stage.lead,
          source: null,
        }),
      ],
    });

    const contact = await submitHomepageNotifySignup(
      {
        full_name: "New Name",
        email_or_phone: "+38970111222",
      },
      database as never,
    );

    expect(contact).toMatchObject({
      id: "contact_1",
      full_name: "New Name",
      is_subscriber: true,
      phone_opt_in: true,
      preferred_channel: null,
      customer_stage: customer_stage.subscriber,
      source: "homepage_notify_form",
    });
    expect(database.contacts).toHaveLength(1);
  });

  it("fails safely when more than one contact matches the submitted destination", async () => {
    const database = createHomepageTestDatabase({
      contacts: [
        buildContact({
          id: "contact_1",
          email: "ana@example.com",
        }),
        buildContact({
          id: "contact_2",
          email: "ana@example.com",
        }),
      ],
    });

    await expect(
      submitHomepageNotifySignup(
        {
          full_name: "Ana Trajkovska",
          email_or_phone: "ana@example.com",
        },
        database as never,
      ),
    ).rejects.toBeInstanceOf(HomepageNotifyConflictError);
  });

  it("rejects invalid notify input", async () => {
    const database = createHomepageTestDatabase();

    await expect(
      submitHomepageNotifySignup(
        {
          full_name: "",
          email_or_phone: "not-a-contact-method",
        },
        database as never,
      ),
    ).rejects.toBeInstanceOf(HomepageNotifyValidationError);
  });
});

function createHomepageTestDatabase(options?: {
  contacts?: Array<ReturnType<typeof buildContact>>;
  dailyLogs?: Array<ReturnType<typeof buildDailyLog>>;
  inventoryTransactions?: Array<ReturnType<typeof buildInventoryTransaction>>;
  siteSettings?: Partial<Record<"low_stock_threshold" | "homepage_public_note_enabled", boolean | number>>;
}) {
  const contacts = [...(options?.contacts ?? [])];
  const dailyLogs = [...(options?.dailyLogs ?? [])];
  const inventoryTransactions = [...(options?.inventoryTransactions ?? [])];
  const siteSettings = new Map<string, boolean | number>([
    ["low_stock_threshold", 30],
    ["homepage_public_note_enabled", false],
  ]);

  for (const [key, value] of Object.entries(options?.siteSettings ?? {})) {
    siteSettings.set(key, value);
  }

  let contactSequence = contacts.length;

  const tx = {
    contact: {
      findMany: async ({
        where,
      }: {
        where: { email?: string; phone?: string };
      }) =>
        contacts.filter((contact) =>
          where.email !== undefined
            ? contact.email === where.email
            : contact.phone === where.phone,
        ),
      create: async ({
        data,
      }: {
        data: Omit<ReturnType<typeof buildContact>, "id" | "created_at" | "updated_at">;
      }) => {
        contactSequence += 1;
        const created = buildContact({
          id: `contact_${contactSequence}`,
          ...data,
        });
        contacts.push(created);
        return created;
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
          updated_at: new Date("2026-04-10T10:30:00.000Z"),
        };
        contacts[index] = updated;
        return updated;
      },
    },
  };

  return {
    contacts,
    $transaction: async <T>(callback: (transaction: typeof tx) => Promise<T>) =>
      callback(tx),
    contact: tx.contact,
    dailyLog: {
      findUnique: async ({
        where,
      }: {
        where: { date: Date };
      }) =>
        dailyLogs.find((log) => log.date.getTime() === where.date.getTime()) ??
        null,
      findFirst: async () =>
        [...dailyLogs].sort((left, right) => right.date.getTime() - left.date.getTime())[0] ??
        null,
    },
    inventoryTransaction: {
      findMany: async () => [...inventoryTransactions],
    },
    siteSetting: {
      findUnique: async ({ where }: { where: { key: string } }) => {
        if (!siteSettings.has(where.key)) {
          return null;
        }

        return {
          value_json: siteSettings.get(where.key) ?? null,
        };
      },
    },
  };
}

function buildDailyLog(
  overrides?: Partial<{
    id: string;
    date: string;
    eggs_collected_for_sale: number;
    chicken_count: number;
    public_note: string | null;
  }>,
) {
  return {
    id: overrides?.id ?? "daily_log_seed",
    date: new Date(`${overrides?.date ?? "2026-04-10"}T00:00:00.000Z`),
    eggs_collected_for_sale: overrides?.eggs_collected_for_sale ?? 20,
    chicken_count: overrides?.chicken_count ?? 14,
    public_note: overrides?.public_note ?? null,
    created_at: new Date("2026-04-10T08:00:00.000Z"),
  };
}

function buildInventoryTransaction(
  overrides?: Partial<{
    type: "collected" | "reserved" | "released" | "sold" | "manual_adjustment";
    quantity: number;
  }>,
) {
  return {
    type: overrides?.type ?? "collected",
    quantity: overrides?.quantity ?? 0,
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
    preference_unit: null;
    notification_frequency: null;
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
    created_at: overrides?.created_at ?? new Date("2026-04-01T09:00:00.000Z"),
    updated_at: overrides?.updated_at ?? new Date("2026-04-01T09:00:00.000Z"),
  };
}
