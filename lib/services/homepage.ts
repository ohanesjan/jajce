import { Contact, customer_stage, PrismaClient } from "@prisma/client";
import { getDb } from "@/lib/db";
import {
  deriveHomepageAvailabilityMessage,
  HomepageAvailabilityState,
} from "@/lib/domain/homepage";
import { calculateAvailableInventory } from "@/lib/domain/inventory";
import {
  ContactValidationError,
  parseOptionalEmail,
  parseOptionalPhone,
  parseRequiredText,
} from "@/lib/services/contact-validation";
import {
  getDefaultEggUnitPrice,
  getHomepageStatOverrides,
  getHomepagePublicNoteEnabled,
  getLowStockThreshold,
} from "@/lib/services/site-settings";
import {
  addUtcDays,
  getDateOnlyInTimeZone,
  parseDateOnly,
} from "@/lib/utils/date";

const HOMEPAGE_TIME_ZONE =
  process.env.ADMIN_DASHBOARD_TIME_ZONE ?? "Europe/Amsterdam";
const HOMEPAGE_NOTIFY_SOURCE = "homepage_notify_form";

export class HomepageNotifyValidationError extends Error {}
export class HomepageNotifyConflictError extends Error {}

export type HomepageAvailabilityMessages = {
  state: HomepageAvailabilityState;
  mk: string;
  en: string;
};

export type HomepageData = {
  today_eggs_collected_for_sale: number | null;
  yesterday_eggs_collected_for_sale: number | null;
  latest_chicken_count: number | null;
  public_price: number;
  availability: HomepageAvailabilityMessages;
  public_note: string | null;
};

export type HomepageNotifyInput = {
  full_name: unknown;
  email_or_phone: unknown;
};

type HomepageReadDb = Pick<
  PrismaClient,
  "dailyLog" | "inventoryTransaction" | "siteSetting"
>;

type HomepageNotifyDb = Pick<PrismaClient, "$transaction" | "contact">;

type HomepageContactMethod =
  | {
      kind: "email";
      value: string;
    }
  | {
      kind: "phone";
      value: string;
    };

type HomepageNotifyWriteInput = {
  full_name: string;
  contact_method: HomepageContactMethod;
};

export async function getHomepageData(
  {
    referenceDate = new Date(),
    timeZone = HOMEPAGE_TIME_ZONE,
  }: {
    referenceDate?: Date;
    timeZone?: string;
  } = {},
  database: HomepageReadDb = getDb(),
): Promise<HomepageData> {
  const todayDate = parseDateOnly(getDateOnlyInTimeZone(referenceDate, timeZone));
  const yesterdayDate = addUtcDays(todayDate, -1);

  const [
    todayLog,
    yesterdayLog,
    latestDailyLog,
    inventoryTransactions,
    lowStockThreshold,
    defaultEggUnitPrice,
    homepagePublicNoteEnabled,
    homepageStatOverrides,
  ] = await Promise.all([
    database.dailyLog.findUnique({
      where: { date: todayDate },
      select: {
        eggs_collected_for_sale: true,
        public_note: true,
      },
    }),
    database.dailyLog.findUnique({
      where: { date: yesterdayDate },
      select: {
        eggs_collected_for_sale: true,
      },
    }),
    database.dailyLog.findFirst({
      orderBy: [{ date: "desc" }, { created_at: "desc" }],
      select: {
        chicken_count: true,
      },
    }),
    database.inventoryTransaction.findMany({
      select: {
        type: true,
        quantity: true,
      },
    }),
    getLowStockThreshold(database),
    getDefaultEggUnitPrice(database),
    getHomepagePublicNoteEnabled(database),
    getHomepageStatOverrides(database),
  ]);

  const availableEggs = calculateAvailableInventory(inventoryTransactions);
  const availabilityMk = deriveHomepageAvailabilityMessage({
    available_eggs: availableEggs,
    low_stock_threshold: lowStockThreshold,
    locale: "mk",
  });
  const availabilityEn = deriveHomepageAvailabilityMessage({
    available_eggs: availableEggs,
    low_stock_threshold: lowStockThreshold,
    locale: "en",
  });
  const derivedTodayEggsCollectedForSale = todayLog?.eggs_collected_for_sale ?? null;
  const derivedYesterdayEggsCollectedForSale =
    yesterdayLog?.eggs_collected_for_sale ?? null;
  const derivedLatestChickenCount = latestDailyLog?.chicken_count ?? null;
  const resolvedDefaultEggUnitPrice = decimalToNumber(defaultEggUnitPrice);

  return {
    today_eggs_collected_for_sale: homepageStatOverrides.manual_counts_enabled
      ? homepageStatOverrides.today_eggs_collected_for_sale ??
        derivedTodayEggsCollectedForSale
      : derivedTodayEggsCollectedForSale,
    yesterday_eggs_collected_for_sale: homepageStatOverrides.manual_counts_enabled
      ? homepageStatOverrides.yesterday_eggs_collected_for_sale ??
        derivedYesterdayEggsCollectedForSale
      : derivedYesterdayEggsCollectedForSale,
    latest_chicken_count: homepageStatOverrides.manual_counts_enabled
      ? homepageStatOverrides.latest_chicken_count ?? derivedLatestChickenCount
      : derivedLatestChickenCount,
    public_price: homepageStatOverrides.manual_price_enabled
      ? homepageStatOverrides.public_price ?? resolvedDefaultEggUnitPrice
      : resolvedDefaultEggUnitPrice,
    availability: {
      state: availabilityMk.state,
      mk: availabilityMk.message,
      en: availabilityEn.message,
    },
    public_note:
      homepagePublicNoteEnabled && todayLog?.public_note
        ? todayLog.public_note
        : null,
  };
}

function decimalToNumber(value: { toNumber(): number } | number): number {
  return typeof value === "number" ? value : value.toNumber();
}

export async function submitHomepageNotifySignup(
  input: HomepageNotifyInput,
  database: HomepageNotifyDb = getDb(),
): Promise<Contact> {
  const validatedInput = validateHomepageNotifyInput(input);

  return database.$transaction(async (tx) => {
    const matchingContacts = await tx.contact.findMany({
      where:
        validatedInput.contact_method.kind === "email"
          ? { email: validatedInput.contact_method.value }
          : { phone: validatedInput.contact_method.value },
      orderBy: [{ created_at: "asc" }, { id: "asc" }],
    });

    if (matchingContacts.length > 1) {
      throw new HomepageNotifyConflictError(
        "More than one contact matched the submitted notify destination.",
      );
    }

    if (matchingContacts.length === 1) {
      return tx.contact.update({
        where: { id: matchingContacts[0].id },
        data: buildHomepageNotifyUpdateData(
          matchingContacts[0],
          validatedInput,
        ),
      });
    }

    return tx.contact.create({
      data: buildHomepageNotifyCreateData(validatedInput),
    });
  });
}

export function validateHomepageNotifyInput(
  input: HomepageNotifyInput,
): HomepageNotifyWriteInput {
  try {
    const fullName = parseRequiredText(input.full_name, "Full name");
    const emailOrPhone = parseRequiredText(
      input.email_or_phone,
      "Email or phone",
    );

    return {
      full_name: fullName,
      contact_method: parseHomepageContactMethod(emailOrPhone),
    };
  } catch (error) {
    if (error instanceof ContactValidationError) {
      throw new HomepageNotifyValidationError(error.message);
    }

    throw error;
  }
}

function parseHomepageContactMethod(value: string): HomepageContactMethod {
  const normalizedValue = value.trim();

  if (normalizedValue.includes("@")) {
    const email = parseOptionalEmail(normalizedValue);

    if (!email) {
      throw new HomepageNotifyValidationError(
        "Email or phone must be a valid email address or phone number.",
      );
    }

    return {
      kind: "email",
      value: email,
    };
  }

  const phone = parseOptionalPhone(normalizedValue);

  if (phone) {
    return {
      kind: "phone",
      value: phone,
    };
  }

  throw new HomepageNotifyValidationError(
    "Email or phone must be a valid email address or phone number.",
  );
}

function buildHomepageNotifyCreateData(input: HomepageNotifyWriteInput) {
  return {
    full_name: input.full_name,
    email: input.contact_method.kind === "email" ? input.contact_method.value : null,
    phone: input.contact_method.kind === "phone" ? input.contact_method.value : null,
    is_subscriber: true,
    is_waiting_list: false,
    is_active_customer: false,
    email_opt_in: input.contact_method.kind === "email",
    phone_opt_in: input.contact_method.kind === "phone",
    preferred_channel: null,
    preferred_quantity: null,
    preference_unit: null,
    notification_frequency: null,
    customer_stage: customer_stage.subscriber,
    source: HOMEPAGE_NOTIFY_SOURCE,
    joined_waiting_list_at: null,
    became_customer_at: null,
    notes: null,
  };
}

function buildHomepageNotifyUpdateData(
  existingContact: Pick<
    Contact,
    | "customer_stage"
    | "email_opt_in"
    | "full_name"
    | "id"
    | "phone_opt_in"
    | "preferred_channel"
    | "source"
  >,
  input: HomepageNotifyWriteInput,
) {
  return {
    full_name: input.full_name,
    ...(input.contact_method.kind === "email"
      ? { email: input.contact_method.value }
      : { phone: input.contact_method.value }),
    is_subscriber: true,
    email_opt_in:
      existingContact.email_opt_in || input.contact_method.kind === "email",
    phone_opt_in:
      existingContact.phone_opt_in || input.contact_method.kind === "phone",
    customer_stage: resolveHomepageNotifyCustomerStage(
      existingContact.customer_stage,
    ),
    preferred_channel: existingContact.preferred_channel,
    source: existingContact.source ?? HOMEPAGE_NOTIFY_SOURCE,
  };
}

function resolveHomepageNotifyCustomerStage(
  stage: Contact["customer_stage"],
): Contact["customer_stage"] {
  if (stage === "lead" || stage === "inactive") {
    return "subscriber";
  }

  return stage;
}
