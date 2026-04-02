import { Prisma, PrismaClient } from "@prisma/client";
import { getDb } from "@/lib/db";

export class SiteSettingValidationError extends Error {}

type SiteSettingsDb = Pick<PrismaClient, "siteSetting">;

export async function getDefaultEggUnitPrice(
  database: SiteSettingsDb = getDb(),
): Promise<Prisma.Decimal> {
  const setting = await database.siteSetting.findUnique({
    where: { key: "default_egg_unit_price" },
    select: { value_json: true },
  });

  if (!setting) {
    throw new SiteSettingValidationError(
      "default_egg_unit_price site setting is missing.",
    );
  }

  return parseSiteSettingDecimal(
    setting.value_json,
    "default_egg_unit_price",
  );
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
