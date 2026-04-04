import { Prisma, PrismaClient } from "@prisma/client";
import { getDb } from "@/lib/db";

export class SiteSettingValidationError extends Error {}

type SiteSettingsDb = Pick<PrismaClient, "siteSetting">;

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
