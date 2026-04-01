const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function parseDateOnly(value: unknown, fieldName = "Date"): Date {
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return new Date(
      Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()),
    );
  }

  if (typeof value !== "string" || !DATE_ONLY_PATTERN.test(value.trim())) {
    throw new Error(`${fieldName} must be a valid YYYY-MM-DD date.`);
  }

  const [year, month, day] = value.trim().split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new Error(`${fieldName} must be a valid calendar date.`);
  }

  return parsed;
}

export function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addUtcDays(date: Date, days: number): Date {
  const nextDate = new Date(date.getTime());

  nextDate.setUTCDate(nextDate.getUTCDate() + days);

  return nextDate;
}

export function getDateOnlyInTimeZone(
  date: Date,
  timeZone: string,
): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    throw new Error(`Could not format date in time zone "${timeZone}".`);
  }

  return `${year}-${month}-${day}`;
}
