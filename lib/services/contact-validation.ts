import {
  customer_stage,
  notification_frequency,
  preference_unit,
  preferred_channel,
} from "@prisma/client";
import { enumValues } from "@/lib/utils/enum-values";
import { parseDateOnly } from "@/lib/utils/date";

export class ContactValidationError extends Error {}

export const CUSTOMER_STAGE_VALUES = enumValues(customer_stage);
export const PREFERRED_CHANNEL_VALUES = enumValues(preferred_channel);
export const PREFERENCE_UNIT_VALUES = enumValues(preference_unit);
export const NOTIFICATION_FREQUENCY_VALUES = enumValues(notification_frequency);

export function parseCustomerStage(value: unknown): customer_stage {
  return parseEnumValue(value, CUSTOMER_STAGE_VALUES, "Customer stage");
}

export function parsePreferredChannel(
  value: unknown,
): preferred_channel | null {
  return parseOptionalEnumValue(
    value,
    PREFERRED_CHANNEL_VALUES,
    "Preferred channel",
  );
}

export function parsePreferenceUnit(value: unknown): preference_unit | null {
  return parseOptionalEnumValue(
    value,
    PREFERENCE_UNIT_VALUES,
    "Preference unit",
  );
}

export function parseNotificationFrequency(
  value: unknown,
): notification_frequency | null {
  return parseOptionalEnumValue(
    value,
    NOTIFICATION_FREQUENCY_VALUES,
    "Notification frequency",
  );
}

export function parseRequiredText(value: unknown, fieldName: string): string {
  if (typeof value !== "string") {
    throw new ContactValidationError(`${fieldName} is required.`);
  }

  const trimmedValue = value.trim();

  if (trimmedValue.length === 0) {
    throw new ContactValidationError(`${fieldName} is required.`);
  }

  return trimmedValue;
}

export function parseOptionalText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();

  return trimmedValue.length > 0 ? trimmedValue : null;
}

export function parseBooleanLike(
  value: unknown,
  fieldName: string,
): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalizedValue = value.trim().toLowerCase();

    if (["true", "1", "on", "yes"].includes(normalizedValue)) {
      return true;
    }

    if (["false", "0", "off", "no", ""].includes(normalizedValue)) {
      return false;
    }
  }

  if (value == null) {
    return false;
  }

  throw new ContactValidationError(`${fieldName} must be a valid boolean value.`);
}

export function parseOptionalEmail(value: unknown): string | null {
  const email = parseOptionalText(value);

  if (!email) {
    return null;
  }

  const normalizedEmail = email.toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new ContactValidationError("Email must be a valid email address.");
  }

  return normalizedEmail;
}

export function parseOptionalPhone(value: unknown): string | null {
  const phone = parseOptionalText(value);

  if (!phone) {
    return null;
  }

  if (!/^[+\d\s().-]+$/.test(phone)) {
    throw new ContactValidationError("Phone must be a valid phone number.");
  }

  const digitCount = phone.replace(/\D/g, "").length;

  if (digitCount < 6) {
    throw new ContactValidationError("Phone must be a valid phone number.");
  }

  return phone;
}

export function parseOptionalPositiveInteger(
  value: unknown,
  fieldName: string,
): number | null {
  if (value == null) {
    return null;
  }

  if (typeof value === "string" && value.trim().length === 0) {
    return null;
  }

  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }

  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    const parsedValue = Number.parseInt(value.trim(), 10);

    if (parsedValue > 0) {
      return parsedValue;
    }
  }

  throw new ContactValidationError(
    `${fieldName} must be a positive whole number.`,
  );
}

export function parseOptionalDateOnly(
  value: unknown,
  fieldName: string,
): Date | null {
  if (value == null) {
    return null;
  }

  if (typeof value === "string" && value.trim().length === 0) {
    return null;
  }

  try {
    return parseDateOnly(value, fieldName);
  } catch (error) {
    if (error instanceof Error) {
      throw new ContactValidationError(error.message);
    }

    throw error;
  }
}

function parseEnumValue<TValue extends string>(
  value: unknown,
  allowedValues: readonly TValue[],
  fieldName: string,
): TValue {
  if (typeof value !== "string") {
    throw new ContactValidationError(`${fieldName} is required.`);
  }

  const trimmedValue = value.trim();

  if (!allowedValues.includes(trimmedValue as TValue)) {
    throw new ContactValidationError(`${fieldName} is invalid.`);
  }

  return trimmedValue as TValue;
}

function parseOptionalEnumValue<TValue extends string>(
  value: unknown,
  allowedValues: readonly TValue[],
  fieldName: string,
): TValue | null {
  if (value == null) {
    return null;
  }

  if (typeof value === "string" && value.trim().length === 0) {
    return null;
  }

  return parseEnumValue(value, allowedValues, fieldName);
}
