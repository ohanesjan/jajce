import { Prisma, PrismaClient } from "@prisma/client";
import { getDb } from "@/lib/db";

export class SiteSettingValidationError extends Error {}

type SiteSettingsDb = Pick<PrismaClient, "siteSetting">;
const HOMEPAGE_STAT_OVERRIDES_KEY = "homepage_stat_overrides";

export type HomepageStatOverrides = {
  manual_counts_enabled: boolean;
  manual_price_enabled: boolean;
  today_eggs_collected_for_sale: number | null;
  yesterday_eggs_collected_for_sale: number | null;
  latest_chicken_count: number | null;
  public_price: number | null;
};

type HomepageStatOverridesInput = Partial<
  Record<keyof HomepageStatOverrides, unknown>
>;

export async function getDefaultEggUnitPrice(
  database: SiteSettingsDb = getDb(),
): Promise<Prisma.Decimal> {
  return parseSiteSettingDecimal(
    await getRequiredSiteSettingValue("default_egg_unit_price", database),
    "default_egg_unit_price",
  );
}

export async function getLowStockThreshold(
  database: SiteSettingsDb = getDb(),
): Promise<number> {
  return parseSiteSettingNonNegativeInteger(
    await getRequiredSiteSettingValue("low_stock_threshold", database),
    "low_stock_threshold",
  );
}

export async function getHomepagePublicNoteEnabled(
  database: SiteSettingsDb = getDb(),
): Promise<boolean> {
  return parseSiteSettingBoolean(
    await getRequiredSiteSettingValue("homepage_public_note_enabled", database),
    "homepage_public_note_enabled",
  );
}

export async function getSenderLabelDefault(
  database: SiteSettingsDb = getDb(),
): Promise<string> {
  return parseSiteSettingRequiredText(
    await getRequiredSiteSettingValue("sender_label_default", database),
    "sender_label_default",
  );
}

export async function updateHomepagePublicNoteEnabled(
  value: unknown,
  database: SiteSettingsDb = getDb(),
) {
  return database.siteSetting.upsert({
    where: { key: "homepage_public_note_enabled" },
    update: {
      value_json: parseBooleanInput(value, "homepage_public_note_enabled"),
    },
    create: {
      key: "homepage_public_note_enabled",
      value_json: parseBooleanInput(value, "homepage_public_note_enabled"),
    },
  });
}

export async function getHomepageStatOverrides(
  database: SiteSettingsDb = getDb(),
): Promise<HomepageStatOverrides> {
  const setting = await database.siteSetting.findUnique({
    where: { key: HOMEPAGE_STAT_OVERRIDES_KEY },
    select: { value_json: true },
  });

  if (!setting) {
    return createEmptyHomepageStatOverrides();
  }

  return parseHomepageStatOverridesSetting(setting.value_json);
}

export async function updateHomepageStatOverrides(
  input: HomepageStatOverridesInput,
  database: SiteSettingsDb = getDb(),
) {
  const currentOverrides = await getHomepageStatOverrides(database);

  const nextOverrides: HomepageStatOverrides = {
    manual_counts_enabled: hasOwnInputField(input, "manual_counts_enabled")
      ? parseBooleanInput(input.manual_counts_enabled, "manual_counts_enabled")
      : currentOverrides.manual_counts_enabled,
    manual_price_enabled: hasOwnInputField(input, "manual_price_enabled")
      ? parseBooleanInput(input.manual_price_enabled, "manual_price_enabled")
      : currentOverrides.manual_price_enabled,
    today_eggs_collected_for_sale: hasOwnInputField(
      input,
      "today_eggs_collected_for_sale",
    )
      ? parseOptionalNonNegativeInteger(
          input.today_eggs_collected_for_sale,
          "today_eggs_collected_for_sale",
        )
      : currentOverrides.today_eggs_collected_for_sale,
    yesterday_eggs_collected_for_sale: hasOwnInputField(
      input,
      "yesterday_eggs_collected_for_sale",
    )
      ? parseOptionalNonNegativeInteger(
          input.yesterday_eggs_collected_for_sale,
          "yesterday_eggs_collected_for_sale",
        )
      : currentOverrides.yesterday_eggs_collected_for_sale,
    latest_chicken_count: hasOwnInputField(input, "latest_chicken_count")
      ? parseOptionalNonNegativeInteger(
          input.latest_chicken_count,
          "latest_chicken_count",
        )
      : currentOverrides.latest_chicken_count,
    public_price: hasOwnInputField(input, "public_price")
      ? parseOptionalNonNegativeNumber(input.public_price, "public_price")
      : currentOverrides.public_price,
  };

  return database.siteSetting.upsert({
    where: { key: HOMEPAGE_STAT_OVERRIDES_KEY },
    update: {
      value_json: nextOverrides,
    },
    create: {
      key: HOMEPAGE_STAT_OVERRIDES_KEY,
      value_json: nextOverrides,
    },
  });
}

async function getRequiredSiteSettingValue(
  key: string,
  database: SiteSettingsDb,
): Promise<unknown> {
  const setting = await database.siteSetting.findUnique({
    where: { key },
    select: { value_json: true },
  });

  if (!setting) {
    throw new SiteSettingValidationError(`${key} site setting is missing.`);
  }

  return setting.value_json;
}

function parseSiteSettingDecimal(
  value: unknown,
  key: string,
): Prisma.Decimal {
  if (value instanceof Prisma.Decimal) {
    return value;
  }

  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return new Prisma.Decimal(value);
  }

  if (typeof value === "string" && /^\d+(\.\d+)?$/.test(value.trim())) {
    return new Prisma.Decimal(value.trim());
  }

  throw new SiteSettingValidationError(
    `${key} must contain a non-negative numeric value.`,
  );
}

function parseSiteSettingNonNegativeInteger(value: unknown, key: string): number {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) {
    return value;
  }

  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    return Number.parseInt(value.trim(), 10);
  }

  throw new SiteSettingValidationError(
    `${key} must contain a non-negative whole number.`,
  );
}

function parseSiteSettingBoolean(value: unknown, key: string): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalizedValue = value.trim().toLowerCase();

    if (["true", "1", "on", "yes"].includes(normalizedValue)) {
      return true;
    }

    if (["false", "0", "off", "no"].includes(normalizedValue)) {
      return false;
    }
  }

  throw new SiteSettingValidationError(`${key} must contain a boolean value.`);
}

function parseHomepageStatOverridesSetting(value: unknown): HomepageStatOverrides {
  if (!isPlainObject(value)) {
    throw new SiteSettingValidationError(
      `${HOMEPAGE_STAT_OVERRIDES_KEY} must contain an object value.`,
    );
  }

  const todayEggsCollectedForSale = parseStoredOptionalNonNegativeInteger(
    value.today_eggs_collected_for_sale,
    "today_eggs_collected_for_sale",
  );
  const yesterdayEggsCollectedForSale = parseStoredOptionalNonNegativeInteger(
    value.yesterday_eggs_collected_for_sale,
    "yesterday_eggs_collected_for_sale",
  );
  const latestChickenCount = parseStoredOptionalNonNegativeInteger(
    value.latest_chicken_count,
    "latest_chicken_count",
  );
  const publicPrice = parseStoredOptionalNonNegativeNumber(
    value.public_price,
    "public_price",
  );
  const hasLegacyCountOverride =
    todayEggsCollectedForSale !== null ||
    yesterdayEggsCollectedForSale !== null ||
    latestChickenCount !== null;

  return {
    manual_counts_enabled:
      value.manual_counts_enabled === undefined
        ? hasLegacyCountOverride
        : parseStoredBoolean(value.manual_counts_enabled, "manual_counts_enabled"),
    manual_price_enabled:
      value.manual_price_enabled === undefined
        ? publicPrice !== null
        : parseStoredBoolean(value.manual_price_enabled, "manual_price_enabled"),
    today_eggs_collected_for_sale: todayEggsCollectedForSale,
    yesterday_eggs_collected_for_sale: yesterdayEggsCollectedForSale,
    latest_chicken_count: latestChickenCount,
    public_price: publicPrice,
  };
}

function parseOptionalNonNegativeInteger(
  value: unknown,
  key: keyof HomepageStatOverrides,
): number | null {
  if (value == null) {
    return null;
  }

  if (typeof value === "string") {
    const trimmedValue = value.trim();

    if (trimmedValue.length === 0) {
      return null;
    }

    if (/^\d+$/.test(trimmedValue)) {
      return Number.parseInt(trimmedValue, 10);
    }
  }

  if (typeof value === "number" && Number.isInteger(value) && value >= 0) {
    return value;
  }

  throw new SiteSettingValidationError(
    `${key} must contain a non-negative whole number.`,
  );
}

function parseStoredOptionalNonNegativeInteger(
  value: unknown,
  key: keyof HomepageStatOverrides,
): number | null {
  if (value == null) {
    return null;
  }

  if (typeof value === "number" && Number.isInteger(value) && value >= 0) {
    return value;
  }

  throw new SiteSettingValidationError(
    `${key} must contain a non-negative whole number.`,
  );
}

function parseOptionalNonNegativeNumber(
  value: unknown,
  key: keyof HomepageStatOverrides,
): number | null {
  if (value == null) {
    return null;
  }

  if (typeof value === "string") {
    const trimmedValue = value.trim();

    if (trimmedValue.length === 0) {
      return null;
    }

    if (/^\d+(\.\d+)?$/.test(trimmedValue)) {
      return Number.parseFloat(trimmedValue);
    }
  }

  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return value;
  }

  throw new SiteSettingValidationError(
    `${key} must contain a non-negative numeric value.`,
  );
}

function parseStoredOptionalNonNegativeNumber(
  value: unknown,
  key: keyof HomepageStatOverrides,
): number | null {
  if (value == null) {
    return null;
  }

  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return value;
  }

  throw new SiteSettingValidationError(
    `${key} must contain a non-negative numeric value.`,
  );
}

function parseStoredBoolean(
  value: unknown,
  key: keyof HomepageStatOverrides,
): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  throw new SiteSettingValidationError(`${key} must contain a boolean value.`);
}

function parseBooleanInput(value: unknown, key: string): boolean {
  if (value == null) {
    return false;
  }

  return parseSiteSettingBoolean(value, key);
}

function parseSiteSettingRequiredText(value: unknown, key: string): string {
  if (typeof value !== "string") {
    throw new SiteSettingValidationError(`${key} must contain a text value.`);
  }

  const trimmedValue = value.trim();

  if (trimmedValue.length === 0) {
    throw new SiteSettingValidationError(`${key} must contain a text value.`);
  }

  return trimmedValue;
}

function createEmptyHomepageStatOverrides(): HomepageStatOverrides {
  return {
    manual_counts_enabled: false,
    manual_price_enabled: false,
    today_eggs_collected_for_sale: null,
    yesterday_eggs_collected_for_sale: null,
    latest_chicken_count: null,
    public_price: null,
  };
}

function hasOwnInputField(
  input: HomepageStatOverridesInput,
  key: keyof HomepageStatOverrides,
): boolean {
  return Object.prototype.hasOwnProperty.call(input, key);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
