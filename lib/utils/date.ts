const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DATETIME_LOCAL_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

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

export function formatDateTimeLocalInTimeZone(
  date: Date,
  timeZone: string,
): string {
  const parts = getDateTimePartsInTimeZone(date, timeZone);

  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function parseDateTimeLocalInTimeZone(
  value: unknown,
  timeZone: string,
  fieldName = "Date/time",
): Date {
  if (typeof value !== "string") {
    throw new Error(`${fieldName} must be a valid local date/time.`);
  }

  const trimmedValue = value.trim();
  const match = DATETIME_LOCAL_PATTERN.exec(trimmedValue);

  if (!match) {
    throw new Error(`${fieldName} must be a valid local date/time.`);
  }

  const [, yearText, monthText, dayText, hourText, minuteText, secondText] =
    match;
  const year = Number.parseInt(yearText, 10);
  const month = Number.parseInt(monthText, 10);
  const day = Number.parseInt(dayText, 10);
  const hour = Number.parseInt(hourText, 10);
  const minute = Number.parseInt(minuteText, 10);
  const second = secondText ? Number.parseInt(secondText, 10) : 0;
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second);

  let candidate = new Date(utcGuess);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const offsetMilliseconds = getTimeZoneOffsetMilliseconds(candidate, timeZone);
    const adjusted = new Date(utcGuess - offsetMilliseconds);

    if (adjusted.getTime() === candidate.getTime()) {
      break;
    }

    candidate = adjusted;
  }

  if (
    formatDateTimeLocalInTimeZone(candidate, timeZone) !==
    `${yearText}-${monthText}-${dayText}T${hourText}:${minuteText}`
  ) {
    throw new Error(`${fieldName} must be a valid local date/time.`);
  }

  return candidate;
}

function getDateTimePartsInTimeZone(
  date: Date,
  timeZone: string,
): {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
  second: string;
} {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = formatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  const hour = parts.find((part) => part.type === "hour")?.value;
  const minute = parts.find((part) => part.type === "minute")?.value;
  const second = parts.find((part) => part.type === "second")?.value;

  if (!year || !month || !day || !hour || !minute || !second) {
    throw new Error(`Could not format date/time in time zone "${timeZone}".`);
  }

  return {
    year,
    month,
    day,
    hour,
    minute,
    second,
  };
}

function getTimeZoneOffsetMilliseconds(date: Date, timeZone: string): number {
  const parts = getDateTimePartsInTimeZone(date, timeZone);
  const asUtc = Date.UTC(
    Number.parseInt(parts.year, 10),
    Number.parseInt(parts.month, 10) - 1,
    Number.parseInt(parts.day, 10),
    Number.parseInt(parts.hour, 10),
    Number.parseInt(parts.minute, 10),
    Number.parseInt(parts.second, 10),
  );

  return asUtc - date.getTime();
}
